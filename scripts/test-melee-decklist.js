#!/usr/bin/env node
/**
 * Quick test: fetch a single decklist from Melee.gg API to inspect its structure.
 * Usage: node scripts/test-melee-decklist.js
 */
import 'dotenv/config';

const DECKLIST_ID = '6db7f2a2-11e2-4017-9233-b3d500f97c8d';
const TOURNAMENT_ID = '390210';

const clientId = process.env.MELEE_CLIENT_ID;
const clientSecret = process.env.MELEE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.error('Missing MELEE_CLIENT_ID or MELEE_CLIENT_SECRET in .env');
    process.exit(1);
}

const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Accept': 'application/json',
    'Authorization': `Basic ${basicAuth}`
};

async function tryFetch(label, url) {
    console.log(`\n--- ${label} ---`);
    console.log(`GET ${url}`);
    try {
        const res = await fetch(url, { headers });
        console.log(`Status: ${res.status}`);
        if (!res.ok) {
            const text = await res.text();
            console.log('Error body:', text.substring(0, 500));
            return null;
        }
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2).substring(0, 5000));
        return data;
    } catch (e) {
        console.log('Fetch error:', e.message);
        return null;
    }
}

(async () => {
    // Try fetching the single decklist by ID
    await tryFetch('Single decklist by ID', `https://melee.gg/api/decklist/${DECKLIST_ID}`);

    // Try the list endpoint for the tournament (first page, small size to see structure)
    const listData = await tryFetch('Tournament decklists (first 2)', `https://melee.gg/api/decklist/list/${TOURNAMENT_ID}?pageSize=2`);

    // If the list worked, show detailed structure of first entry
    if (listData) {
        const arr = listData.Content || listData;
        if (Array.isArray(arr) && arr.length > 0) {
            console.log('\n--- First decklist full structure ---');
            console.log(JSON.stringify(arr[0], null, 2));
        }
    }
})();
