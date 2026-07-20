// fetchUnleashedPrices.js - Scrape TCGPlayer market prices for Riftbound: Unleashed
// Usage: node scripts/riftbound/fetchUnleashedPrices.js
//
// Pulls products + prices from TCGCSV (free public mirror of TCGPlayer's data API),
// joins them by productId, and writes JSON + CSV with Normal + Foil prices per card.

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_ID = 89;     // Riftbound: League of Legends Trading Card Game
const GROUP_ID = 24560;     // Unleashed (Set 3, released 2026-05-08)
const BASE = 'https://tcgcsv.com/tcgplayer';

const OUTPUT_JSON = path.join(__dirname, '../../data/riftbound/unleashedPrices.json');
const OUTPUT_CSV = path.join(__dirname, '../../data/riftbound/unleashedPrices.csv');

const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Showcase'];
const VARIANT_TREATMENTS = ['Overnumbered', 'Signature', 'Alternate Art', 'Ultimate'];
const USER_AGENT = 'anzid-mtg-scoreboard/1.0 (anzidmtg@gmail.com)';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchJson(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                } catch (err) {
                    reject(err);
                }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

function getExtended(product, name) {
    const entry = (product.extendedData || []).find(e => e.name === name);
    return entry ? entry.value : null;
}

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

async function main() {
    const productsUrl = `${BASE}/${CATEGORY_ID}/${GROUP_ID}/products`;
    const pricesUrl = `${BASE}/${CATEGORY_ID}/${GROUP_ID}/prices`;

    console.log(`Fetching products: ${productsUrl}`);
    console.log(`Fetching prices:   ${pricesUrl}`);

    const [productsRes, pricesRes] = await Promise.all([
        fetchJson(productsUrl),
        fetchJson(pricesUrl),
    ]);

    const products = productsRes.results || [];
    const prices = pricesRes.results || [];
    console.log(`Got ${products.length} products, ${prices.length} price entries`);

    const priceMap = new Map();
    for (const p of prices) {
        if (!priceMap.has(p.productId)) priceMap.set(p.productId, {});
        const bucket = priceMap.get(p.productId);
        const finish = p.subTypeName === 'Foil' ? 'foil' : 'normal';
        bucket[finish] = p;
    }

    const rows = [];
    for (const product of products) {
        const tcgRarity = getExtended(product, 'Rarity');
        if (!tcgRarity) continue;

        // TCGPlayer's data tags variant treatments inconsistently — most are 'Showcase'
        // but a few slip through with the underlying card's rarity (e.g. Rengar Pridestalker
        // Overnumbered/Signature in Unleashed). Normalize by detecting the suffix in the name.
        const treatmentMatch = product.name.match(/\(([^)]+)\)/);
        const treatment = treatmentMatch && VARIANT_TREATMENTS.includes(treatmentMatch[1])
            ? treatmentMatch[1]
            : 'Base';
        const rarity = treatment === 'Base' ? tcgRarity : 'Showcase';

        const cardNumber = getExtended(product, 'Number');
        const priceData = priceMap.get(product.productId) || {};
        const normal = priceData.normal || {};
        const foil = priceData.foil || {};

        rows.push({
            productId: product.productId,
            cardNumber,
            name: product.name,
            rarity,
            treatment,
            tcgRarity,
            normalMarket: normal.marketPrice ?? null,
            normalLow: normal.lowPrice ?? null,
            normalMid: normal.midPrice ?? null,
            normalHigh: normal.highPrice ?? null,
            foilMarket: foil.marketPrice ?? null,
            foilLow: foil.lowPrice ?? null,
            foilMid: foil.midPrice ?? null,
            foilHigh: foil.highPrice ?? null,
            tcgplayerUrl: product.url,
            imageUrl: product.imageUrl,
        });
    }

    rows.sort((a, b) => {
        const ra = RARITY_ORDER.indexOf(a.rarity);
        const rb = RARITY_ORDER.indexOf(b.rarity);
        if (ra !== rb) return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
        return String(a.cardNumber || '').localeCompare(String(b.cardNumber || ''), undefined, { numeric: true });
    });

    fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(rows, null, 2));

    const headers = [
        'productId', 'cardNumber', 'name', 'rarity', 'treatment', 'tcgRarity',
        'normalMarket', 'normalLow', 'normalMid', 'normalHigh',
        'foilMarket', 'foilLow', 'foilMid', 'foilHigh',
        'tcgplayerUrl', 'imageUrl',
    ];
    const csvLines = [headers.join(',')];
    for (const row of rows) {
        csvLines.push(headers.map(h => csvEscape(row[h])).join(','));
    }
    fs.writeFileSync(OUTPUT_CSV, csvLines.join('\n') + '\n');

    const counts = {};
    for (const row of rows) counts[row.rarity] = (counts[row.rarity] || 0) + 1;

    console.log(`\nWrote ${rows.length} cards to:`);
    console.log(`  ${OUTPUT_JSON}`);
    console.log(`  ${OUTPUT_CSV}`);
    console.log('\nBy rarity:');
    for (const r of RARITY_ORDER) {
        if (counts[r]) console.log(`  ${r.padEnd(10)} ${counts[r]}`);
    }
    for (const r of Object.keys(counts)) {
        if (!RARITY_ORDER.includes(r)) console.log(`  ${r.padEnd(10)} ${counts[r]}`);
    }

    const top = rows
        .filter(r => r.foilMarket !== null || r.normalMarket !== null)
        .map(r => ({ ...r, _peak: Math.max(r.foilMarket ?? 0, r.normalMarket ?? 0) }))
        .sort((a, b) => b._peak - a._peak)
        .slice(0, 5);
    console.log('\nTop 5 by peak market price:');
    for (const r of top) {
        console.log(`  $${r._peak.toFixed(2).padStart(7)}  ${r.rarity.padEnd(10)} ${r.cardNumber || '?'} ${r.name}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
