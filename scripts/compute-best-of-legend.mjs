#!/usr/bin/env node
/**
 * Compute "Best of Legend" awards for a Carde event — the highest-finishing
 * player piloting each Legend. Reads the cached decklists (for the legend
 * each player played) and the highest-numbered standings-api-round-{N}.json
 * (for the final rank + record per player), then joins by user.id and
 * groups by legend.
 *
 * Usage:
 *   node scripts/compute-best-of-legend.mjs                       # event 502327, working dir
 *   node scripts/compute-best-of-legend.mjs 502327
 *   node scripts/compute-best-of-legend.mjs 501773 data/cardeio/events/501773
 *
 * Args:
 *   1. eventId            — defaults to 502327
 *   2. standings dir      — defaults to data/cardeio (i.e. the active
 *                            working set). For archived events use the
 *                            event-scoped subdir, e.g.
 *                            data/cardeio/events/501773
 *
 * Output: a table of "Legend → best player → rank / record / etc.", sorted
 * by rank ascending. Also prints summary counts (legends played, players
 * matched, players-without-decklists).
 */
import 'dotenv/config';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

const eventId = process.argv[2] || '502327';
const standingsDirArg = process.argv[3] || 'data/cardeio';
const STANDINGS_DIR = path.resolve(PROJECT_ROOT, standingsDirArg);
const DECKLIST_PATH = path.join(PROJECT_ROOT, 'data', 'cardeio', 'cache', `event-${eventId}-decklists.json`);

async function main() {
    // Decklists: build Map<userId, { legend, deckName }>
    let decklistData;
    try {
        decklistData = JSON.parse(await fs.readFile(DECKLIST_PATH, 'utf8'));
    } catch (e) {
        console.error(`Failed to read decklists at ${DECKLIST_PATH}: ${e.message}`);
        process.exit(1);
    }
    const decklists = Array.isArray(decklistData) ? decklistData : (decklistData?.decklists || []);
    const playerLegend = new Map();
    for (const dl of decklists) {
        const userId = dl?.user?.id;
        if (userId == null) continue;
        const aux = dl.auxiliary_sections || [];
        const legendSection = aux.find(s => s?.type_code === 'legend');
        const legend = legendSection?.cards?.[0]?.name || '';
        playerLegend.set(Number(userId), { legend, deckName: dl.deck_name || '' });
    }

    // Standings: pick the LAST round file in the dir — that's where the
    // final ranks live. Round 1's file would have a `rank` too, but it's
    // the rank after only round 1 (not the final). The highest-numbered
    // file is always the post-final-round snapshot.
    let entries;
    try {
        entries = await fs.readdir(STANDINGS_DIR);
    } catch (e) {
        console.error(`Failed to read standings dir ${STANDINGS_DIR}: ${e.message}`);
        process.exit(1);
    }
    // Accept BOTH legacy unscoped (standings-api-round-N.json) and
    // event-scoped (standings-api-event-{id}-round-N.json) filenames.
    // For the event-scoped form, filter to files matching THIS event ID
    // so archived per-event dirs and the active working set both work.
    const idEsc = String(eventId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const scopedRe = new RegExp(`^standings-api-event-${idEsc}-round-(\\d+)\\.json$`);
    const legacyRe = /^standings-api-round-(\d+)\.json$/;
    const standingsFiles = entries
        .map(f => {
            let m = f.match(scopedRe);
            if (m) return { file: f, n: Number(m[1]) };
            m = f.match(legacyRe);
            if (m) return { file: f, n: Number(m[1]) };
            return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.n - a.n);
    if (standingsFiles.length === 0) {
        console.error(`No standings-api-(event-${eventId}-)?round-N.json files found in ${STANDINGS_DIR}`);
        process.exit(1);
    }
    const finalFile = standingsFiles[0];
    console.log(`[Stats] Final standings source: ${finalFile.file} (round ${finalFile.n})`);
    const finalStandings = JSON.parse(await fs.readFile(path.join(STANDINGS_DIR, finalFile.file), 'utf8'));

    // Group by legend → best player (lowest rank wins). Falls back to
    // higher match_points if rank is missing/null on either side.
    // Players without a decklist are tracked separately so the operator
    // sees the join-loss clearly (it's usually no-shows / very early
    // drops who never registered a deck).
    const byLegend = new Map(); // legend → bestEntry
    let withoutDecklist = 0;
    let totalPlayers = 0;
    for (const row of finalStandings) {
        totalPlayers++;
        const userId = row.player?.id ?? row.user_event_status?.user?.id;
        const dl = userId != null ? playerLegend.get(Number(userId)) : null;
        if (!dl || !dl.legend) {
            withoutDecklist++;
            continue;
        }
        const u = row.user_event_status?.user || {};
        const entry = {
            legend: dl.legend,
            deckName: dl.deckName,
            rank: Number(row.rank ?? Number.POSITIVE_INFINITY),
            record: formatRecord(row.user_event_status),
            match_points: Number(row.user_event_status?.total_match_points ?? row.match_points ?? 0),
            display_name: u.game_user?.display_name || '',
            real_name: u.first_last || '',
            best_identifier: u.best_identifier || row.player?.best_identifier || ''
        };
        const current = byLegend.get(dl.legend);
        if (!current || beats(entry, current)) {
            byLegend.set(dl.legend, entry);
        }
    }

    // Print results — sorted by rank so the highest-finishing legends
    // come first.
    const ordered = [...byLegend.entries()]
        .map(([legend, entry]) => ({ legend, ...entry }))
        .sort((a, b) => a.rank - b.rank);

    console.log('');
    console.log(`Best of Legend — event ${eventId}`);
    console.log('═'.repeat(110));
    const padCol = (s, w) => String(s).padEnd(w).slice(0, w);
    console.log(
        padCol('Legend', 36) +
        padCol('Player', 32) +
        padCol('IGN', 22) +
        padCol('Rank', 6) +
        padCol('Record', 10)
    );
    console.log('─'.repeat(110));
    for (const e of ordered) {
        console.log(
            padCol(e.legend, 36) +
            padCol(e.real_name || e.best_identifier || '?', 32) +
            padCol(e.display_name || '—', 22) +
            padCol('#' + e.rank, 6) +
            padCol(e.record, 10)
        );
    }
    console.log('═'.repeat(110));
    console.log(`Legends represented: ${ordered.length}`);
    console.log(`Players matched: ${totalPlayers - withoutDecklist} / ${totalPlayers}`);
    if (withoutDecklist > 0) {
        console.log(`Players without cached decklist: ${withoutDecklist} (likely no-shows / early drops who never submitted)`);
    }
}

function formatRecord(ues) {
    if (!ues) return '—';
    const w = ues.matches_won ?? 0;
    const l = ues.matches_lost ?? 0;
    const d = ues.matches_drawn ?? 0;
    return d ? `${w}-${l}-${d}` : `${w}-${l}`;
}

// Lowest rank wins. Tiebreak by match points (higher is better) so a
// player with rank 14 / 30 pts beats rank 14 / 27 pts in case of a
// rank tie (rare but possible).
function beats(a, b) {
    if (a.rank !== b.rank) return a.rank < b.rank;
    return a.match_points > b.match_points;
}

main().catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
});
