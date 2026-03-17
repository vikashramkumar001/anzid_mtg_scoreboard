#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const cardDataDir = 'data/starwars';

function normalizeKey(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Load card data (same as features/starwars/cards.js)
const cardListData = {};
const files = await fs.readdir(cardDataDir);
for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const setCode = path.basename(file, '.json').toUpperCase();
    const raw = await fs.readFile(path.join(cardDataDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    cardListData[setCode] = {};
    for (const key in parsed) {
        const entry = parsed[key] || {};
        const normalized = normalizeKey(entry.name || key);
        cardListData[setCode][normalized] = {
            name: entry.name || key,
            image: entry.image || ''
        };
    }
}

// Test lookups
const testCards = [
    'Sudden Ferocity',
    'Superlaser Blast',
    'Nightsister Warrior',
    'Darth Vader, Twilight of the Apprentice',
    'Han Solo, Worth the Risk',
    'Supreme Leader Snoke, Shadow Ruler',
    'Shadowed Undercity'
];

for (const name of testCards) {
    const k = normalizeKey(name);
    let found = false;
    for (const s of Object.keys(cardListData)) {
        if (cardListData[s][k]) {
            console.log(`OK   ${name} -> ${k} -> ${s}: ${cardListData[s][k].image}`);
            found = true;
            break;
        }
    }
    if (!found) {
        console.log(`MISS ${name} -> ${k}`);
    }
}
