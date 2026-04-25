const socket = io();
window.roomManager = new RoomManager(socket);

// Parse scene from URL: /event-info/{identifier}
// This page handles intermission/branding scenes (starting-soon,
// be-right-back, ending, schedule, prizes, head-to-head, commentators,
// pack-opening, casters-1, casters-2, etc.). Each scene maps to a
// dedicated subfolder under /assets/images/{game}/ (PNG) and
// /assets/animations/{game}/ (MP4). Video is optional; missing MP4 → PNG.
//
// Match-specific scenes (overview, hand-left/right, player-left/right)
// live at /scoreboard/:matchID/:variant instead — they need live match
// data overlays (names, life totals, game-wins pips) on top of the frame
// PNG, which this page doesn't render. Stray `match-*` scene slugs here
// trigger a console warning pointing operators at the correct path.
//
// History: this page used to live at /background/:identifier before the
// /event-info/ rename; the old prefix was removed as a hard break so stale
// OBS sources surface immediately instead of silently drifting.
const pathSegments = window.location.pathname.split('/');
const scene = pathSegments[2] || '';

// Stamp the scene slug on <body> once at load so CSS can branch per-scene
// (e.g. `body[data-scene="pack-opening"] .ei-text { ... }`). Scene never
// changes for a given page load — OBS re-navigates to switch scenes.
document.body.dataset.scene = scene;

// URL scene → { folder, filename } under /assets/{images|animations}/{game}/.
// Filename is the stem (no extension, no vendor/playerCount suffix — those
// get appended by vc.getAssetPath).
//
// Examples for game=riftbound, vendor=tes, playerCount=1v1:
//   /event-info/head-to-head  → /head-to-head/riftbound-head-to-head-frame-tes-1v1.png
//   /event-info/commentators  → /commentator/riftbound-commentator-frame-tes-1v1.png
//   /event-info/starting-soon → /event-info/riftbound-starting-soon-tes-1v1.png
//   (.mp4 animations live under the matching path in /assets/animations/.)
function resolveSceneParts(s, game) {
    if (s === 'head-to-head') return { folder: 'head-to-head', filename: `${game}-head-to-head-frame` };
    if (s === 'commentators') return { folder: 'commentator',  filename: `${game}-commentator-frame` };
    // event-info scenes: starting-soon, be-right-back, ending, schedule
    // (and any future intermission scene — defaults here so adding a new
    // URL just means dropping an asset in the event-info folder).
    return { folder: 'event-info', filename: `${game}-${s}` };
}

// ── Scene-keyed L3 overlay registry ─────────────────────────────────────
// Scene slug → function returning HTML for #event-info-overlay. The
// renderer receives the current globalData so dynamic scenes can read live
// event-info fields (global-event-name, global-event-current-round,
// global-commentator-*, etc.). Static scenes ignore the argument. To add
// a new overlay: register the scene here, add a CSS block in
// event-info.css gated by `body[data-scene="..."]`, and (optionally) add
// per-vendor positioning vars in vendor-config.js. No new files, no new
// routes. Scenes without an entry render PNG only (backward-compat).
const SCENE_OVERLAYS = {
    'pack-opening': () => `<div class="ei-text">Pack Opening</div>`,
};

// Cached most-recent globalData so vendor/playerCount commits can re-render
// the overlay without waiting for the next socket push.
let latestGlobalData = {};

function renderOverlay() {
    const overlay = document.getElementById('event-info-overlay');
    if (!overlay) return;
    const renderer = SCENE_OVERLAYS[scene];
    overlay.innerHTML = renderer ? renderer(latestGlobalData) : '';
}

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

