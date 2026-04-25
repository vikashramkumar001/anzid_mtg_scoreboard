import {promises as fs} from 'fs';
import {standingsDataPath, getVendorSelection, getPlayerCount} from '../config/constants.js';
import { RoomUtils } from '../utils/room-utils.js';

let standingsData = {};
let lastBroadcastedRoundId = null;

// Load standings from file
export async function loadStandingsData() {
    try {
        const data = await fs.readFile(standingsDataPath, 'utf8');
        standingsData = JSON.parse(data);
        console.log('Standings data loaded.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No standings data file found. Starting with empty data.');
            standingsData = {};
        } else {
            console.error('Error loading standings data:', error);
            standingsData = {};
        }
    }
}

// Save standings to file
export async function saveStandingsData() {
    try {
        await fs.writeFile(standingsDataPath, JSON.stringify(standingsData, null, 2));
        console.log('Standings data saved.');
    } catch (error) {
        console.error('Error saving standings data:', error);
    }
}

// Get current raw standings
export function getStandingsData() {
    return standingsData;
}

// Update standings for a round
export async function updateStandings(round_id, textData) {
    standingsData[round_id] = textData;
    await saveStandingsData();
}

// Parse raw text standings into objects
export function parseStandingsRawData(input) {
    let ret = {};
    for (let i = 1; i <= 64; i++) {
        ret[i.toString()] = {
            rank: "",
            name: "",
            archetype: "",
            record: ""
        };
    }

    if (typeof input !== 'string' || input.trim() === '') {
        return ret;
    }

// Split the input into lines (preserve empty lines as blank strings)
    const lines = input
        .split('\n')
        .map(line => line.trim());

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]; // already trimmed; may be empty string

        // Check if the line starts with a number (Rank)
        if (/^\d+/.test(line)) {
            const rank = line.split(' ')[0]; // The rank is the first part of the line
            if (i + 3 >= lines.length) break; // Not enough lines for a complete entry
            const playerInfo = lines[++i].trim(); // The next line contains the player's name
            const archetype = lines[++i].trim(); // The next line contains the archetype
            const record = lines[++i].trim().split(/\s+/)[0]; // First space-delimited entry in the next line
            let name = '';
            if (playerInfo.includes(',')) {
                // "Last, First [optional extra]"
                let [lastName, firstName] = playerInfo.split(',').map(part => part.trim());
                firstName = firstName.split(' ')[0]; // Only take the first word of firstName
                name = `${firstName} ${lastName}`;
            } else {
                // Single word ("xDragon55x") or "First Last [optional extra]"
                const parts = playerInfo.trim().split(' ');
                name = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
            }

            ret[rank] = {
                rank: parseInt(rank, 10),
                name: name,
                archetype: archetype,
                record: record
            };
        }
    }

    return ret;
}

// Parse raw text standings for FlyQuest 2v2 layout.
//
// Textarea format differs from the 1v1 path — each entry is 4 lines:
//   rank
//   player1
//   player2
//   record
//
// Why a separate parser:
//   (a) The 1v1 parser truncates the name line to the first two space-delimited
//       tokens to handle "First Last [archetype noise]" payloads. That breaks
//       multi-word captain names like "Persephone Valentine".
//   (b) The 2v2 display (broadcast-round-standings-combined) reads `player1`
//       and `player2` to render captain portraits + thumbnails from the
//       playerRoster. Concatenating into a single `name` then re-splitting
//       downstream is fragile.
//   (c) The 2v2 layout doesn't render archetype at all, so we drop that
//       line from the format to keep the textarea clean for the operator.
//
// Also emits `name: "${player1} ${player2}"` so the group-assignment match
// (which compares against the full team label in data/groupAssignment.json)
// keeps working unchanged.
export function parseStandingsRawData2v2(input) {
    let ret = {};
    for (let i = 1; i <= 64; i++) {
        ret[i.toString()] = {
            rank: "",
            name: "",
            player1: "",
            player2: "",
            archetype: "",
            record: ""
        };
    }

    if (typeof input !== 'string' || input.trim() === '') {
        return ret;
    }

    const lines = input
        .split('\n')
        .map(line => line.trim());

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^\d+/.test(line)) {
            const rank = line.split(' ')[0];
            if (i + 3 >= lines.length) break; // need 4 lines for an entry
            const player1 = lines[++i].trim();
            const player2 = lines[++i].trim();
            const record  = lines[++i].trim().split(/\s+/)[0];

            ret[rank] = {
                rank: parseInt(rank, 10),
                // Concatenated label for groupAssignment.json matching
                // (case-insensitive compare happens downstream).
                name: `${player1} ${player2}`.trim(),
                player1,
                player2,
                archetype: '', // not present in 2v2 format; kept for shape parity
                record: record
            };
        }
    }

    return ret;
}

// Pick the parser that matches the current vendor + player-count selection.
// Keeping this in one place means every entry point (broadcast emit, page-load
// refresh) stays in sync — otherwise it's easy to update one path and leave
// the other reading the wrong shape, which manifests as captains/thumbs
// vanishing mid-broadcast.
//
// Comparison is case-insensitive to absorb any upstream drift (e.g. 'FlyQuest'
// vs 'flyquest', '2V2' vs '2v2'). Silent fallback to the 1v1 parser on a
// casing mismatch would produce misrendered standings with no error, so
// normalizing here is worth a couple of extra toLowerCase() calls.
function pickStandingsParser() {
    const vendor = String(getVendorSelection() || '').toLowerCase();
    const count = String(getPlayerCount() || '').toLowerCase();
    const is2v2Flyquest = vendor === 'flyquest' && count === '2v2';
    return is2v2Flyquest ? parseStandingsRawData2v2 : parseStandingsRawData;
}

// Empty standings payload used when a round has no saved textarea yet —
// keeps the display-page socket contract the same (display code expects
// `standings` to be an object of rank → row) and avoids passing null/undefined
// into the parsers from multiple call sites.
function makeEmptyStandings() {
    return pickStandingsParser()('');
}

// Emit full standings
export function emitStandings(io) {
    RoomUtils.emitWithRoomMapping(io, 'standings-data', {standingsData});
}

// Emit parsed standings for broadcast
export function emitBroadcastStandings(io, round_id) {
    lastBroadcastedRoundId = round_id;
    const raw = standingsData[round_id];
    // Guard: if the round has no saved textarea, emit the empty scaffold so
    // display pages still receive a well-shaped payload. Parsers already
    // short-circuit non-string input, but making the guard explicit here
    // documents the contract — downstream consumers can rely on `standings`
    // always being an object.
    const parsed = raw ? pickStandingsParser()(raw) : makeEmptyStandings();
    RoomUtils.emitWithRoomMapping(io, 'broadcast-round-standings-data', { standings: parsed, roundId: round_id });
}

// Get current broadcast standings (for page load requests).
// Same null-safety contract as emitBroadcastStandings: when a round has been
// broadcast but has no saved raw (e.g. empty standings between rounds), still
// return a valid payload rather than crashing a late-joining display client.
export function getCurrentBroadcastStandings() {
    if (!lastBroadcastedRoundId) return null;
    const raw = standingsData[lastBroadcastedRoundId];
    const parsed = raw ? pickStandingsParser()(raw) : makeEmptyStandings();
    return { standings: parsed, roundId: lastBroadcastedRoundId };
}
