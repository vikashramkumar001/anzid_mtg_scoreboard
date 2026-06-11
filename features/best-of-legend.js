// "Best of Legend" — per-round, per-legend leaderboard.
//
// For each round N, looks at standings-api-event-{eventId}-round-N.json
// (every player's rank + record AS OF round N), joins with the cached
// decklists for the active event (each player's chosen Legend), and
// groups the top 5 players by Legend. The lowest rank wins; ties broken by match
// points then by raw record.
//
// Used by the Standings tab in master-control to display, alongside
// each round's standings card, a per-Legend top-5 leaderboard with
// portraits — letting casters/operators see "after round 5, the best
// Annie player is Kyle Belaiche at 4-1, #5 overall" at a glance.

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { getLegendForPlayer } from './decklist-lookup.js';
import { getStandingsRowsForRound, getStandingsRoundNumbers } from './standings-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use 251×124 (landscape) portraits — ~55 KB each vs the 1200×1200
// PNGs (~730 KB). With 28 legends × 16 round sub-tabs in the DOM
// that's ~25 MB of images preloaded vs ~320 MB. Visual quality at
// 72×72 circle crop is identical since we object-position toward
// the upper third of the source.
const PORTRAIT_DIR_REL = '/assets/images/riftbound/shared/legend-portraits/legend-portraits-251x124';
const PORTRAIT_DIR_ABS = path.join(__dirname, '..', 'public', 'assets', 'images', 'riftbound', 'shared', 'legend-portraits', 'legend-portraits-251x124');

// Map<legendName, { portraitUrl, set, num }> — built once at boot
// from the actual PNG filenames on disk. The legend number embedded
// in each filename (e.g. "0017_…") tells us which Riftbound set the
// legend belongs to (the constants.js list groups them by number
// range). Avoids hardcoding the legend-number ↔ name mapping in two
// places (it's already implicitly in the filenames).
const portraitByLegend = new Map();

// Riftbound set buckets keyed off the 4-digit legend number embedded
// in each portrait filename. Per the operator's request the original
// two starter sets (Origins Starter + Origins) are merged into a
// single "OGS+OGN" bucket since the metagame distinction between
// them isn't useful for the BoL filter UI. Anything past 0040 is a
// future set we don't have a label for yet → returns "OTHER" so
// new portraits show up but in a separate filter bucket.
function getLegendSet(legendNumber) {
    const n = Number(legendNumber);
    if (!Number.isFinite(n) || n <= 0) return 'OTHER';
    if (n <= 16) return 'OGS+OGN';   // 0001-0004 OGS, 0005-0016 OGN
    if (n <= 28) return 'SFD';       // 0017-0028 Spiritforged
    if (n <= 40) return 'UNL';       // 0029-0040 Unleashed
    return 'OTHER';
}

export async function loadLegendPortraits() {
    portraitByLegend.clear();
    let files;
    try {
        files = await fs.readdir(PORTRAIT_DIR_ABS);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('[BoL] No legend-portraits-1200x1200 dir — portraits will fall back to placeholder.');
            return;
        }
        console.error('[BoL] Failed to read legend portraits:', e);
        return;
    }
    // Filename pattern: 251x124_{NUM}_{LegendName}.png
    // e.g. "251x124_0001_Annie, Dark Child.png"
    let count = 0;
    for (const file of files) {
        const m = file.match(/^251x124_(\d+)_(.+)\.png$/);
        if (!m) continue;
        const legendNumber = m[1];
        const legendName = m[2];
        portraitByLegend.set(legendName, {
            portraitUrl: `${PORTRAIT_DIR_REL}/${file}`,
            set: getLegendSet(legendNumber),
            num: Number(legendNumber)
        });
        count++;
    }
    console.log(`[BoL] Loaded ${count} legend portraits into memory.`);
}

// Returns just the URL — kept for any caller that doesn't need the
// set/num metadata. Internal BoL computation uses getLegendMetadata()
// below to grab everything in one lookup.
export function getLegendPortraitUrl(legendName) {
    return portraitByLegend.get(legendName)?.portraitUrl || '';
}

// Full metadata for a legend — portrait URL, set bucket, and the
// raw legend number from the filename. Used by computeBestOfLegend
// to attach `set` to each block so the client can filter by set.
export function getLegendMetadata(legendName) {
    return portraitByLegend.get(legendName) || null;
}

