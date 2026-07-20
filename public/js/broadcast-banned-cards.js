// UNLEASHED "Banned Cards" — 7 fixed card slots (4 portrait + 3 landscape
// battlefields) over a fully-baked bg. The page renders its scene
// UNCONDITIONALLY (it IS the uvs-unleashed skin): socket hydration only stamps
// body dataset attrs and must never crash the page if the server / socket.io
// is unavailable.

const CARD_IMAGE_BASE = '/assets/images/riftbound/cards/';
const CARD_FALLBACK = '/assets/images/riftbound/cards/riftbound-card-back.png';

// ── Defaults: the PSD's own example data, verbatim (truth composite). ────────
const DEFAULTS = {
    cards: [
        { name: 'Called Shot',        id: 'SFD-122' },                    // top-left
        { name: 'Draven, Vanquisher', id: 'SFD-020' },                    // bottom-left
        { name: 'Fight or Flight',    id: 'OGN-168' },                    // top-right
        { name: 'Scrapheap',          id: 'OGN-182' },                    // bottom-right
        { name: 'The Dreaming Tree',  id: 'OGN-292', landscape: true },   // center
        { name: 'Obelisk of Power',   id: 'OGN-284', landscape: true },   // bottom-center-left
        { name: "Reaver's Row",       id: 'OGN-285', landscape: true }    // bottom-center-right
    ]
};

let sceneData = DEFAULTS;
let cardIndex = null;   // name (lowercased) → imageUrl, from riftboundCardNames.json

// Slot fill order matches the PSD/truth layout (see CSS for exact coords).
const PORTRAIT_SLOTS = ['bnc-slot-p1', 'bnc-slot-p2', 'bnc-slot-p3', 'bnc-slot-p4'];
const LANDSCAPE_SLOTS = ['bnc-slot-l1', 'bnc-slot-l2', 'bnc-slot-l3'];

function resolveCardImage(entry) {
    if (entry && entry.image) return entry.image;
    if (entry && entry.id) return `${CARD_IMAGE_BASE}${String(entry.id).trim().toUpperCase()}.png`;
    if (entry && entry.name && cardIndex) {
        const hit = cardIndex[entry.name.toLowerCase()];
        if (hit) return hit;
    }
    return CARD_FALLBACK;
}

// Preload so orientation comes from the art itself (battlefields are stored
// landscape, e.g. 1038x744); `landscape: true` is only the hint used when the
// image 404s and the portrait card back stands in.
function loadCard(entry) {
    return new Promise((resolve) => {
        const src = resolveCardImage(entry);
        const img = new Image();
        img.onload = () => resolve({
            entry, src,
            landscape: img.naturalWidth > img.naturalHeight,
            fallback: false
        });
        img.onerror = () => resolve({
            entry,
            src: CARD_FALLBACK,
            landscape: !!entry.landscape,
            fallback: true
        });
        img.src = src;
    });
}

function fillSlots(slotIds, cards, slotIsLandscape) {
    slotIds.forEach((slotId, i) => {
        const slot = document.getElementById(slotId);
        const img = slot.querySelector('img');
        const card = cards[i];
        if (!card) {
            slot.classList.remove('filled');
            img.removeAttribute('src');
            img.classList.remove('bnc-rotated');
            img.style.width = '';
            img.style.height = '';
            return;
        }
        // Portrait stand-in art (card back) rotated into a landscape slot.
        const rotate = slotIsLandscape && card.fallback;
        img.classList.toggle('bnc-rotated', rotate);
        if (rotate) {
            img.style.width = `${slot.clientHeight || 201}px`;
            img.style.height = `${slot.clientWidth || 282}px`;
        } else {
            img.style.width = '';
            img.style.height = '';
        }
        if (img.getAttribute('src') !== card.src) img.src = card.src;
        slot.classList.add('filled');
    });
}

// Entrance (unleashed-motion): the slots carry unl-scale-in + staggered
// --unl-d delays in the HTML; the animation fires when a slot first flips to
// display:block (.filled). After each entrance pass finishes (debounced past
// the 110ms stagger), still the stage so re-renders paint at rest — and since
// unlReplay() strips .unl-still before re-running, this re-arms after every
// replay too.
{
    const stage = document.getElementById('bnc-stage');
    let settleTimer = null;
    stage.addEventListener('animationend', (e) => {
        if (!e.target.classList || !e.target.classList.contains('unl-scale-in')) return;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => stage.classList.add('unl-still'), 150);
    });
}

let renderToken = 0;
function render() {
    const token = ++renderToken;
    const cards = (sceneData.cards || []).filter(c => c && (c.id || c.name || c.image));
    Promise.all(cards.map(loadCard)).then(loaded => {
        if (token !== renderToken) return;   // a newer render superseded this one
        const portraits = loaded.filter(c => !c.landscape);
        const landscapes = loaded.filter(c => c.landscape);
        if (portraits.length > PORTRAIT_SLOTS.length || landscapes.length > LANDSCAPE_SLOTS.length) {
            console.warn('[BannedCards] more cards than slots — extras dropped',
                { portraits: portraits.length, landscapes: landscapes.length });
        }
        fillSlots(PORTRAIT_SLOTS, portraits, false);
        fillSlots(LANDSCAPE_SLOTS, landscapes, true);
    });
}
render();

// ── Content override: /data/scene-content/banned-cards.json holds { cards:
// [{ name, id?, image?, landscape? }, …] }; 404 → defaults. ──────────────────
fetch('/data/scene-content/banned-cards.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json || !Array.isArray(json.cards)) return;
        sceneData = { ...sceneData, ...json };
        render();
    })
    .catch(() => {});

// Card-name → image index (same file master-control uses). Best-effort: lets
// the content JSON reference cards by name alone; entries with an explicit
// `image` or `id` never need it.
fetch('/data/riftbound/riftboundCardNames.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json) return;
        cardIndex = {};
        Object.entries(json).forEach(([cardName, info]) => {
            if (info && info.imageUrl) cardIndex[cardName.toLowerCase()] = info.imageUrl;
        });
        render();
    })
    .catch(() => {});

// ── Socket hydration (body attrs only — rendering never depends on it) ───────
let currentGame = 'riftbound';
let currentVendor = 'uvs-unleashed';
let currentPlayerCount = '1v1';

function applyBodyAttrs() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;
}
applyBodyAttrs();

try {
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
} catch (err) {
    console.warn('[BannedCards] socket unavailable — rendering with defaults', err);
}
