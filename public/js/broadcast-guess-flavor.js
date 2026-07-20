// broadcast-guess-flavor.js — UNLEASHED "Guess the Flavor Text" scene
// (riftbound, uvs-unleashed, 1v1). The page IS the uvs-unleashed skin and
// renders unconditionally; socket hydration only stamps body data-attrs and
// must not crash if the server never answers.
//
// Content: /data/scene-content/guess-flavor.json (404 → DEFAULTS, which
// replicate the PSD's own example verbatim: the Vex, Gloomist alt art
// UNL-232 + its flavor quote "i am the first of many.").
//   quote     — flavor text (quotation marks added automatically; wraps +
//               auto-shrinks for longer quotes)
//   card      — card name, resolved via riftboundCardNames.json when no
//               explicit cardImage is given
//   cardImage — explicit image path (beats `card`; DEFAULTS pin the PSD's
//               UNL-232 alt art, which name-resolution alone wouldn't pick)
//   revealed  — false = cardback (answer hidden), true = show the card
// Keypress 'r' toggles revealed for v1 (3D rotateY flip via the .revealed
// class — see #gf-flipper in the CSS).

// ── Socket hydration (theme attrs only) ──────────────────────────────────────
let currentGame = 'riftbound';
let currentVendor = 'uvs-unleashed';
let currentPlayerCount = '1v1';

function applyBodyAttrs() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;
}

try {
    const socket = io();
    if (typeof RoomManager !== 'undefined') {
        window.roomManager = new RoomManager(socket);
    }

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
} catch (e) {
    console.warn('[GuessFlavor] No socket — rendering standalone', e);
}
applyBodyAttrs();

// ── Content ──────────────────────────────────────────────────────────────────
// PSD example data verbatim: quote text layer `"i am the first of many."`
// paired with the Vex, Gloomist alternate art (card reads UNL • 232/219).
const DEFAULTS = {
    revealed: true,
    quote: 'i am the first of many.',
    card: 'Vex, Gloomist',
    cardImage: '/assets/images/riftbound/cards/UNL-232.png'
};

let sceneData = { ...DEFAULTS };
let cardIndex = null;   // lowercased card name → imageUrl, from riftboundCardNames.json

const quoteEl = document.getElementById('gf-quote');
const slotEl = document.getElementById('gf-card-slot');
const cardEl = document.getElementById('gf-card');

// ── Render ───────────────────────────────────────────────────────────────────
const QUOTE_BASE_PX = 22.84;   // PSD: 20pt x 1.14216 transform
const QUOTE_MIN_PX = 14;
const QUOTE_MAX_H = 60;        // px — quote zone before hitting the box's gold border

function renderQuote() {
    let text = (sceneData.quote || '').trim();
    if (!text) {
        quoteEl.textContent = '';
        return;
    }
    // PSD types the quotation marks into the text layer — add them unless the
    // operator already did.
    if (!/^["“]/.test(text)) text = `"${text}"`;
    quoteEl.textContent = text;

    // Auto-shrink: wrap is free (width 600, centered); step the font down
    // until the block fits the zone under the caption.
    let size = QUOTE_BASE_PX;
    quoteEl.style.fontSize = `${size}px`;
    while (quoteEl.scrollHeight > QUOTE_MAX_H && size > QUOTE_MIN_PX) {
        size -= 0.5;
        quoteEl.style.fontSize = `${size}px`;
    }
}

function resolveCardImage() {
    if (sceneData.cardImage) return sceneData.cardImage;
    const name = (sceneData.card || '').trim().toLowerCase();
    if (name && cardIndex && cardIndex[name]) return cardIndex[name];
    return '';
}

function renderCard() {
    const src = resolveCardImage();
    if (src && cardEl.getAttribute('src') !== src) {
        cardEl.onerror = () => { cardEl.removeAttribute('src'); };   // bg patch = cardback, answer never leaks
        cardEl.src = src;
    }
    slotEl.classList.toggle('revealed', !!sceneData.revealed && !!src);
}

function render() {
    renderQuote();
    renderCard();
}

// ── Reveal toggle ('r') — v1 operator control ────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        sceneData.revealed = !sceneData.revealed;
        renderCard();
    }
});

// ── Card-name index (optional — lets scene-content give a name only) ─────────
fetch('/data/riftbound/riftboundCardNames.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json) return;
        cardIndex = {};
        Object.entries(json).forEach(([name, info]) => {
            if (info && info.imageUrl) cardIndex[name.toLowerCase()] = info.imageUrl;
        });
        renderCard();   // re-resolve a name-only card
    })
    .catch(() => {});

// ── Content override (optional JSON; 404 → defaults) ─────────────────────────
fetch('/data/scene-content/guess-flavor.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => {
        if (json && typeof json === 'object') sceneData = { ...DEFAULTS, ...json };
        render();
    });

render();
