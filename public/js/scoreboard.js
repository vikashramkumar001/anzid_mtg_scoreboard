// /scoreboard/:matchID/:variant — per-match scene page.
//   (also accepts /broadcast/round/scoreboard/:matchID/:variant for backward compat)
//
// TODAY: Renders the vendor-specific frame PNG and populates overlay DOM with
// player names + team life from `scoreboard-{N}-saved-state`. Overlay visibility
// is CSS-driven via vendor-config custom properties (see public/js/vendor-config.js
// flyquest block). No JS vendor checks — other vendors see the frame PNG only.
//
// DEFERRED: Player icons. DOM stubs present (#player-1-icon .. #player-4-icon)
// but always hidden (--sb-icon-opacity defaults to 0). When icons are wired,
// this JS sets .src on each img and flyquest's vendor-config sets the opacity
// var to 1. User confirmed icons are pinned for now.

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

// ── Match-data binding (mirrors timer.js:20 pattern) ──────────────────────
// Server emits `scoreboard-{N}-saved-state` whenever the operator saves from
// control.html. Payload shape: { round_id, match_id, data: {...fields...} }.
socket.on(`scoreboard-${matchNum}-saved-state`, (payload) => {
    const data = payload && payload.data;
    if (!data) return;
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
    updateFrame();
});
socket.on('player-count-updated', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    updateFrame();
});
