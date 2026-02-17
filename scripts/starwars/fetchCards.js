import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.swu-db.com/cards/';
const DATA_DIR = path.resolve(__dirname, '../../data/starwars');
const IMAGE_DIR = path.resolve(__dirname, '../../public/assets/images/starwars/cards');

const SET_CODES = ['SOR', 'SHD', 'TWI', 'LOF', 'SEC', 'JTL', 'IBH', 'LAW'];

function sanitizeFilename(s) {
    return (s || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9._-]/g, '') || 'unnamed';
}

function normalizeKey(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function downloadImage(url, filePath) {
    try {
        const response = await fetch(url, { timeout: 20000 });
        if (!response.ok) {
            console.log(`  Failed to download ${url}: ${response.status}`);
            return false;
        }
        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);
        return true;
    } catch (e) {
        console.log(`  Failed to download ${url}: ${e.message}`);
        return false;
    }
}

async function fetchSet(setCode) {
    const response = await fetch(API_URL + setCode);
    if (!response.ok) {
        console.error(`Failed to fetch ${setCode}: ${response.status}`);
        return;
    }
    const { data: cards } = await response.json();

    const setImageDir = path.join(IMAGE_DIR, setCode);
    fs.mkdirSync(setImageDir, { recursive: true });

    const cardMap = {};
    const seen = new Set();

    for (const card of cards) {
        const rawName = card.Name || '';
        const subtitle = card.Subtitle || '';
        const cardType = card.Type || '';

        // Bases: use rawName only (no subtitle/trait)
        // All other cards: combine Name + Subtitle
        const displayName = cardType === 'Base'
            ? rawName
            : rawName + (subtitle ? ', ' + subtitle : '');

        if (seen.has(displayName)) continue;
        seen.add(displayName);

        const aspects = card.Aspects || [];
        const hp = cardType === 'Base' ? (card.HP || null) : null;
        const frontArt = card.FrontArt || '';
        const backArt = card.BackArt || '';

        // Image filename always includes subtitle for uniqueness
        let baseName = sanitizeFilename(rawName);
        if (subtitle) baseName += ', ' + sanitizeFilename(subtitle);
        const imageFilename = baseName + '.png';
        const imagePath = path.join(setImageDir, imageFilename);

        if (frontArt) {
            await downloadImage(frontArt, imagePath);
        }

        const key = normalizeKey(displayName);
        cardMap[key] = {
            image: setCode + '/' + imageFilename,
            name: displayName,
            type: cardType,
            hp: hp,
            aspects: aspects
        };

        // Handle back art (leaders)
        if (backArt) {
            const backFilename = baseName + '_back.png';
            const backPath = path.join(setImageDir, backFilename);
            await downloadImage(backArt, backPath);

            const backKey = normalizeKey(displayName + 'back');
            cardMap[backKey] = {
                image: setCode + '/' + backFilename,
                name: displayName + ' [Back]',
                type: cardType,
                hp: hp,
                aspects: aspects
            };
        }
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });
    const outputPath = path.join(DATA_DIR, setCode + '.json');
    fs.writeFileSync(outputPath, JSON.stringify(cardMap, null, 2));
    console.log(`Saved ${Object.keys(cardMap).length} unique cards to ${outputPath}`);
}

async function main() {
    const setArg = process.argv[2];
    const sets = setArg ? [setArg.toUpperCase()] : SET_CODES;

    for (const setCode of sets) {
        console.log(`Fetching ${setCode}...`);
        await fetchSet(setCode);
    }
    console.log('Done!');
}

main();
