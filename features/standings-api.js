// Raw Carde standings (per-round JSON snapshots) cache.
//
// Loaded from data/cardeio/standings-api-event-{eventId}-round-{N}.json
// — same event-scoped flat-file convention as pairings. Each file is the paginated `results` array
// from Carde's v2 standings endpoint, where each entry has a per-round
// `record` field (e.g. "5-1-0") that captures the player's W-L-D AS OF
// that round.
//
// The pairings join uses this to answer "what was each player's record
// going INTO round N" — which is the record FROM the standings file
// for round N-1 (pairings round 1 → everyone is 0-0, no prior round).
// Master-control's pairings table reads `pre_round_record` off each
// player_match_relationship instead of the embedded final-tally
// `user_event_status` so per-round records are correct regardless of
// when the standings were fetched.

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { getPlatformConfig } from './tournament-platforms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARDEIO_DIR = path.join(__dirname, '..', 'data', 'cardeio');

// Map<roundNumberString, Map<playerId, recordString>>.
// Two-level lookup — outer key is the round number that produced the
// standings file, inner key is player.id (= user.id, same number on
// Carde). Player IDs are normalized to numbers for safe equality
// against pairings' `player.id` field.
const recordsByRound = new Map();

// Map<roundNumberString, Array<{ playerId, rank, record, matchPoints,
// matchesWon, displayName, realName, bestIdentifier }>> — richer per-row
// snapshot kept in memory so Best-of-Legend can compute without re-
// reading 1.7MB standings JSON files. Built alongside recordsByRound at
// boot; populated even when buildPlayerRecordMap finds an empty record
// (we still want the row for ranking purposes).
const rowsByRound = new Map();

// Load every standings-api-event-{eventId}-round-{N}.json that matches
// the CURRENT event ID under data/cardeio/ at boot, and build the per-
// round → per-player record lookup. Older unscoped files
// (standings-api-round-N.json) are ignored — they belong to an unknown
// event and would put stale records into the pairings join. Missing
// dir is fine (operator may not have fetched standings yet).
export async function loadStandingsApiData() {
    recordsByRound.clear();
    rowsByRound.clear();
    const tournamentId = getPlatformConfig().tournamentId;
    if (!tournamentId) {
        console.log('[StandingsApi] No tournament ID set — starting empty.');
        return;
    }

    let entries;
    try {
        entries = await fs.readdir(CARDEIO_DIR);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('[StandingsApi] No data/cardeio/ dir — starting empty.');
            return;
        }
        console.error('[StandingsApi] Error reading data/cardeio/:', e);
        return;
    }

    const idEsc = String(tournamentId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fileRe = new RegExp(`^standings-api-event-${idEsc}-round-(\\d+)\\.json$`);
    const standingsFiles = entries.filter(f => fileRe.test(f));
    if (standingsFiles.length === 0) {
        console.log(`[StandingsApi] No standings JSON files for event ${tournamentId} — pairings will show final records as fallback.`);
        return;
    }

    for (const file of standingsFiles) {
        const m = file.match(fileRe);
        if (!m) continue;
        const roundNumber = m[1];
        try {
            const raw = await fs.readFile(path.join(CARDEIO_DIR, file), 'utf8');
            const rows = JSON.parse(raw);
            const playerMap = buildPlayerRecordMap(rows);
            recordsByRound.set(roundNumber, playerMap);
            // Slim per-row snapshot — keep only what BoL needs, drop
            // the rest of the Carde response (which has heavy nested
            // objects like deck_submission). For 1832 rows × 16 rounds
            // this stays well under 50 MB resident.
            rowsByRound.set(roundNumber, rows.map(slimRow).filter(Boolean));
        } catch (e) {
            console.error(`[StandingsApi] Failed to load ${file}:`, e.message);
        }
    }
    console.log(`[StandingsApi] Loaded ${recordsByRound.size} round(s) for event ${tournamentId}: ${[...recordsByRound.keys()].sort((a, b) => Number(a) - Number(b)).join(', ')}`);
}

// Slim down one Carde standings row to just the fields the rest of the
// app uses. Keeps GC happy — the full row carries deck_submission +
// player_interactions arrays we never read here.
function slimRow(row) {
    const playerId = row?.player?.id
        ?? row?.user_event_status?.user?.id
        ?? row?.id;
    if (playerId == null) return null;
    const u = row.user_event_status?.user || {};
    return {
        playerId: Number(playerId),
        rank: Number(row.rank ?? Number.POSITIVE_INFINITY),
        record: String(row.record || '').trim(),
        matchPoints: Number(row.match_points ?? row.user_event_status?.total_match_points ?? 0),
        matchesWon: Number(row.user_event_status?.matches_won ?? 0),
        displayName: u.game_user?.display_name || '',
        realName: u.first_last || '',
        bestIdentifier: u.best_identifier || row.player?.best_identifier || ''
    };
}

// Per-round slim row array, used by best-of-legend.js. Returns []
// (not undefined) when the round isn't loaded so callers can blindly
// iterate without a null check.
export function getStandingsRowsForRound(roundNumber) {
    return rowsByRound.get(String(roundNumber)) || [];
}

// Sorted list of round numbers we have data for. Used by all-rounds
// computations.
export function getStandingsRoundNumbers() {
    return [...rowsByRound.keys()].map(Number).sort((a, b) => a - b);
}

// Build a Map<playerId, record> from one round's standings rows.
// Player ID is taken from `player.id` (or falls back to user.id /
// user_event_status.user.id — all three should match on Carde) for
// 1:1 join with pairings' `player_match_relationships[].player.id`.
function buildPlayerRecordMap(rows) {
    const map = new Map();
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
        const playerId = row?.player?.id
            ?? row?.user_event_status?.user?.id
            ?? row?.id;
        if (playerId == null) continue;
        // Per-round record (e.g. "5-1-0"). Drop the trailing -0 draws
        // for symmetry with how the pairings table currently formats
        // records (matches the standings textarea convention too).
        const record = String(row.record || '').trim();
        if (!record) continue;
        map.set(Number(playerId), record);
    }
    return map;
}

// Records going INTO round N = records AFTER round N-1.
// Special case: round 1 means everyone is 0-0 (no rounds played).
// Returns "0-0" for round 1 and "—" if we have no standings data
// for the previous round (e.g. fetch only landed for some rounds).
export function getRecordGoingIntoRound(roundNumber, playerId) {
    const n = Number(roundNumber);
    if (!Number.isFinite(n)) return '—';
    if (n <= 1) return '0-0';
    const prev = String(n - 1);
    const map = recordsByRound.get(prev);
    if (!map) return '—';
    if (playerId == null) return '—';
    return map.get(Number(playerId)) || '0-0';
}

// Whether we have any standings data loaded — pairings emit can skip
// the augment loop entirely if the cache is empty (saves churning
// thousands of relationships for nothing).
export function hasStandingsApiData() {
    return recordsByRound.size > 0;
}
