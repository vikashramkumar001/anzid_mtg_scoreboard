// broadcast-tournament-format.js — UNLEASHED tournament-format scene
// (riftbound, uvs-unleashed, 1v1). The page IS the uvs-unleashed skin and
// renders unconditionally; socket hydration only stamps body data-attrs and
// must not crash if the server never answers.
//
// All chrome is baked into the bg PNG; the DOM carries only the copy:
//   format          — big headline under the FORMAT kicker
//   day1 / day2     — the two panel columns (title straddles the panel edge;
//                     headline = pink emphasis line, subline/note = white)
// DEFAULTS replicate the PSD's own sample text verbatim so the truth-overlay
// comparison is meaningful; override via
// /data/scene-content/tournament-format.json (mirrors DEFAULTS; empty string
// blanks a slot, missing key falls back to the default).

// ── Socket hydration (theme attrs only) ──────────────────────────────────────
const socket = (typeof io !== 'undefined') ? io() : null;
if (socket && typeof RoomManager !== 'undefined') {
    window.roomManager = new RoomManager(socket);
}

let currentGame = 'riftbound';
let currentVendor = 'uvs-unleashed';
let currentPlayerCount = '1v1';

function applyBodyAttrs() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;
}

if (socket) {
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
applyBodyAttrs();

// ── Scene content ────────────────────────────────────────────────────────────
// PSD sample data VERBATIM (mixed case in the source layers; CSS uppercases).
const DEFAULTS = {
    format: 'constructed',
    day1: {
        title: 'DAY one',
        headline: 'SWISS PLAY',
        subline: 'eight rounds',
        note: '6 wins to advance'
    },
    day2: {
        title: 'DAY TWO',
        headline: 'SWISS PLAY',
        subline: 'five rounds',
        headline2: 'top 8',
        subline2: 'single elimination'
    }
};

// Slot → element id. A slot set to '' (or a missing element) simply renders
// nothing — the bg panel stays clean behind it.
const SLOTS = [
    ['tf-format',         c => c.format],
    ['tf-day1-title',     c => c.day1.title],
    ['tf-day1-headline',  c => c.day1.headline],
    ['tf-day1-subline',   c => c.day1.subline],
    ['tf-day1-note',      c => c.day1.note],
    ['tf-day2-title',     c => c.day2.title],
    ['tf-day2-headline',  c => c.day2.headline],
    ['tf-day2-subline',   c => c.day2.subline],
    ['tf-day2-headline2', c => c.day2.headline2],
    ['tf-day2-subline2',  c => c.day2.subline2]
];

function render(content) {
    for (const [id, pick] of SLOTS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const value = pick(content);
        el.textContent = (value === undefined || value === null) ? '' : String(value);
    }
}

// JSON override mirrors DEFAULTS (per-day shallow merge); 404 / no server →
// defaults, which are already in the static HTML — render() just re-asserts.
fetch('/data/scene-content/tournament-format.json')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => {
        const j = json || {};
        render({
            ...DEFAULTS,
            ...j,
            day1: { ...DEFAULTS.day1, ...(j.day1 || {}) },
            day2: { ...DEFAULTS.day2, ...(j.day2 || {}) }
        });
    });