// Lowest rank wins. Tiebreak: more match points, then higher raw
// match-win count. Stable for ties beyond that — caller order wins.
function compareCandidates(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;
    return b.matchesWon - a.matchesWon;
}

// Computes the top-N leaderboard PER LEGEND for the state going INTO
// the given round (i.e. AFTER round N-1 has played out). Mirrors the
// standings textarea convention — "Standings in round 10" means the
// leaderboard as of the end of round 9, and so does "Best of Legend
// before Round 10".
//
// Returns: { round, legends: Array<{ legend, portraitUrl, totalDecks,
// topPlayers: [...] }>, unmatchedPlayers } sorted by best player's
// rank ascending (so the best-overall legends appear at the top of
// the rendered list).
//
// `eventId` scopes the legend lookup to the right cached decklist
// (operator may have multiple events on disk). Standings rows for
// players without a cached decklist are excluded from the top-N list
// but counted in `unmatchedPlayers` for diagnostic purposes.
//
// Synchronous — reads from the in-memory standings-api cache (loaded
// once at boot via loadStandingsApiData() in standings-api.js).
// Previous version re-read 16 × 1.7 MB JSON files from disk on every
// request, which OOMed the server when a master-control reload fired
// the get-best-of-legend handler. Now zero fs IO per request.
export function computeBestOfLegendForRound(roundNumber, eventId) {
    const n = Number(roundNumber);
    // Round 1 has no "before" data — no rounds have been played yet.
    // Operator's Round 1 sub-tab shows BoL as empty with the hint
    // message, mirroring how the standings textarea is empty in Round 1.
    if (!Number.isFinite(n) || n <= 1) {
        return { round: n, legends: [], unmatchedPlayers: 0 };
    }
    // Pre-round-N records = post-round-(N-1) records.
    const rows = getStandingsRowsForRound(n - 1);
    if (rows.length === 0) {
        return { round: n, legends: [], unmatchedPlayers: 0 };
    }

    // Group rows by legend.
    const byLegend = new Map();
    let unmatchedPlayers = 0;

    for (const row of rows) {
        const legend = getLegendForPlayer(eventId, row.playerId);
        if (!legend) {
            unmatchedPlayers++;
            continue;
        }
        // The slim-row already has all the BoL fields except
        // copy-on-write — pass it through directly. The candidate
        // object reused as-is is fine since we only read on the wire.
        if (!byLegend.has(legend)) byLegend.set(legend, []);
        byLegend.get(legend).push(row);
    }

    // Reduce each legend's candidate list to top N + total count.
    // N=3 currently (operator preference — was 5). The field name is
    // `topPlayers` (not `top3`) so a future tweak to the cap doesn't
    // require renaming the wire/UI contract.
    const TOP_N = 3;
    const legends = [];
    for (const [legend, candidates] of byLegend.entries()) {
        candidates.sort(compareCandidates);
        const meta = getLegendMetadata(legend);
        legends.push({
            legend,
            set: meta?.set || 'OTHER',
            portraitUrl: meta?.portraitUrl || '',
            totalDecks: candidates.length,
            topPlayers: candidates.slice(0, TOP_N)
        });
    }
    // Order legends by their best player's rank, then by total deck
    // count desc as a tiebreak (more popular legends bubble up at
    // identical leaderboard positions).
    legends.sort((a, b) => {
        const aRank = a.topPlayers[0]?.rank ?? Number.POSITIVE_INFINITY;
        const bRank = b.topPlayers[0]?.rank ?? Number.POSITIVE_INFINITY;
        if (aRank !== bRank) return aRank - bRank;
        return b.totalDecks - a.totalDecks;
    });

    return { round: Number(roundNumber), legends, unmatchedPlayers };
}

// Computes Best of Legend for every round we can compute from the
// in-memory standings cache. Returns `{ "2": {…}, "3": {…}, … }`
// keyed by BoL round number — i.e. the round the operator will see
// the data UNDER. Each BoL round N reads from standings-api-event-{id}-round-(N-1)
// since the data represents "before round N starts" = "after round
// N-1 finished". Round 1 is intentionally never emitted (no pre-
// round-1 data); the client renders Round 1's BoL card empty by
// default.
export function computeBestOfLegendAllRounds(eventId) {
    const out = {};
    for (const standingsRound of getStandingsRoundNumbers()) {
        const bolRound = standingsRound + 1;
        out[String(bolRound)] = computeBestOfLegendForRound(bolRound, eventId);
    }
    return out;
}
