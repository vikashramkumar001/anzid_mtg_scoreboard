// broadcast-event-winners.js — UNLEASHED "Event Winners" scene (riftbound,
// uvs-unleashed, 1v1): Sydney Top 2 champion/finalist board. The page IS the
// uvs-unleashed skin and renders unconditionally; socket hydration only stamps
// body data-attrs and must not crash if the server never answers.
//
// DEFAULTS replicate the PSD's own example data verbatim (handles alanzq1 /
// sebiq, legend lines "ezreal, prodigal explorer" / "miss fortune, bounty
// hunter" — yes, the designer's sample cards are Vex/Ivern while the legend
// lines name Ezreal/Miss Fortune; we reproduce that faithfully so the
// truth-overlay comparison fuses). Override via
// /data/scene-content/event-winners.json (404 → defaults).
//
// Per-side JSON fields:
//   handle       — player handle (rendered uppercase)
//   legend       — "legend, title" line (rendered uppercase)
//   legendCard   — card id ("UNL-232") or absolute path; top card slot
//   championCard — card id or absolute path; bottom card slot
//   photo        — optional per-event photo URL. Placeholder exports carry the
//                  PSD's baked shadow/fade; custom photos get a CSS
//                  approximation via the .ew-custom-photo class.

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
// PSD example data verbatim (see header comment).
const DEFAULTS = {
    champion: {
        handle: 'alanzq1',
        legend: 'ezreal, prodigal explorer',
        legendCard: 'UNL-232',      // Vex, "Gloomist" (PSD sample)
        championCard: 'UNL-150',    // Vex champion unit (PSD sample)
        photo: ''
    },
    finalist: {
        handle: 'sebiq',
        legend: 'miss fortune, bounty hunter',
        legendCard: 'UNL-195',      // Ivern, "Green Father" (PSD sample)
        championCard: 'UNL-051',    // Ivern champion unit (PSD sample)
        photo: ''
    }
};

const PLACEHOLDER_PHOTOS = {
    champion: '/assets/images/riftbound/event-winners/riftbound-event-winners-photo-champion-uvs-unleashed-1v1.png',
    finalist: '/assets/images/riftbound/event-winners/riftbound-event-winners-photo-finalist-uvs-unleashed-1v1.png'
};

// Card ids resolve through the shared riftbound card asset folder; absolute
// paths pass through untouched (same convention as the deck displays).
function cardSrc(value) {
    if (!value) return '';
    return value.startsWith('/') ? value : `/assets/images/riftbound/cards/${value}.png`;
}

function setCard(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const src = cardSrc(value);
    if (src) el.src = src;
}

function setPhoto(id, side, sideKey) {
    const el = document.getElementById(id);
    if (!el) return;
    if (side.photo) {
        el.classList.add('ew-custom-photo');
        el.onerror = () => {                      // bad URL → fall back to placeholder
            el.onerror = null;
            el.classList.remove('ew-custom-photo');
            el.src = PLACEHOLDER_PHOTOS[sideKey];
        };
        el.src = side.photo;
    } else {
        el.onerror = null;
        el.classList.remove('ew-custom-photo');
        el.src = PLACEHOLDER_PHOTOS[sideKey];
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '';
}

function render(content) {
    const champ = { ...DEFAULTS.champion, ...(content.champion || {}) };
    const final = { ...DEFAULTS.finalist, ...(content.finalist || {}) };

    setText('ew-champ-handle', champ.handle);
    setText('ew-champ-legend-name', champ.legend);
    setText('ew-final-handle', final.handle);
    setText('ew-final-legend-name', final.legend);

    setCard('ew-card-champ-legend', champ.legendCard);
    setCard('ew-card-champ-unit', champ.championCard);
    setCard('ew-card-final-legend', final.legendCard);
    setCard('ew-card-final-unit', final.championCard);

    setPhoto('ew-photo-champion', champ, 'champion');
    setPhoto('ew-photo-finalist', final, 'finalist');
}

// JSON override mirrors DEFAULTS; 404 / no server → defaults.
fetch('/data/scene-content/event-winners.json')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => render(json || DEFAULTS));
