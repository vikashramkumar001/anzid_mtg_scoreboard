// broadcast-schedule.js — UNLEASHED event-schedule scene (riftbound,
// uvs-unleashed, 1v1). Supersedes /event-info/schedule for the uvs skin.
// The page IS the uvs-unleashed skin and renders unconditionally; socket
// hydration only stamps body data-attrs and must not crash if the server
// never answers.
//
// DEFAULTS replicate the PSD's own sample strings verbatim (RFB_Schedule_UNL:
// times, round text, kicker, footnote) so the truth-overlay comparison is
// meaningful; override via /data/scene-content/schedule.json, which mirrors
// this shape (404 / no server → defaults). The SATURDAY/SUNDAY headline art,
// plates, dividers, rail and footer are baked into the bg PNG — only these
// nine lines are dynamic.

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

// ── Schedule content ─────────────────────────────────────────────────────────
// PSD sample data verbatim (all-caps rendering comes from CSS text-transform,
// matching the PSD's fontCaps setting on lowercase source strings).
const DEFAULTS = {
    saturday: {
        timeLeft: '10am aest',
        timeRight: '5pm pt',
        box1: '8 rounds of swiss'
    },
    sunday: {
        timeLeft: '10am aest',
        timeRight: '5pm pt',
        kicker: 'championship',
        box1: '5 rounds of swiss',
        box2: 'top 8',
        note: 'single elimination'
    }
};

// element id → content getter (missing/empty values blank the slot so a
// per-event JSON can e.g. drop the footnote without leaving stale copy)
const SLOTS = {
    'sat-time-left':  c => c.saturday.timeLeft,
    'sat-time-right': c => c.saturday.timeRight,
    'sat-box1':       c => c.saturday.box1,
    'sun-time-left':  c => c.sunday.timeLeft,
    'sun-time-right': c => c.sunday.timeRight,
    'sun-kicker':     c => c.sunday.kicker,
    'sun-box1':       c => c.sunday.box1,
    'sun-box2':       c => c.sunday.box2,
    'sun-note':       c => c.sunday.note
};

function renderSchedule(content) {
    for (const [id, get] of Object.entries(SLOTS)) {
        const el = document.getElementById(id);
        if (!el) continue;
        const value = get(content);
        el.textContent = (value == null) ? '' : String(value);
    }
}

// JSON override mirrors DEFAULTS (per-day shallow merge); 404 → defaults.
fetch('/data/scene-content/schedule.json')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => {
        const content = {
            saturday: { ...DEFAULTS.saturday, ...((json && json.saturday) || {}) },
            sunday:   { ...DEFAULTS.sunday,   ...((json && json.sunday)   || {}) }
        };
        renderSchedule(content);
    });
