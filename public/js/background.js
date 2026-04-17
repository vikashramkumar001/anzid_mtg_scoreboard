const socket = io();
window.roomManager = new RoomManager(socket);

// Parse scene from URL: /background/{identifier}
// This page now handles *only* intermission/branding scenes (starting-soon,
// be-right-back, ending, schedule, head-to-head, commentators). Each scene
// maps to a dedicated subfolder under /assets/images/{game}/ (PNG) and
// /assets/animations/{game}/ (MP4). Video is optional; missing MP4 → PNG.
//
// The old `/background/match-*` URLs moved to `/scoreboard/:matchID/:variant`
// because some vendors (e.g. Flyquest 2v2) need live scoreboard data on top
// of the frame PNG. Hitting `/background/match-*` now shows a blank canvas
// and a console warning telling the operator to re-point the OBS source.
const pathSegments = window.location.pathname.split('/');
const scene = pathSegments[2] || '';

// URL scene → { folder, filename } under /assets/{images|animations}/{game}/.
// Filename is the stem (no extension, no vendor/playerCount suffix — those
// get appended by vc.getAssetPath).
//
// Examples for game=riftbound, vendor=tes, playerCount=1v1:
//   /background/head-to-head  → /head-to-head/riftbound-head-to-head-frame-tes-1v1.png
//   /background/commentators  → /commentator/riftbound-commentator-frame-tes-1v1.png
//   /background/starting-soon → /event-info/riftbound-starting-soon-tes-1v1.png
//   (.mp4 animations live under the matching path in /assets/animations/.)
function resolveSceneParts(s, game) {
    if (s === 'head-to-head') return { folder: 'head-to-head', filename: `${game}-head-to-head-frame` };
    if (s === 'commentators') return { folder: 'commentator',  filename: `${game}-commentator-frame` };
    // event-info scenes: starting-soon, be-right-back, ending, schedule
    // (and any future intermission scene — defaults here so adding a new
    // URL just means dropping an asset in the event-info folder).
    return { folder: 'event-info', filename: `${game}-${s}` };
}

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

function updateBackground() {
    if (!scene) {
        console.warn('[Background] No scene identifier in URL:', window.location.pathname);
        return;
    }
    // Catch stale OBS sources still pointed at the deprecated match-* URLs.
    if (scene.startsWith('match-')) {
        const variant = scene.replace(/^match-/, '');
        console.warn(
            `[Background] /background/match-* moved to /scoreboard/matchN/${variant} ` +
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
    console.log('[Background] Scene:', scene, '→', pngPath);

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
                console.log('[Background] Video:', videoPath);
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

// Request initial state from server on connect
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');

// Listen for selection changes and re-render
socket.on('server-current-game-selection', ({ gameSelection }) => {
    currentGame = gameSelection;
    updateBackground();
});
socket.on('game-selection-updated', ({ gameSelection }) => {
    currentGame = gameSelection;
    updateBackground();
});
socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    updateBackground();
});
socket.on('vendor-selection-updated', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    updateBackground();
});
socket.on('server-current-player-count', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    updateBackground();
});
socket.on('player-count-updated', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    updateBackground();
});
