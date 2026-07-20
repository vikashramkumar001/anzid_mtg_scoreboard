// Broadcast L-Frame — break-screen chrome (UNLEASHED / RQ Sydney).
//
// The scene renders UNCONDITIONALLY (this page IS the uvs-unleashed skin):
// socket hydration only stamps body data-attrs for parity with the other
// broadcast pages and must never block or crash the render.
//
// Text content: DEFAULTS below replicate the PSD's own example strings
// verbatim; /data/scene-content/l-frame.json overrides them (404 -> keep
// defaults). `round` is a convenience override: when the JSON supplies a
// round but no full nextUp string, the line becomes "NEXT UP: Round <n>".
//
// NOTE on live wiring: there is no global current-round field on the
// server today (globalData has global-event-number-of-rounds only; the
// per-match `event-round` text lives in control data, not in a global
// room). So the round stays JSON-driven for now — if a
// global-event-current-round field ever lands in features/globalData.js,
// listen to `update-match-global-data` here and map it in.

// ── Scene content ────────────────────────────────────────────────────────────
const DEFAULTS = {
    // PSD layer: "the battle will continue soon" (rendered uppercase via CSS)
    message: 'The battle will continue soon',
    // PSD layer: "NEXT UP: round 5"
    nextUp: 'NEXT UP: Round 5',
};

let content = { ...DEFAULTS };

function render() {
    const statusEl = document.getElementById('l-frame-status');
    const nextUpEl = document.getElementById('l-frame-next-up');
    if (statusEl) statusEl.textContent = content.message || '';
    if (nextUpEl) nextUpEl.textContent = content.nextUp || '';
    // Empty nextUp / message hides the line (blank breaks with no round).
    if (statusEl) statusEl.style.display = content.message ? '' : 'none';
    if (nextUpEl) nextUpEl.style.display = content.nextUp ? '' : 'none';
}
render();

fetch('/data/scene-content/l-frame.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json) return;
        content = { ...content, ...json };
        if (json.round != null && json.nextUp == null) {
            content.nextUp = `NEXT UP: Round ${json.round}`;
        }
        render();
    })
    .catch(() => {});   // no JSON -> defaults already rendered

// ── Entrance motion (unleashed-motion kit) ──────────────────────────────────
// Both lines carry unl-fade-rise in the HTML (status first, NEXT UP +150ms).
// render() only mutates textContent on the same elements, which never
// restarts a CSS animation — but a display:none -> visible toggle would. So
// once the entrance window has passed (0.15s delay + 0.6s run), freeze the
// stage with unl-still: later content changes paint at rest. unlReplay()
// lifts the freeze and re-runs the entrance.
setTimeout(() => {
    document.getElementById('l-frame-stage')?.classList.add('unl-still');
}, 1200);

// ── Socket hydration (body attrs only — never blocks the scene) ─────────────
let currentGame = 'riftbound';
let currentVendor = 'uvs-unleashed';
let currentPlayerCount = '1v1';

function applyBodyAttrs() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;
}
applyBodyAttrs();

if (window.io && window.RoomManager) {
    const socket = io();
    window.roomManager = new RoomManager(socket);

    socket.emit('get-game-selection');
    socket.emit('get-vendor-selection');
    socket.emit('get-player-count');

    socket.on('server-current-game-selection', ({ gameSelection }) => {
        currentGame = gameSelection;
        applyBodyAttrs();
    });
    socket.on('game-selection-updated', ({ gameSelection }) => {
        currentGame = gameSelection;
        applyBodyAttrs();
    });
    socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
        currentVendor = vendorSelection;
        applyBodyAttrs();
    });
    socket.on('vendor-selection-updated', ({ vendorSelection }) => {
        currentVendor = vendorSelection;
        applyBodyAttrs();
    });
    socket.on('server-current-player-count', ({ playerCount }) => {
        currentPlayerCount = playerCount;
        applyBodyAttrs();
    });
    socket.on('player-count-updated', ({ playerCount }) => {
        currentPlayerCount = playerCount;
        applyBodyAttrs();
    });
}