function updateBackground() {
    if (!scene) {
        console.warn('[EventInfo] No scene identifier in URL:', window.location.pathname);
        return;
    }
    // Catch stale OBS sources still pointed at the deprecated match-* URLs.
    if (scene.startsWith('match-')) {
        const variant = scene.replace(/^match-/, '');
        console.warn(
            `[EventInfo] match-* scenes live at /scoreboard/matchN/${variant}, not on /event-info/ ` +
            `— update your OBS source (defaulting to match1 would still be wrong for multi-match layouts).`
        );
        return;
    }
    const vc = window.VENDOR_CONFIG;
    const bgEl = document.getElementById('background');
    const videoEl = document.getElementById('background-video');

    // ── PNG (always applied — acts as fallback when MP4 is missing) ─────
    const { folder, filename } = resolveSceneParts(scene, currentGame);
    const pngBase = `/assets/images/${currentGame}/${folder}/${filename}.png`;
    const pngPath = vc ? vc.getAssetPath(pngBase, currentVendor, currentPlayerCount) : pngBase;
    bgEl.style.backgroundImage = `url("${pngPath}")`;
    console.log('[EventInfo] Scene:', scene, '→', pngPath);

    // ── MP4 (optional replacement) ──────────────────────────────────────
    if (!videoEl) return;
    const videoBase = `/assets/animations/${currentGame}/${folder}/${filename}.mp4`;
    const videoPath = vc ? vc.getAssetPath(videoBase, currentVendor, currentPlayerCount) : videoBase;
    fetch(videoPath, { method: 'HEAD' })
        .then(r => {
            if (r.ok) {
                videoEl.src = videoPath;
                videoEl.load();
                videoEl.play().catch(() => {});
                console.log('[EventInfo] Video:', videoPath);
            } else {
                videoEl.removeAttribute('src');
                videoEl.load();
            }
        })
        .catch(() => {
            videoEl.removeAttribute('src');
            videoEl.load();
        });
}

// ── Vendor-config overrides ─────────────────────────────────────────────
// Apply the current game/vendor's CSS custom properties to :root, and
// mirror game/vendor/playerCount onto <body> data-attributes so CSS can
// scope overlay positioning per combo. Pattern borrowed from
// commentator-lower-third.js:157-209 — simplified here because event-info
// pages have no per-game DOM to toggle (all scenes are a single PNG + a
// single overlay container). Bg-image overrides go through vc.getAssetPath
// so per-vendor/playerCount asset suffixes resolve correctly.
function updateTheme() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;

    const vc = window.VENDOR_CONFIG;
    if (!vc) return;
    vc.getAllOverrideProperties().forEach(prop => {
        document.documentElement.style.removeProperty(prop);
    });
    const overrides = vc.getOverrides(currentGame, currentVendor);
    Object.entries(overrides).forEach(([prop, value]) => {
        if (prop.endsWith('-bg-image') && value.includes('/assets/')) {
            const match = value.match(/url\(['"]?(.+?)['"]?\)/);
            if (match) {
                const resolved = vc.getAssetPath(match[1], currentVendor, currentPlayerCount);
                value = `url('${resolved}')`;
            }
        }
        document.documentElement.style.setProperty(prop, value);
    });
}

// Convenience: every selection-change handler needs to refresh the PNG,
// the CSS vars, and the overlay together. Keep them in lockstep so vendor
// switches don't leave the overlay positioned against the old frame.
function rerender() {
    updateBackground();
    updateTheme();
    renderOverlay();
}

// Request initial state from server on connect
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('get-match-global-data');

// Initial render — static scenes (pack-opening) don't need to wait for
// globalData to render their overlay text.
renderOverlay();

// Listen for selection changes and re-render
socket.on('server-current-game-selection', ({ gameSelection }) => {
    currentGame = gameSelection;
    rerender();
});
socket.on('game-selection-updated', ({ gameSelection }) => {
    currentGame = gameSelection;
    rerender();
});
socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    rerender();
});
socket.on('vendor-selection-updated', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    rerender();
});
socket.on('server-current-player-count', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    rerender();
});
socket.on('player-count-updated', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    rerender();
});

// Live event-info fields for dynamic overlay scenes. Static scenes
// (pack-opening) ignore the payload; the subscription is wired now so
// future scenes that read globalData don't need new plumbing.
socket.on('update-match-global-data', (data) => {
    latestGlobalData = data?.globalData || {};
    renderOverlay();
});
