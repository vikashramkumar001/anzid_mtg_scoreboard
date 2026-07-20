// broadcast-thanks.js — UNLEASHED "Thanks for Watching" end-of-show scene
// (riftbound, uvs-unleashed, 1v1). The page IS the uvs-unleashed skin and
// renders unconditionally; socket hydration only stamps body data-attrs and
// must not crash if the server never answers.
//
// Everything static is baked into the bg PNG. The only dynamic content is the
// two upcoming-event tiles (logo image + date line). DEFAULTS replicate the
// PSD's own sample events (RQ Vancouver "MAY 29 - 31" / RQ Utrecht
// "JUN. 12 - 14") so the truth-overlay comparison is meaningful; override via
// /data/scene-content/thanks.json ({ "events": [{ "logo", "date" }, ...] }).

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

// ── Upcoming events ──────────────────────────────────────────────────────────
// PSD sample data verbatim (layer names "may 29 - 31" / "jun. 12 - 14",
// rendered uppercase; RQ Vancouver / RQ Utrecht logo layers exported as the
// placeholder assets).
const DEFAULTS = {
    events: [
        {
            logo: '/assets/images/riftbound/thanks/riftbound-thanks-logo-vancouver-uvs-unleashed-1v1.png',
            date: 'MAY 29 - 31'
        },
        {
            logo: '/assets/images/riftbound/thanks/riftbound-thanks-logo-utrecht-uvs-unleashed-1v1.png',
            date: 'JUN. 12 - 14'
        }
    ]
};

function renderEvents(config) {
    const events = (Array.isArray(config.events) && config.events.length)
        ? config.events
        : DEFAULTS.events;

    for (let i = 0; i < 2; i++) {
        const tile = document.getElementById(`thanks-event-${i + 1}`);
        if (!tile) continue;
        const ev = events[i];
        // Fewer events than tiles → hide the empty tile's contents (the navy
        // panel + QR stay, baked in the bg).
        tile.style.visibility = ev ? 'visible' : 'hidden';
        if (!ev) continue;

        const logoEl = tile.querySelector('.thanks-event-logo');
        const dateEl = tile.querySelector('.thanks-event-date');
        if (logoEl) {
            const src = ev.logo || '';
            logoEl.onerror = () => { logoEl.style.visibility = 'hidden'; };
            logoEl.onload = () => { logoEl.style.visibility = 'visible'; };
            if (src) {
                if (logoEl.getAttribute('src') !== src) logoEl.src = src;
            } else {
                logoEl.style.visibility = 'hidden';
            }
        }
        if (dateEl) dateEl.textContent = ev.date || '';
    }
}

// JSON override mirrors DEFAULTS; 404 / no server → defaults.
fetch('/data/scene-content/thanks.json')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => renderEvents({ ...DEFAULTS, ...(json || {}) }));
