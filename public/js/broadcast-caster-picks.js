// Caster Picks — UNLEASHED (RQ Sydney) broadcast scene.
// 4 caster quadrants (2 left, 2 right), each = caster photo at the outer edge
// + 2 card picks toward center. Center UNLEASHED logo, leaf dividers and the
// footer are baked into the frame; the bg is the designer's flattened
// composite (incl. the event's caster photos — see photo note below).
// The page IS the uvs-unleashed skin and renders unconditionally; socket
// hydration only stamps body data-attrs and must never block/crash rendering.

const CARD_FALLBACK = '/assets/images/riftbound/cards/riftbound-card-back.png';

// ── Card slot geometry (exact PSD bounds, one entry per slot) ───────────────
// Quadrant order: top-left, top-right, bottom-left, bottom-right; two slots
// each, inner-edge oriented (photos live at the outer screen edges).
const CARD_SLOTS = [
    [ { x: 395,  y: 107, w: 197, h: 276 }, { x: 629,  y: 107, w: 197, h: 276 } ],  // top-left
    [ { x: 1099, y: 107, w: 198, h: 276 }, { x: 1331, y: 107, w: 198, h: 278 } ],  // top-right
    [ { x: 395,  y: 599, w: 198, h: 277 }, { x: 626,  y: 598, w: 199, h: 278 } ],  // bottom-left
    [ { x: 1099, y: 598, w: 198, h: 276 }, { x: 1331, y: 598, w: 198, h: 278 } ]   // bottom-right
];

// ── Photo slot geometry (native bounds of the PSD layer extracts) ───────────
// The bg composite's baked photos are a STALE take — the current PSD photo
// layers (regenerated truth) are the exported assets below, so the defaults
// render them as DOM imgs over the bg. `z` mirrors the PSD composite's
// stacking (verified against the regenerated truth): Julian draws OVER
// Logan on the left edge, Steph draws OVER Naomi on the right edge.
// Exported photo assets (override per event via scene-content `photo`):
//   /assets/images/riftbound/caster-picks/riftbound-caster-picks-photo-logan-uvs-unleashed-1v1.png   (-102,27  553x872)
//   /assets/images/riftbound/caster-picks/riftbound-caster-picks-photo-julian-uvs-unleashed-1v1.png  (-156,509 650x1091)
//   /assets/images/riftbound/caster-picks/riftbound-caster-picks-photo-naomi-uvs-unleashed-1v1.png   (1450,22  520x1058)
//   /assets/images/riftbound/caster-picks/riftbound-caster-picks-photo-steph-uvs-unleashed-1v1.png   (1448,507 522x928)
// `clipY`: the top photos are MASKED at the horizontal gold divider line in
// the PSD (y≈490) — the semi-transparent glow band below the line shows the
// scene bg, never the photo. DOM imgs clip there to match.
const PHOTO_SLOTS = [
    { x: -102, y: 27,  w: 553, h: 872,  z: 2, clipY: 490 },   // top-left  (Logan — under Julian)
    { x: 1450, y: 22,  w: 520, h: 1058, z: 1, clipY: 490 },   // top-right (Naomi — under Steph)
    { x: -156, y: 509, w: 650, h: 1091, z: 3 },               // bottom-left  (Julian)
    { x: 1448, y: 507, w: 522, h: 928,  z: 2 }                // bottom-right (Steph)
];
const PHOTO_BASE = '/assets/images/riftbound/caster-picks/riftbound-caster-picks-photo-';
const PHOTO_DEFAULTS = [
    `${PHOTO_BASE}logan-uvs-unleashed-1v1.png`,
    `${PHOTO_BASE}naomi-uvs-unleashed-1v1.png`,
    `${PHOTO_BASE}julian-uvs-unleashed-1v1.png`,
    `${PHOTO_BASE}steph-uvs-unleashed-1v1.png`
];

// ── Defaults: the current PSD composite's own example picks, verbatim ───────
// (UNLEASHED META MVPs — both top slots next to the center pick Vex.)
const DEFAULTS = {
    casters: [
        { photo: PHOTO_DEFAULTS[0], picks: [
            { name: 'Elder Dragon',          image: '/assets/images/riftbound/cards/UNL-118.png' },
            { name: 'Vex, Apathetic',        image: '/assets/images/riftbound/cards/UNL-150.png' }
        ] },
        { photo: PHOTO_DEFAULTS[1], picks: [
            { name: 'Vex, Apathetic',        image: '/assets/images/riftbound/cards/UNL-150.png' },
            { name: 'Star-Crossed',          image: '/assets/images/riftbound/cards/UNL-128.png' }
        ] },
        { photo: PHOTO_DEFAULTS[2], picks: [
            { name: 'Heedless Resurrection', image: '/assets/images/riftbound/cards/UNL-142.png' },
            { name: 'Ashe, Focused',         image: '/assets/images/riftbound/cards/UNL-169.png' }
        ] },
        { photo: PHOTO_DEFAULTS[3], picks: [
            { name: 'Baron Nashor',          image: '/assets/images/riftbound/cards/UNL-147.png' },
            { name: 'Hwei, Brooding Painter', image: '/assets/images/riftbound/cards/UNL-080.png' }
        ] }
    ]
};

let sceneData = DEFAULTS;
let cardIndex = null;   // lowercased card name → imageUrl, from riftboundCardNames.json

// ── Socket setup (theme hydration only — guarded so the page still renders
// when opened standalone with no server) ────────────────────────────────────
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
    console.warn('[CasterPicks] Socket unavailable — rendering standalone', e);
}
applyBodyAttrs();

