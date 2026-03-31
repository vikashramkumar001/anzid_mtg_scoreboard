// fetchCardsRiot.js - Scrape card data from Riot's official Riftbound card gallery
// Usage: node scripts/riftbound/fetchCardsRiot.js
//
// Downloads ALL card images (including alternate art variants) locally.
// The JSON uses the standard art as imageUrl; all variants are listed in the variants array.

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GALLERY_URL = 'https://riftbound.leagueoflegends.com/en-us/card-gallery/';
const CARDS_DIR = path.join(__dirname, '../../public/assets/images/riftbound/cards');
const OUTPUT_JSON = path.join(__dirname, '../../data/riftbound/riftboundCardNames.json');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchUrl(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
            file.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
        }).on('error', reject);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Get card code from publicCode (e.g. "OGN-066a/298" → "OGN-066a")
function getCardCode(publicCode) {
    return publicCode.split('/')[0];
}

// Check if a card code is standard art (no suffix letter or star)
function isStandardArt(cardCode) {
    // Standard: OGN-066, SFD-001, UNL-131
    // Alternate: OGN-066a, SFD-227*
    return /^[A-Z]+-\d+$/.test(cardCode);
}

function mapCardType(cardTypeObj) {
    if (!cardTypeObj?.type?.length) return 'Unknown';
    return cardTypeObj.type[0]?.label || 'Unknown';
}

function extractPlainText(richText) {
    if (!richText?.body || !Array.isArray(richText.body)) return '';
    return richText.body
        .filter(b => b.children)
        .map(b => b.children.map(c => c.text || '').join(''))
        .join(' ')
        .trim();
}

