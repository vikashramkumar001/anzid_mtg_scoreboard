// Pairings cache — server-side store for per-round pairings (matches) data
// fetched from Carde.io. Mirrors the standings flow but is populated by a
// different fetch function (`fetchCardeioPairings` in tournament-platforms.js)
// and stored in disk-backed JSON files under data/cardeio/.
//
// On boot we scan data/cardeio/pairings-api-event-{eventId}-round-*.json
// for the CURRENT event so any pairings the operator has previously
// fetched (or pulled offline via the bulk script) are immediately
// available to master-control without a refetch. Subsequent fetches
// via the `fetch-tournament-pairings` socket handler update both
// disk and this in-memory cache.
//
// Schema per round (raw passthrough of the Carde v2 matches-list response):
//   pairingsData[roundNumber] = [
//     {
//       table_number, match_is_bye, status, winner_id,
//       player_match_relationships: [
//         { player: {first_name, last_name, best_identifier},
//           user_event_status: {user: {id}, matches_won, matches_lost, matches_drawn} },
//         …
//       ]
//     },
//     …
//   ]

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { RoomUtils } from '../utils/room-utils.js';
import { getPlatformConfig } from './tournament-platforms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARDEIO_DIR = path.join(__dirname, '..', 'data', 'cardeio');

let pairingsData = {};

// Load every pairings-api-event-{eventId}-round-{N}.json file under
// data/cardeio/ that matches the CURRENT event ID into memory at boot.
// Older unscoped files (pairings-api-round-N.json) are ignored — they
// belong to an unknown event and would pollute the matchup matrix /
// pairings panes with stale matches from a previous tournament.
// Missing dir is fine (operator may not have fetched anything yet).
export async function loadPairingsData() {
    pairingsData = {};
    const tournamentId = getPlatformConfig().tournamentId;
    if (!tournamentId) {
        console.log('[Pairings] No tournament ID set — starting empty.');
        return;
    }

    let entries;
    try {
        entries = await fs.readdir(CARDEIO_DIR);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('[Pairings] No data/cardeio/ dir yet — starting empty.');
            return;
        }
        console.error('[Pairings] Error reading data/cardeio/:', e);
        return;
    }

    // Event-scoped filename pattern: pairings-api-event-{id}-round-{N}.json
    // Escape the tournamentId to keep regex-special chars safe.
    const idEsc = String(tournamentId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fileRe = new RegExp(`^pairings-api-event-${idEsc}-round-(\\d+)\\.json$`);
    const pairingFiles = entries.filter(f => fileRe.test(f));
    if (pairingFiles.length === 0) {
        console.log(`[Pairings] No pairings JSON files for event ${tournamentId} — starting empty.`);
        return;
    }

    let loaded = 0;
    for (const file of pairingFiles) {
        const m = file.match(fileRe);
        if (!m) continue;
        const roundNumber = m[1];
        try {
            const raw = await fs.readFile(path.join(CARDEIO_DIR, file), 'utf8');
            const matches = JSON.parse(raw);
            // Slim each match to just the fields the UI/augmenter
            // touches. Drops deck_submission (with full card lists),
            // player_interactions, queue_check_in_status, etc. that
            // would otherwise balloon socket.io payloads past the
            // engine.io-parser string-length limit when 16 rounds ×
            // ~1500 matches each get emitted on `all-pairings-data`.
            pairingsData[roundNumber] = matches.map(slimMatch);
            loaded++;
        } catch (e) {
            console.error(`[Pairings] Failed to load ${file}:`, e.message);
        }
    }
    console.log(`[Pairings] Loaded ${loaded} round(s) for event ${tournamentId}: ${Object.keys(pairingsData).sort((a, b) => Number(a) - Number(b)).join(', ')}`);
}

// Slim one match to ONLY the fields master-control consumes. See the
// pairings UI in matches.js: row renderer reads table_number,
// match_is_bye, status, winning_player_id, match_is_intentional_draw,
// match_is_unintentional_draw, plus per-relationship player.{id,
// first_name, last_name, best_identifier}, user_event_status.{user.id,
// user.first_last, user.best_identifier, user.game_user.display_name,
// matches_won, matches_lost, matches_drawn}. Augmenter also touches
// player.id and user_event_status.user.id for legend lookup.
//
// Everything else from Carde's response is dropped — saves ~80% of
// the per-match payload size in practice (full match objects come in
// at 5-10 KB each due to deck_submission embedding the entire deck).
function slimMatch(match) {
    return {
        table_number: match.table_number,
        match_is_bye: !!match.match_is_bye,
        status: match.status,
        winning_player_id: match.winning_player_id ?? null,
        match_is_intentional_draw: !!match.match_is_intentional_draw,
        match_is_unintentional_draw: !!match.match_is_unintentional_draw,
        player_match_relationships: (match.player_match_relationships || []).map(slimRelationship)
    };
}

function slimRelationship(rel) {
    const p = rel?.player || {};
    const ues = rel?.user_event_status || {};
    const u = ues.user || {};
    return {
        player: {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            best_identifier: p.best_identifier
        },
        user_event_status: {
            id: ues.id,
            matches_won: ues.matches_won,
            matches_lost: ues.matches_lost,
            matches_drawn: ues.matches_drawn,
            user: {
                id: u.id,
                first_last: u.first_last,
                best_identifier: u.best_identifier,
                game_user: u.game_user ? { display_name: u.game_user.display_name } : null
            }
        }
    };
}

// Whole-cache getter for the `get-all-pairings` socket request.
export function getAllPairingsData() {
    return pairingsData;
}

// Replace one round's pairings in the in-memory cache. Called by the
// socket handler after `fetchCardeioPairings()` returns successfully.
// Does not write to disk — `fetchCardeioPairings()` already does that
// before returning, keeping disk and memory consistent. Slims the
// incoming matches to match the boot-load shape so socket emits stay
// under the engine.io-parser string-length limit even after a fresh
// Fetch Pairings click pushes new data in.
export function setPairingsForRound(roundNumber, matches) {
    if (!Array.isArray(matches)) return;
    pairingsData[String(roundNumber)] = matches.map(slimMatch);
}

// Broadcast the entire pairings cache to all subscribed master-control
// clients. Called when a fresh-loaded master-control page asks for the
// current state via `get-all-pairings`.
export function emitAllPairings(io) {
    RoomUtils.emitWithRoomMapping(io, 'all-pairings-data', { pairingsData });
}
