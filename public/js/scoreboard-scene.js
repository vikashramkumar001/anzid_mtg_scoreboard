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
    const overrides = vc.getOverrides(currentGame, currentVendor, currentPlayerCount);
    Object.entries(overrides).forEach(([prop, value]) => document.documentElement.style.setProperty(prop, value));
}

// ── Per-vendor player portraits ───────────────────────────────────────────
// Mirrors the lookup convention used by scoreboard.js applyIcon():
//   /assets/images/{game}/shared/player-portraits/{vendor}-{playerCount}/{slug}.png
// Default vendor (or any vendor without a matching file) → no portrait shown.
// The legacy global roster (rosterByName / playerRosterUpdated) is retained
// here for compatibility with other code paths but no longer drives the
// per-match scene's player icons.
let rosterByName = new Map();    // unused for portraits; kept for compat.
let lastMatchData = null;

function normalizeName(name) {
    return (name || '').toLowerCase().trim();
}

// "Rob Stanley" → "rob-stanley". Matches on-disk per-vendor folder convention.
function nameToSlug(name) {
    return (name || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function applyIcon(iconId, name) {
    const img = document.getElementById(iconId);
    if (!img) return;

    if (!name || !currentVendor || currentVendor === 'default' || !currentGame) {
        img.onerror = null;
        img.onload = null;
        img.removeAttribute('src');
        img.style.display = 'none';
        return;
    }

    const slug = nameToSlug(name);
    const url = `/assets/images/${currentGame}/shared/player-portraits/${currentVendor}-${currentPlayerCount}/${slug}.png`;

    img.onerror = function () {
        if (img.getAttribute('src') === url) {
            img.removeAttribute('src');
            img.style.display = 'none';
        }
    };
    img.onload = function () {
        if (img.getAttribute('src') === url) {
            img.style.display = '';
        }
    };
    img.src = url;
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

// All 6 selection-change handlers re-stamp icons after updating state so
// the per-vendor portrait pool resolves with the new game/vendor/count.
socket.on('server-current-game-selection', ({ gameSelection }) => {
    currentGame = gameSelection;
    applyVendorOverrides();
    updateFrame();
    applyAllIcons();
});
socket.on('game-selection-updated', ({ gameSelection }) => {
    currentGame = gameSelection;
    applyVendorOverrides();
    updateFrame();
    applyAllIcons();
});
socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    applyVendorOverrides();
    updateFrame();
    applyAllIcons();
});
socket.on('vendor-selection-updated', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    applyVendorOverrides();
    updateFrame();
    applyAllIcons();
});
socket.on('server-current-player-count', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    document.body.dataset.playerCount = playerCount;  // gates 2v2-only CSS vars
    updateFrame();
    applyAllIcons();
});
socket.on('player-count-updated', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    document.body.dataset.playerCount = playerCount;  // gates 2v2-only CSS vars
    updateFrame();
    applyAllIcons();
});