async function main() {
    console.log('Fetching card gallery page...');
    const html = (await fetchUrl(GALLERY_URL)).toString('utf8');

    // Extract __NEXT_DATA__ JSON
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
        console.error('Could not find __NEXT_DATA__ in page');
        process.exit(1);
    }

    const nextData = JSON.parse(match[1]);

    // Find cards array in nested structure
    let cards = null;
    function findCards(obj) {
        if (cards) return;
        if (Array.isArray(obj)) {
            if (obj.length > 0 && obj[0]?.name && obj[0]?.cardImage) { cards = obj; return; }
            obj.forEach(findCards);
        } else if (obj && typeof obj === 'object') {
            if (obj.items && Array.isArray(obj.items) && obj.items[0]?.name) { cards = obj.items; return; }
            Object.values(obj).forEach(findCards);
        }
    }
    findCards(nextData);

    if (!cards || cards.length === 0) {
        console.error('Could not find cards data in __NEXT_DATA__');
        process.exit(1);
    }

    console.log(`Found ${cards.length} card entries (including variants)`);

    fs.mkdirSync(CARDS_DIR, { recursive: true });

    // Group cards by name to identify variants
    const cardsByName = new Map();
    for (const card of cards) {
        if (!card.name || !card.cardImage?.url) continue;
        if (!cardsByName.has(card.name)) cardsByName.set(card.name, []);
        cardsByName.get(card.name).push(card);
    }

    console.log(`Unique card names: ${cardsByName.size}`);

    let downloaded = 0;
    let skipped = 0;
    let errors = 0;
    const cardMap = {};

    for (const [name, variants] of cardsByName) {
        // Sort variants: standard art first (no suffix), then by lower collector number
        // (overnumber/showcase cards have higher numbers)
        variants.sort((a, b) => {
            const aCode = getCardCode(a.publicCode || '');
            const bCode = getCardCode(b.publicCode || '');
            const aStd = isStandardArt(aCode) ? 0 : 1;
            const bStd = isStandardArt(bCode) ? 0 : 1;
            if (aStd !== bStd) return aStd - bStd;
            const aNum = parseInt(aCode.replace(/^[A-Z]+-/, ''), 10) || 0;
            const bNum = parseInt(bCode.replace(/^[A-Z]+-/, ''), 10) || 0;
            return aNum - bNum;
        });

        const variantEntries = [];

        // Download all variant images
        for (const card of variants) {
            const cardCode = getCardCode(card.publicCode || card.id || '');
            const imageUrl = card.cardImage.url;
            const ext = path.extname(new URL(imageUrl).pathname) || '.png';
            // Sanitize filename: replace * with _ for Windows compatibility
            const safeCode = cardCode.replace(/\*/g, '_');
            const localFilename = `${safeCode}${ext}`;
            const localPath = path.join(CARDS_DIR, localFilename);
            const localUrl = `/assets/images/riftbound/cards/${localFilename}`;

            if (!fs.existsSync(localPath)) {
                try {
                    await downloadFile(imageUrl, localPath);
                    downloaded++;
                    const label = isStandardArt(cardCode) ? '' : ' [alt]';
                    console.log(`  Downloaded: ${localFilename}${label} (${name})`);
                    await sleep(50);
                } catch (err) {
                    errors++;
                    console.error(`  FAILED: ${localFilename} (${name}) - ${err.message}`);
                    continue;
                }
            } else {
                skipped++;
            }

            variantEntries.push({
                code: cardCode,
                imageUrl: localUrl,
                standard: isStandardArt(cardCode)
            });
        }

        if (variantEntries.length === 0) continue;

        // Use first card (standard art, sorted first) for metadata
        const primaryCard = variants[0];
        const primaryVariant = variantEntries[0];

        const entry = {
            imageUrl: primaryVariant.imageUrl,
            type: mapCardType(primaryCard.cardType)
        };

        // Add rich metadata
        const cardCode = getCardCode(primaryCard.publicCode || '');
        if (primaryCard.id) entry.id = primaryCard.id;
        if (cardCode) entry.publicCode = cardCode;
        if (primaryCard.set?.value?.label) entry.set = primaryCard.set.value.label;
        if (primaryCard.set?.value?.id) entry.setCode = primaryCard.set.value.id;
        if (primaryCard.domain?.values?.length) {
            entry.domain = primaryCard.domain.values.map(d => d.label);
        }
        if (primaryCard.rarity?.value?.label) entry.rarity = primaryCard.rarity.value.label;
        if (primaryCard.energy?.value?.label) entry.energy = primaryCard.energy.value.label;
        if (primaryCard.might?.value?.label) entry.might = primaryCard.might.value.label;
        if (primaryCard.tags?.tags?.length) {
            entry.tags = primaryCard.tags.tags.map(t => t.label || t);
        }
        const text = extractPlainText(primaryCard.text?.richText);
        if (text) entry.text = text;
        if (primaryCard.illustrator?.values?.length) {
            entry.illustrator = primaryCard.illustrator.values.map(v => v.label || v).join(', ');
        }
        if (primaryCard.collectorNumber != null) entry.collectorNumber = primaryCard.collectorNumber;

        // Add variants array if there are alternates
        if (variantEntries.length > 1) {
            entry.variants = variantEntries.map(v => ({
                code: v.code,
                imageUrl: v.imageUrl,
                standard: v.standard
            }));
        }

        // Legend cards: prepend champion tag to name (e.g., "Deceiver" → "LeBlanc, Deceiver")
        const cardType = mapCardType(primaryCard.cardType);
        if (cardType === 'Legend' && primaryCard.tags?.tags?.length) {
            const championTag = primaryCard.tags.tags[0]?.label || primaryCard.tags.tags[0];
            if (championTag) {
                const fullName = `${championTag}, ${name}`;
                cardMap[fullName] = entry;
            } else {
                cardMap[name] = entry;
            }
        } else {
            cardMap[name] = entry;
        }
    }

    // Post-processing corrections for known Riot data issues
    const NAME_CORRECTIONS = {
        'Yi, Honed': 'Master Yi, Honed',
        'Yi, Meditative': 'Master Yi, Meditative',
    };
    const TAG_CORRECTIONS = {
        'Karma, Channeler': { from: 'Vi', to: 'Karma' },
    };

    for (const [oldName, newName] of Object.entries(NAME_CORRECTIONS)) {
        if (cardMap[oldName]) {
            cardMap[newName] = cardMap[oldName];
            delete cardMap[oldName];
            console.log(`  [fix] Renamed "${oldName}" → "${newName}"`);
        }
    }
    for (const [cardName, fix] of Object.entries(TAG_CORRECTIONS)) {
        if (cardMap[cardName]?.tags) {
            const idx = cardMap[cardName].tags.indexOf(fix.from);
            if (idx !== -1) {
                cardMap[cardName].tags[idx] = fix.to;
                console.log(`  [fix] ${cardName}: tag "${fix.from}" → "${fix.to}"`);
            }
        }
    }

    // Write JSON
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cardMap, null, 2));

    console.log(`\nDone!`);
    console.log(`  Unique cards: ${Object.keys(cardMap).length}`);
    console.log(`  Images downloaded: ${downloaded}`);
    console.log(`  Images skipped (already exists): ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Output: ${OUTPUT_JSON}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
