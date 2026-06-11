#!/usr/bin/env node
/**
 * Bulk-fetch standings for every round of a Carde.io event.
 *
 * For event 502327 by default — pass a different event ID as the first arg
 * to override (`node scripts/fetch-all-cardeio-standings.mjs 12345`).
 *
 * Hits the same paginated v2 standings endpoint that master-control uses
 * (see `fetchCardeioStandings` in features/tournament-platforms.js — the
 * standings-api-round-{N}.json producer). Saves the RAW paginated response
 * for each round so the file format matches what's already on disk
 * (data/cardeio/standings-api-round-8.json was produced by the same code
 * path).
 *
 * Reads CARDEIO_TOKEN from .env. The session cookie is NOT needed for this
 * endpoint — only the API token. If CARDEIO_TOKEN is expired you'll see
 * 401 responses; renew it via the operator's Carde admin portal and rerun.
 *
 * Usage:
 *   node scripts/fetch-all-cardeio-standings.mjs           # event 502327
 *   node scripts/fetch-all-cardeio-standings.mjs 502327    # explicit
 *   node scripts/fetch-all-cardeio-standings.mjs 502327 750   # gap ms
 */
import 'dotenv/config';
import axios from 'axios';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Output dir override — set OUTPUT_DIR to archive a different event without
// stomping on the active flat files. e.g.
//   OUTPUT_DIR=data/cardeio/events/501773 node scripts/fetch-all-cardeio-standings.mjs 501773
// Defaults to data/cardeio/ (the working set master-control loads).
// Resolved relative to the project root, NOT cwd, so the same command
// works regardless of where it's invoked from.
const PROJECT_ROOT = path.join(__dirname, '..');
const CARDEIO_DIR = process.env.OUTPUT_DIR
    ? path.resolve(PROJECT_ROOT, process.env.OUTPUT_DIR)
    : path.join(PROJECT_ROOT, 'data', 'cardeio');

const eventId = process.argv[2] || '502327';
const interRoundDelayMs = Number(process.argv[3] || 500);

const token = process.env.CARDEIO_TOKEN;
if (!token) {
    console.error('CARDEIO_TOKEN not set in .env');
    process.exit(1);
}

// Browser-like headers + Token auth — matches features/tournament-platforms.js.
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Authorization': `Token ${token}`,
    'Origin': 'https://admin.carde.io',
    'Referer': 'https://admin.carde.io/'
};

// Spicerack-style page walker. Identical contract to the one in
// features/tournament-platforms.js (fetchAllSpicerackPages) — duplicated
// here so this script has no internal dependencies on that module's
// private exports / module-level state.
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

    // Build round map (roundNumber → cardeRoundId) — flatten across phases.
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

    // Ensure output dir exists.
    await fsPromises.mkdir(CARDEIO_DIR, { recursive: true });

    // Walk rounds sequentially with a small gap between each so we don't
    // hammer the Carde API.
    const summary = [];
    for (const n of roundNumbers) {
        const cardeRoundId = roundMap[n];
        const standingsUrl = `https://api.admin.carde.io/api/v2/organize/tournament-rounds/${cardeRoundId}/standings/`;
        process.stdout.write(`[Carde] Round ${n} (${cardeRoundId})… `);
        try {
            const rows = await fetchAllPages(standingsUrl);
            const filePath = path.join(CARDEIO_DIR, `standings-api-event-${eventId}-round-${n}.json`);
            await fsPromises.writeFile(filePath, JSON.stringify(rows, null, 2));
            console.log(`${rows.length} entries → ${path.relative(process.cwd(), filePath)}`);
            summary.push({ round: n, count: rows.length, ok: true });
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

    // Summary
    const ok = summary.filter(s => s.ok);
    const fail = summary.filter(s => !s.ok);
    const empty = ok.filter(s => s.count === 0);
    console.log('\n=== Summary ===');
    console.log(`  Saved: ${ok.length}/${summary.length} rounds`);
    if (empty.length) console.log(`  Empty (no standings yet): rounds ${empty.map(s => s.round).join(', ')}`);
    if (fail.length) {
        console.log(`  Failed: rounds ${fail.map(s => s.round).join(', ')}`);
        for (const f of fail) console.log(`    - Round ${f.round}: ${f.error}`);
    }
}

main().catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
});