// ── Helpers ─────────────────────────────────────────────────────────────────
function resolveCardImage(pick) {
    if (pick && pick.image) return pick.image;                  // explicit path wins
    if (pick && pick.name && cardIndex) {
        const hit = cardIndex[pick.name.toLowerCase()];
        if (hit) return hit;
    }
    return CARD_FALLBACK;
}

// ── Entrance choreography (unleashed-motion kit) ────────────────────────────
// Photos sweep in from their outer edges first, then the 8 pick cards
// scale in staggered per quadrant. Quadrant time order TL, BL, TR, BR
// (left column leads, matching the photos' left-first entrance).
const QUAD_ORDER = [0, 2, 1, 3];            // quadrant index (TL,TR,BL,BR) → choreo position
const PHOTO_STEP = 0.08;                    // between photos
const CARD_BASE = 0.18;                     // cards start after the photos are moving
const CARD_QUAD_STEP = 0.15;                // between quadrants
const CARD_STEP = 0.10;                     // between the 2 cards of a quadrant

// ── Render ──────────────────────────────────────────────────────────────────
function render() {
    const cardsEl = document.getElementById('cp-cards');
    const photosEl = document.getElementById('cp-photos');
    if (!cardsEl || !photosEl) return;
    cardsEl.innerHTML = '';
    photosEl.innerHTML = '';

    const casters = (sceneData.casters || []).slice(0, 4);
    casters.forEach((caster, qi) => {
        const slots = CARD_SLOTS[qi];
        if (!slots) return;

        // 2 card picks per quadrant
        (caster.picks || []).slice(0, 2).forEach((pick, pi) => {
            const slot = slots[pi];
            const img = document.createElement('img');
            img.className = 'cp-card unl-scale-in';
            img.style.setProperty('--unl-d',
                `${(CARD_BASE + QUAD_ORDER[qi] * CARD_QUAD_STEP + pi * CARD_STEP).toFixed(2)}s`);
            img.style.left = `${slot.x}px`;
            img.style.top = `${slot.y}px`;
            img.style.width = `${slot.w}px`;
            img.style.height = `${slot.h}px`;
            img.alt = pick.name || '';
            img.onerror = () => {
                if (!img.src.endsWith(CARD_FALLBACK)) img.src = CARD_FALLBACK;
            };
            img.src = resolveCardImage(pick);
            cardsEl.appendChild(img);
        });

        // Caster photo — scene-content `photo` wins; null falls back to the
        // PSD's current photo layer for the slot (the bg's baked photos are a
        // stale take and must stay covered).
        const photoSrc = caster.photo || PHOTO_DEFAULTS[qi];
        if (photoSrc) {
            const slot = PHOTO_SLOTS[qi];
            const ph = document.createElement('img');
            // Left-edge photos (qi 0,2) sweep in from the left, right-edge
            // photos (qi 1,3) from the right — direction follows layout.
            ph.className = `cp-photo ${qi % 2 === 0 ? 'unl-slide-left' : 'unl-slide-right'}`;
            ph.style.setProperty('--unl-d', `${(QUAD_ORDER[qi] * PHOTO_STEP).toFixed(2)}s`);
            ph.style.left = `${caster.photoX !== undefined ? caster.photoX : slot.x}px`;
            ph.style.top = `${caster.photoY !== undefined ? caster.photoY : slot.y}px`;
            ph.style.width = `${caster.photoW !== undefined ? caster.photoW : slot.w}px`;
            ph.style.height = `${caster.photoH !== undefined ? caster.photoH : slot.h}px`;
            ph.style.zIndex = slot.z;
            if (slot.clipY !== undefined) {
                const top = caster.photoY !== undefined ? caster.photoY : slot.y;
                const h = caster.photoH !== undefined ? caster.photoH : slot.h;
                ph.style.clipPath = `inset(0 0 ${top + h - slot.clipY}px 0)`;
            }
            ph.alt = caster.name || '';
            ph.onerror = () => { ph.remove(); };
            ph.src = photoSrc;
            photosEl.appendChild(ph);
        }
    });
}

// ── Card-name index (optional — lets scene-content give names only) ─────────
fetch('/data/riftbound/riftboundCardNames.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json) return;
        cardIndex = {};
        Object.entries(json).forEach(([name, info]) => {
            if (info && info.imageUrl) cardIndex[name.toLowerCase()] = info.imageUrl;
        });
        render();   // re-resolve any name-only picks
    })
    .catch(() => {});

// ── Content override (optional JSON; 404 -> defaults) ───────────────────────
async function loadContent() {
    try {
        const res = await fetch('/data/scene-content/caster-picks.json', { cache: 'no-cache' });
        if (!res.ok) return;
        const json = await res.json();
        if (json && Array.isArray(json.casters) && json.casters.length) {
            sceneData = json;
            render();
        }
    } catch (e) {
        console.warn('[CasterPicks] No scene-content override, using defaults', e);
    }
}

render();
loadContent();

// Entrance plays once per load. The only re-renders are the two boot-time
// hydration fetches above (card-name index + scene-content), which land well
// inside the entrance window and simply restart it from frame 0; once the
// choreography has fully settled, mark the stage unl-still so any future
// re-render paints at rest. unlReplay() clears the flag and re-runs.
setTimeout(() => {
    const stage = document.getElementById('cp-stage');
    if (stage) stage.classList.add('unl-still');
}, 2000);
