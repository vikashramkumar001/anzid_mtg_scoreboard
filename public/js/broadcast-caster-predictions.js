// UNLEASHED "Caster Predictions" — four caster columns, each with a photo,
// two overlapping predicted-card thumbs, and a handle + predicted-legend line.
//
// The page renders its scene UNCONDITIONALLY (it IS the uvs-unleashed skin):
// socket hydration only stamps body dataset attrs and must never crash the
// page if the server / socket.io is unavailable.

const ASSET_DIR = '/assets/images/riftbound/caster-predictions';
const CARD_FALLBACK = '/assets/images/riftbound/cards/riftbound-card-back.png';

// ── Column geometry (PSD "Rectangle 10 copy 9" panels; stage coords) ─────────
const COLUMNS = [
    { x: 267, y: -2, w: 349, h: 1083 },
    { x: 613, y: -2, w: 348, h: 1083 },
    { x: 959, y: -2, w: 348, h: 1083 },
    { x: 1304, y: -2, w: 349, h: 1083 }
];
// Card thumbs (PSD "Card 1"/"Card 2" bounds): big 144x202, small 115x162,
// small overlaps the big card's lower right.
const CARD_BIG = [{ x: 346, y: 543 }, { x: 693, y: 543 }, { x: 1039, y: 543 }, { x: 1385, y: 543 }];
const CARD_SMALL = [{ x: 421, y: 603 }, { x: 767, y: 603 }, { x: 1114, y: 603 }, { x: 1459, y: 603 }];

// ── Defaults: the PSD's own example data, verbatim (layer text + card slots).
// NOTE: public/_truth/caster-predictions.png is a STALE composite of an older
// save (MEDIC / LEONARD KÖNIG / JAMES O'LEARY / AMY WOSLEY predicting Sivir /
// Kai'Sa / Draven / Fiora); the shipped PSD's current layer data is this set. ─
const DEFAULTS = {
    casters: [
        {
            handle: 'steph',
            legend: 'Diana, Scorn of the Moon',
            photo: `${ASSET_DIR}/riftbound-caster-predictions-caster-steph-uvs-unleashed-1v1.png`,
            photoLeft: 80, photoTop: 75,
            cards: [
                { name: 'Diana, Scorn of the Moon', image: '/assets/images/riftbound/cards/UNL-197.png' },
                { name: 'Diana, Lunari', image: '/assets/images/riftbound/cards/UNL-079.png' }
            ]
        },
        {
            handle: 'logan',
            legend: 'diana, scorn of the moon',
            photo: `${ASSET_DIR}/riftbound-caster-predictions-caster-logan-uvs-unleashed-1v1.png`,
            photoLeft: 464, photoTop: 79,
            cards: [
                { name: 'Diana, Scorn of the Moon', image: '/assets/images/riftbound/cards/UNL-197.png' },
                { name: 'Diana, Lunari', image: '/assets/images/riftbound/cards/UNL-079.png' }
            ]
        },
        {
            handle: 'profound rice',
            legend: 'Annie, Dark Child',
            photo: `${ASSET_DIR}/riftbound-caster-predictions-caster-naomi-uvs-unleashed-1v1.png`,
            photoLeft: 855, photoTop: 78,
            cards: [
                { name: 'Annie, Dark Child - Starter', image: '/assets/images/riftbound/cards/OGS-017.png' },
                { name: 'Annie, Stubborn', image: '/assets/images/riftbound/cards/OGS-010.png' }
            ]
        },
        {
            handle: 'Pastrytime',
            legend: 'LeBlanc, Deceiver',
            photo: `${ASSET_DIR}/riftbound-caster-predictions-caster-julian-uvs-unleashed-1v1.png`,
            photoLeft: 1059, photoTop: 60,
            cards: [
                { name: 'LeBlanc, Deceiver', image: '/assets/images/riftbound/cards/UNL-199.png' },
                { name: 'LeBlanc, Fragmented', image: '/assets/images/riftbound/cards/UNL-172.png' }
            ]
        }
    ]
};

let sceneData = DEFAULTS;
let cardIndex = null;   // name (lowercased) → imageUrl, from riftboundCardNames.json

function resolveCardImage(entry) {
    if (entry && entry.image) return entry.image;
    if (entry && entry.name && cardIndex) {
        const hit = cardIndex[entry.name.toLowerCase()];
        if (hit) return hit;
    }
    return CARD_FALLBACK;
}

