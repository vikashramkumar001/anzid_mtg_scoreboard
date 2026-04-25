// /scoreboard/:matchID/:variant — per-match scene page.
//   (also accepts /broadcast/round/scoreboard/:matchID/:variant for backward compat)
//
// TODAY: Renders the vendor-specific frame PNG and populates overlay DOM with
// player names + team life from `scoreboard-{N}-saved-state`. Overlay visibility
// is CSS-driven via vendor-config custom properties (see public/js/vendor-config.js
// flyquest block). No JS vendor checks — other vendors see the frame PNG only.
//
// Player icons: looked up from the global roster by exact name match (see
// features/roster.js + data/playerRoster.json). Roster payload arrives via
// `playerRosterUpdated`; this JS maps name → portraitUrl and stamps the src
// onto #player-1-icon..#player-4-icon. If a name has no roster entry (or the
// name is blank), that individual icon is hidden via display:none so the
// flyquest frame shows through cleanly. Opacity/position are CSS-var-driven
// per vendor — flyquest sets --sb-icon-opacity to 1.

const socket = io();
window.roomManager = new RoomManager(socket);

// Parse URL: /scoreboard/:matchID/:variant  OR  /broadcast/round/scoreboard/:matchID/:variant
const segs = window.location.pathname.split('/').filter(Boolean);
const variant = segs[segs.length - 1];                 // overview | hand-left | hand-right | player-left | player-right
const matchID = segs[segs.length - 2] || 'match1';     // match1..match4
const matchNum = parseInt(matchID.replace(/^match/, ''), 10) || 1;

// Variant gating — controls which team panel CSS displays (hand-left → team-1, hand-right → team-2).
document.body.setAttribute('data-variant', variant);

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

// Mirror player-count onto <body> so CSS can apply playerCount-specific
// positioning (e.g. flyquest hand-left vs hand-left-fq-2v2 frames have
// different overlay positions). Mirrors the pattern used in scoreboard.js.
document.body.dataset.playerCount = currentPlayerCount;

function updateFrame() {
    const vc = window.VENDOR_CONFIG;
    // Match-scene frame PNG path convention (kept identical to the old
    // /background/match-* path so zero assets needed renaming):
    //   /assets/images/{game}/scoreboard/frame/{game}-scoreboard-frame-{variant}.png
    // vc.getAssetPath appends -{vendor}-{playerCount} before the extension.
    const base = `/assets/images/${currentGame}/scoreboard/frame/${currentGame}-scoreboard-frame-${variant}.png`;
    const resolved = vc ? vc.getAssetPath(base, currentVendor, currentPlayerCount) : base;
    document.getElementById('scoreboard-frame').style.backgroundImage = `url("${resolved}")`;
    console.log(`[Scoreboard] match=${matchID} variant=${variant} frame=${resolved}`);
}

function applyVendorOverrides() {
    const vc = window.VENDOR_CONFIG;
    if (!vc) return;
    // Clear any previously-set override, then re-apply for current game+vendor.
    vc.getAllOverrideProperties().forEach(prop => document.documentElement.style.removeProperty(prop));
    const overrides = vc.getOverrides(currentGame, currentVendor);
    Object.entries(overrides).forEach(([prop, value]) => document.documentElement.style.setProperty(prop, value));
}

// ── Player-roster lookup (name → portraitUrl) ─────────────────────────────
// Kept as a Map so per-icon lookups are O(1) when saved-state arrives.
// Rebuilt on every `playerRosterUpdated` broadcast; the master-control editor
// emits this after any add/delete/portrait-upload.
//
// Lookup is case-insensitive + whitespace-trimmed: operators enter names as
// free text on control.html (with autocomplete assist), so "LS" vs "ls" or
// "Anna Margaret " vs "Anna Margaret" shouldn't break the icon match. Keys
// are normalized here and on lookup via normalizeName().
let rosterByName = new Map();
// Last saved-state cached so we can re-stamp icons when the roster arrives
// AFTER the match state (order-of-arrival isn't guaranteed on page load).
let lastMatchData = null;

function normalizeName(name) {
    return (name || '').toLowerCase().trim();
}

function applyIcon(iconId, name) {
    const img = document.getElementById(iconId);
    if (!img) return;
    const url = name ? rosterByName.get(normalizeName(name)) : null;
    if (url) {
        // Cache-bust so re-uploading a portrait refreshes on open scenes
        // (roster payload doesn't include a version; timestamp is enough).
        img.src = url + '?v=' + Date.now();
        img.style.display = '';
    } else {
        img.removeAttribute('src');
        img.style.display = 'none';
    }
}

function applyAllIcons() {
    if (!lastMatchData) return;
    applyIcon('player-1-icon', lastMatchData['player-name-left']);
    applyIcon('player-2-icon', lastMatchData['player-name-left-2']);
    applyIcon('player-3-icon', lastMatchData['player-name-right']);
    applyIcon('player-4-icon', lastMatchData['player-name-right-2']);
}

socket.on('playerRosterUpdated', (players) => {
    rosterByName = new Map((players || []).map(p => [normalizeName(p.name), p.portraitUrl]));
    applyAllIcons();
});
socket.emit('getPlayerRoster');

// ── Match-data binding (mirrors timer.js:20 pattern) ──────────────────────
// Server emits `scoreboard-{N}-saved-state` whenever the operator saves from
// control.html. Payload shape: { round_id, match_id, data: {...fields...} }.
socket.on(`scoreboard-${matchNum}-saved-state`, (payload) => {
    const data = payload && payload.data;
    if (!data) return;
    lastMatchData = data;
    // 2v2 field convention (see public/js/matches.js:229–233):
    //   player-name-left      → P1    player-name-left-2  → P2
    //   player-name-right     → P3    player-name-right-2 → P4
    //   player-life-left      → team 1 life (single value, not a sum)
    //   player-life-right     → team 2 life (single value, not a sum)
    document.getElementById('player-1-name').textContent = data['player-name-left']    || '';
    document.getElementById('player-2-name').textContent = data['player-name-left-2']  || '';
    document.getElementById('player-3-name').textContent = data['player-name-right']   || '';
    document.getElementById('player-4-name').textContent = data['player-name-right-2'] || '';
    document.getElementById('team-1-life').textContent   = data['player-life-left']    || '';
    document.getElementById('team-2-life').textContent   = data['player-life-right']   || '';
    applyAllIcons();
});

// Initial-state request — robust to page reload mid-match (timer.js:17 pattern).
// Server responds by emitting `scoreboard-{matchNum}-saved-state` above.
socket.emit('getSavedControlState', { control_id: String(matchNum) });

// ── Selection listeners (game / vendor / playerCount) ─────────────────────
// Same 6-event pattern all other display pages use.
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');

socket.on('server-current-game-selection', ({ gameSelection }) => {
    currentGame = gameSelection;
    applyVendorOverrides();
    updateFrame();
});
socket.on('game-selection-updated', ({ gameSelection }) => {
    currentGame = gameSelection;
    applyVendorOverrides();
    updateFrame();
});
socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    applyVendorOverrides();
    updateFrame();
});
socket.on('vendor-selection-updated', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    applyVendorOverrides();
    updateFrame();
});
socket.on('server-current-player-count', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    document.body.dataset.playerCount = playerCount;  // gates 2v2-only CSS vars
    updateFrame();
});
socket.on('player-count-updated', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    document.body.dataset.playerCount = playerCount;  // gates 2v2-only CSS vars
    updateFrame();
});
