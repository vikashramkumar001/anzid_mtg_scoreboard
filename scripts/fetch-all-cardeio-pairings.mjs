#!/usr/bin/env node
/**
 * Bulk-fetch pairings (matches-list) for every round of a Carde.io event.
 *
 * Sibling to `scripts/fetch-all-cardeio-standings.mjs` — same auth, same
 * paginator, same per-round JSON-on-disk cache — just hits the v2
 * matches-list endpoint instead of standings.
 *
 * For event 502327 by default — pass a different event ID as the first
 * arg to override (`node scripts/fetch-all-cardeio-pairings.mjs 12345`).
 *
 * Reads CARDEIO_TOKEN from .env. Auth is Token-only (no cookie session
 * needed). Confirmed against anu-api's generated SDK at
 * `~/Desktop/dev/anu-api/src/client/sdk.gen.ts:16306`.
 *
 * Usage:
 *   node scripts/fetch-all-cardeio-pairings.mjs              # event 502327
 *   node scripts/fetch-all-cardeio-pairings.mjs 502327       # explicit
 *   node scripts/fetch-all-cardeio-pairings.mjs 502327 750   # gap ms
 */
import 'dotenv/config';
import axios from 'axios';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARDEIO_DIR = path.join(__dirname, '../data/cardeio');

const eventId = process.argv[2] || '502327';
const interRoundDelayMs = Number(process.argv[3] || 500);

const token = process.env.CARDEIO_TOKEN;
if (!token) {
    console.error('CARDEIO_TOKEN not set in .env');
    process.exit(1);
}

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Authorization': `Token ${token}`,
    'Origin': 'https://admin.carde.io',
    'Referer': 'https://admin.carde.io/'
};

async function fetchAllPages(url) {
    const pageSize = 200;
    let currentPage = 1;
    let all = [];
    for (;;) {
        const sep = url.includes('?') ? '&' : '?';
        const pageUrl = `${url}${sep}page=${currentPage}&page_size=${pageSize}`;
        const res = await axios.get(pageUrl, { headers: HEADERS });
        const data = res.data;
        all = all.concat(data.results || []);
        if (data.next == null && data.next_page_number == null) break;
        currentPage++;
    }
    return all;
}

async function main() {
    console.log(`[Carde] Fetching event detail for ${eventId}…`);
    const eventUrl = `https://api.admin.carde.io/api/v2/organize/events/${eventId}/detail/`;
    let eventDetail;
    try {
        eventDetail = await axios.get(eventUrl, { headers: HEADERS });
    } catch (e) {
        const status = e.response?.status;
        const msg = status === 401
            ? 'Auth failed — CARDEIO_TOKEN may be expired. Update .env and rerun.'
            : (e.response?.data?.detail || e.message);
        console.error(`[Carde] Event detail failed: ${msg}`);
        process.exit(1);
    }

    const roundMap = {};
    const phases = eventDetail.data?.tournament_phases || [];
    for (const phase of phases) {
        for (const round of (phase.rounds || [])) {
            if (round.round_number && round.id) {
                roundMap[round.round_number] = round.id;
            }
        }
    }
    const roundNumbers = Object.keys(roundMap).map(Number).sort((a, b) => a - b);
    if (roundNumbers.length === 0) {
        console.error('[Carde] No rounds found in event detail. Wrong event ID?');
        process.exit(1);
    }
    console.log(`[Carde] Found ${roundNumbers.length} rounds: ${roundNumbers.join(', ')}`);

    await fsPromises.mkdir(CARDEIO_DIR, { recursive: true });

    const summary = [];
    for (const n of roundNumbers) {
        const cardeRoundId = roundMap[n];
        const pairingsUrl = `https://api.admin.carde.io/api/v2/organize/tournament-rounds/${cardeRoundId}/matches-list/`;
        process.stdout.write(`[Carde] Round ${n} (${cardeRoundId})… `);
        try {
            const matches = await fetchAllPages(pairingsUrl);
            const filePath = path.join(CARDEIO_DIR, `pairings-api-event-${eventId}-round-${n}.json`);
            await fsPromises.writeFile(filePath, JSON.stringify(matches, null, 2));
            console.log(`${matches.length} matches → ${path.relative(process.cwd(), filePath)}`);
            summary.push({ round: n, count: matches.length, ok: true });
        } catch (e) {
            const status = e.response?.status;
            const msg = status === 401
                ? 'Auth failed (401)'
                : (e.response?.data?.detail || e.message);
            console.log(`FAIL — ${msg}`);
            summary.push({ round: n, count: 0, ok: false, error: msg });
        }
        if (interRoundDelayMs > 0 && n !== roundNumbers[roundNumbers.length - 1]) {
            await new Promise(r => setTimeout(r, interRoundDelayMs));
        }
    }

    const ok = summary.filter(s => s.ok);
    const fail = summary.filter(s => !s.ok);
    const empty = ok.filter(s => s.count === 0);
    console.log('\n=== Summary ===');
    console.log(`  Saved: ${ok.length}/${summary.length} rounds`);
    if (empty.length) console.log(`  Empty (no matches yet): rounds ${empty.map(s => s.round).join(', ')}`);
    if (fail.length) {
        console.log(`  Failed: rounds ${fail.map(s => s.round).join(', ')}`);
        for (const f of fail) console.log(`    - Round ${f.round}: ${f.error}`);
    }
}

main().catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
});
