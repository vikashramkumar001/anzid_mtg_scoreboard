// broadcast-countdown.js — UNLEASHED pre-show countdown scene (riftbound,
// uvs-unleashed, 1v1). The page IS the uvs-unleashed skin and renders
// unconditionally; socket hydration only stamps body data-attrs and must not
// crash if the server never answers.
//
// Timer sources (first match wins; URL param beats the JSON field):
//   until    — target wall-clock time. "HH:MM" / "HH:MM:SS" = local time today;
//              anything with a "T" or date is parsed as ISO.
//   duration — countdown length from page load, "M:SS" / "MM:SS" / "H:MM:SS".
//   display  — static text, no ticking.
// DEFAULTS replicate the PSD's own sample ("23:11" in the Countdown text
// layer) so the truth-overlay comparison is meaningful; override via
// /data/scene-content/countdown.json ({"until": ..., "label": ...}) or
// ?until=HH:MM (&label=...). At zero the timer holds "0:00" — no
// auto-transition.

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

// ── Countdown config ─────────────────────────────────────────────────────────
// PSD sample data verbatim: the Countdown layer reads "23:11". Modeled as a
// duration so the scene ticks out of the box AND first-paints exactly as the
// truth composite.
const DEFAULTS = { duration: '23:11' };

const params = new URLSearchParams(location.search);

// "HH:MM" / "HH:MM:SS" → local time today; otherwise try ISO. null = unparseable.
function parseUntilMs(str) {
    if (!str) return null;
    const m = String(str).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
        const d = new Date();
        d.setHours(+m[1], +m[2], m[3] ? +m[3] : 0, 0);
        return d.getTime();
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.getTime();
}

// "M:SS" / "MM:SS" / "H:MM:SS" (or plain seconds) → milliseconds. null = unparseable.
function parseDurationMs(str) {
    if (!str) return null;
    const parts = String(str).trim().split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN) || parts.length === 0 || parts.length > 3) return null;
    let s = 0;
    for (const p of parts) s = s * 60 + p;
    return s * 1000;
}

// H:MM:SS above an hour, M:SS below (matches the PSD's "23:11"; zero = "0:00").
function formatRemaining(ms) {
    let s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600);
    s -= h * 3600;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const two = n => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}

// ── Timer engine ─────────────────────────────────────────────────────────────
const timerEl = document.getElementById('countdown-timer');
const labelEl = document.getElementById('countdown-label');
let tickHandle = null;

function startCountdown(config) {
    if (tickHandle) {
        clearInterval(tickHandle);
        tickHandle = null;
    }

    // Optional caption between the RQ logo and the timer.
    const label = params.get('label') || config.label;
    if (labelEl) {
        labelEl.textContent = label || '';
        labelEl.classList.toggle('visible', !!label);
    }

    // URL params (as a group) beat the JSON fields: ?display=... must win even
    // when the JSON supplies a higher-priority field like `duration`.
    const urlHasTimer = params.get('until') || params.get('duration') || params.get('display');
    const pick = key => (urlHasTimer ? params.get(key) : config[key]);
    const untilMs = parseUntilMs(pick('until'));
    const durationMs = parseDurationMs(pick('duration'));
    const display = pick('display');

    let endAtMs = null;
    if (untilMs !== null) {
        endAtMs = untilMs;
    } else if (durationMs !== null) {
        endAtMs = Date.now() + durationMs;
    } else if (display) {
        timerEl.textContent = display;      // static — no ticking
        return;
    } else {
        endAtMs = Date.now() + parseDurationMs(DEFAULTS.duration);
    }

    const tick = () => {
        const text = formatRemaining(endAtMs - Date.now());
        if (timerEl.textContent !== text) timerEl.textContent = text;
    };
    tick();
    tickHandle = setInterval(tick, 250);    // holds at "0:00" once it gets there
}

// JSON override mirrors DEFAULTS; 404 / no server → defaults.
fetch('/data/scene-content/countdown.json')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => startCountdown({ ...DEFAULTS, ...(json || {}) }));
