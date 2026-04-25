// scripts/emit-dummy-2v2-standings.mjs
//
// Dev harness — fires a pre-baked 2v2 standings payload at the running
// server so the /broadcast/round/standings-combined page can be tested
// while we're not yet linked to Melee for live data.
//
// Usage:
//   node scripts/emit-dummy-2v2-standings.mjs
//
// Why this exists:
//   The production standings pipeline has two paths:
//     (a) Manual text entered in master-control → parseStandingsRawData()
//         → emits broadcast-round-standings-data with {rank,name,archetype,record}
//     (b) Tournament platform sync (Melee / TopDeck / Carde.io) →
//         normalizeStandings() → adds `player1`/`player2` for 2v2.
//   The FlyQuest 2v2 layout needs player1/player2 (captain portraits +
//   thumbnails lookup against playerRoster.json). Path (a) doesn't
//   produce them, so we need a bypass until the event is Melee-backed.
//
// How it works:
//   Connects as a socket.io client, emits `dev-inject-broadcast-standings`
//   (handler in sockets/handlers.js) which rebroadcasts to the standings
//   display room. The page's `broadcast-round-standings-data` listener
//   receives it like real Melee data. Zero persistence — re-run whenever
//   you reload the broadcast page or want to reset state.
//
// Matching: team `name` = case-insensitive match against the entries in
// data/groupAssignment.json. `player1`/`player2` are case-insensitive
// matches against `name` in data/playerRoster.json.
//
// Prereq: server must be running (`npm start` or your usual start cmd).

import { io as ioClient } from 'socket.io-client';

const PORT = process.env.PORT || 1378;
// Use 127.0.0.1 (not "localhost") — on macOS Node resolves "localhost" to
// IPv6 (::1) first, and the server binds IPv4 (0.0.0.0), so the handshake
// fails with "xhr poll error" under the default name. Override via
// TARGET_URL if you're pointing at a remote / non-default host.
const URL  = process.env.TARGET_URL || `http://127.0.0.1:${PORT}`;

// Dummy standings for the 8 teams currently in data/groupAssignment.json.
// Ranks are interleaved across the two groups so the split logic shows
// its work (group1/group2 pluck teams by rank order, not by input order).
// `name` must match the groupAssignment entry (case-insensitive).
// `player1`/`player2` must match data/playerRoster.json entries.
const dummyTeams = [
    // rank, name (= groupAssignment entry), player1, player2, archetype, record
    [1, 'peterpark atrioc',                     'peterpark',            'Atrioc',               'Mono Red Aggro',        '6-1'],
    [2, 'Brodin sofia',                         'Brodin',               'Sofia',                'Boros Convoke',         '6-1'],
    [3, 'Persephone valentine gavin verhey',    'Persephone Valentine', 'Gavin Verhey',         'Jeskai Tempo',          '5-2'],
    [4, 'danny yamina',                         'Danny',                'Yamina',               'Izzet Cauldron',        '5-2'],
    [5, 'ls reynad',                            'LS',                   'Reynad',               'Dimir Midrange',        '4-3'],
    [6, 'nemo taalia vess',                     'Nemo',                 'Taalia Vess',          'Golgari Midrange',      '4-3'],
    [7, 'anna margaret lua stardust',           'Anna Margaret',        'Lua Stardust',         'Azorius Control',       '3-4'],
    [8, "biqtch puddin' zabracus",              "Biqtch Puddin'",       'Zabracus',             'Selesnya Tokens',       '3-4'],
];

// Client-side renderer reads `incoming.standings || incoming`, so we can
// send either shape. Match the server's usual {standings, roundId} form
// so it looks like the live pipeline.
const standings = {};
for (const [rank, name, player1, player2, archetype, record] of dummyTeams) {
    standings[String(rank)] = { rank, name, player1, player2, archetype, record };
}
// Pad up to 64 blank rows so the non-flyquest sliders still render empties
// (matches what parseStandingsRawData produces — it pre-fills 1..64).
for (let r = 1; r <= 64; r++) {
    if (!standings[String(r)]) {
        standings[String(r)] = { rank: '', name: '', archetype: '', record: '' };
    }
}

const payload = { standings, roundId: 'dev-dummy' };

console.log(`[dummy-2v2] connecting to ${URL}…`);
// Let socket.io negotiate transports (polling → upgrade to websocket) so we
// match what the browser clients do. Forcing `websocket` only can fail if the
// server/proxy isn't configured for a direct WS upgrade.
const socket = ioClient(URL, { reconnection: false });

socket.on('connect', () => {
    console.log(`[dummy-2v2] connected (${socket.id}), emitting dev-inject-broadcast-standings`);
    socket.emit('dev-inject-broadcast-standings', payload);
    // Give the server a moment to rebroadcast before disconnecting.
    setTimeout(() => {
        console.log('[dummy-2v2] done — disconnecting');
        socket.disconnect();
        process.exit(0);
    }, 300);
});

socket.on('connect_error', (err) => {
    console.error('[dummy-2v2] connect_error:', err.message);
    console.error('  Is the server running on', URL, '?');
    process.exit(1);
});

setTimeout(() => {
    console.error('[dummy-2v2] timed out after 5s — aborting');
    process.exit(1);
}, 5000);