function makeCardImg(className, pos, entry, delay) {
    const img = document.createElement('img');
    img.className = className;
    img.style.left = `${pos.x}px`;
    img.style.top = `${pos.y}px`;
    img.style.setProperty('--unl-d', unlDelay(delay));
    img.alt = (entry && entry.name) || '';
    img.onerror = () => { img.onerror = null; img.src = CARD_FALLBACK; };
    img.src = resolveCardImage(entry);
    return img;
}

// ── Entrance choreography (unleashed-motion kit) ─────────────────────────────
// Columns enter L→R 150ms apart; within a column: photo fades, then the two
// card thumbs scale in (80ms apart), then handle + legend rise (80ms apart).
// Last element starts at 0.81s → fully at rest by ~1.4s.
const UNL_COL_STEP = 0.15;
function unlDelay(s) { return `${Math.round(s * 1000) / 1000}s`; }

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
    const colsEl = document.getElementById('cp-columns');
    const cardsEl = document.getElementById('cp-cards');
    const namesEl = document.getElementById('cp-names');
    colsEl.innerHTML = '';
    cardsEl.innerHTML = '';
    namesEl.innerHTML = '';

    (sceneData.casters || []).slice(0, 4).forEach((caster, i) => {
        const col = COLUMNS[i];
        const base = i * UNL_COL_STEP;   // per-column L→R stagger

        // photo, clipped by the column container (PSD panel bounds)
        const colEl = document.createElement('div');
        colEl.className = 'cp-col';
        colEl.style.left = `${col.x}px`;
        colEl.style.top = `${col.y}px`;
        colEl.style.width = `${col.w}px`;
        colEl.style.height = `${col.h}px`;
        if (caster.photo) {
            const photo = document.createElement('img');
            photo.className = 'cp-photo unl-fade';
            photo.style.setProperty('--unl-d', unlDelay(base));
            photo.style.left = `${(caster.photoLeft != null ? caster.photoLeft : col.x) - col.x}px`;
            photo.style.top = `${(caster.photoTop != null ? caster.photoTop : 75) - col.y}px`;
            photo.alt = caster.handle || '';
            photo.onerror = () => { photo.onerror = null; photo.remove(); };
            photo.src = caster.photo;
            colEl.appendChild(photo);
        }
        colsEl.appendChild(colEl);

        // predicted-card thumbs (big behind, small in front)
        const cards = caster.cards || [];
        if (cards[0]) cardsEl.appendChild(makeCardImg('cp-card-big unl-scale-in', CARD_BIG[i], cards[0], base + 0.12));
        if (cards[1]) cardsEl.appendChild(makeCardImg('cp-card-small unl-scale-in', CARD_SMALL[i], cards[1], base + 0.20));

        // handle + predicted legend, centered on the column
        const handle = document.createElement('div');
        handle.className = 'cp-handle unl-fade-rise';
        handle.style.setProperty('--unl-d', unlDelay(base + 0.28));
        handle.style.left = `${col.x}px`;
        handle.style.width = `${col.w}px`;
        handle.textContent = caster.handle || '';
        const legend = document.createElement('div');
        legend.className = 'cp-legend unl-fade-rise';
        legend.style.setProperty('--unl-d', unlDelay(base + 0.36));
        legend.style.left = `${col.x}px`;
        legend.style.width = `${col.w}px`;
        legend.textContent = caster.legend || '';
        namesEl.appendChild(handle);
        namesEl.appendChild(legend);
    });
}
render();

// Once the load entrance has finished, freeze the data containers so later
// re-renders (slow content/card-index fetches, live edits) paint at rest.
// The two boot-time fetches usually resolve inside this window and simply
// replay the entrance with the real content. unlReplay() clears .unl-still.
setTimeout(() => {
    ['cp-columns', 'cp-cards', 'cp-names'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('unl-still');
    });
}, 1700);

// ── Content override: /data/scene-content/caster-predictions.json mirrors
// DEFAULTS ({casters:[{handle, legend, photo, photoLeft, photoTop, cards}]});
// 404 → defaults. ────────────────────────────────────────────────────────────
fetch('/data/scene-content/caster-predictions.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json || !Array.isArray(json.casters) || json.casters.length === 0) return;
        sceneData = json;
        render();
    })
    .catch(() => {});

// Card-name → image index (same file master-control uses). Best-effort: lets
// the content JSON reference predicted cards by name alone; entries with an
// explicit `image` never need it.
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
    console.warn('[CasterPredictions] socket unavailable — rendering with defaults', err);
}
