// UNLEASHED "Community Choice" — 4 match rows (viewer-vote feature match).
// Bg = PSD truth composite; the designer's own full-canvas row-plate PNGs
// (M1-M4 left/right) cover every baked sample-data region, so the DOM renders
// only dynamic data: names, deck lines, domain runes, and the gold "Selected"
// winner overlay.
//
// The page renders its scene UNCONDITIONALLY (it IS the uvs-unleashed skin):
// socket hydration only stamps body dataset attrs and must never crash the
// page if the server / socket.io is unavailable.

const ASSET = '/assets/images/riftbound/community-choice';
const A = (name) => `${ASSET}/riftbound-community-choice-${name}-uvs-unleashed-1v1.png`;

// ── Row geometry (PSD row 1; rows repeat on a 138px pitch) ───────────────────
const ROW_PITCH = 138;
const ROW_COUNT = 4;                 // plates ALWAYS render for all 4 rows so the
                                     // truth-baked sample rows can never show through
const NAME_TOP = 226.6;              // solves caps ink-top = y237 (probed baseline = top+32.5)
const SUB_TOP = 263;                 // solves caps ink-top = y271 (probed baseline = top+23)
const FRAME_TOP = 230;               // gold domain frame 127x63
const RUNE_TOP = 238;                // rune circles 47x47, inset +8,+8 in the frame
const RUNE_LEFT_X = [762, 825];      // left player's two rune slots
const RUNE_RIGHT_X = [1047, 1110];   // right player's two rune slots

// ── Domain → rune art. Calm/Body/Chaos/Fury are native PSD extracts; Mind and
// Order have no art in this PSD — fall back to the shared rune-bg icons. ──────
const RUNE_SRC = {
    calm:  A('rune-calm'),
    body:  A('rune-body'),
    chaos: A('rune-chaos'),
    fury:  A('rune-fury'),
    mind:  '/assets/images/riftbound/icons/runes-bg/Mind-bg.png',
    order: '/assets/images/riftbound/icons/runes-bg/Order-bg.png'
};
// The PSD's own palette names the runes by color — accept those too.
const RUNE_ALIASES = { green: 'calm', orange: 'body', purple: 'chaos', red: 'fury', blue: 'mind', gold: 'order', yellow: 'order' };

function runeSrc(domain) {
    const key = String(domain || '').trim().toLowerCase();
    return RUNE_SRC[RUNE_ALIASES[key] || key] || null;
}

// ── Defaults: the PSD's own example data, verbatim (every slot repeats the
// same sample player; no row selected). ──────────────────────────────────────
function samplePlayer() {
    return { name: 'Firstname Lastname', deck: 'Master Yi, Wuju Bladesman', domains: ['Calm', 'Body'] };
}
const DEFAULTS = {
    matches: [1, 2, 3, 4].map(() => ({ left: samplePlayer(), right: samplePlayer(), selected: null }))
};

let sceneData = DEFAULTS;

// ── Render ───────────────────────────────────────────────────────────────────
function el(tag, className, styles) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (styles) Object.assign(node.style, styles);
    return node;
}

function addRunes(row, side, xs, rowY, domains) {
    (domains || []).slice(0, 2).forEach((domain, k) => {
        const src = runeSrc(domain);
        if (!src) return;
        const img = el('img', 'cc-rune', { top: `${RUNE_TOP + rowY}px`, left: `${xs[k]}px` });
        img.src = src;
        img.alt = '';
        row.appendChild(img);
    });
    // Gold frame draws above the runes (its ring slightly overlaps the circles).
    const frame = el('img', `cc-domain-frame ${side}`, { top: `${FRAME_TOP + rowY}px` });
    frame.src = A('domain-frame');
    frame.alt = '';
    row.appendChild(frame);
}

function addTexts(row, side, rowY, player) {
    const name = el('div', `cc-name ${side}`, { top: `${NAME_TOP + rowY}px` });
    name.textContent = (player && player.name) || '';
    const sub = el('div', `cc-sub ${side}`, { top: `${SUB_TOP + rowY}px` });
    sub.textContent = (player && player.deck) || '';
    row.appendChild(name);
    row.appendChild(sub);
}

// Entrance motion: rows cascade top-to-bottom (110ms apart); each side slides
// in as one unit (full-canvas .cc-side wrapper — plate + runes + selected
// overlay + texts keep their stage coords and move together). Renders after
// the entrance window (live-data edits, selected-state swaps) paint at rest
// via .unl-still on #cc-rows; window.unlReplay() re-runs the entrance.
const ROW_STAGGER_S = 0.11;
const ENTRANCE_WINDOW_MS = 1700;   // last row delay (330ms) + 0.6s anim + margin
const loadedAt = performance.now();

function render() {
    const rows = document.getElementById('cc-rows');
    rows.classList.toggle('unl-still', performance.now() - loadedAt > ENTRANCE_WINDOW_MS);
    rows.innerHTML = '';
    const matches = (sceneData && sceneData.matches) || [];

    for (let i = 0; i < ROW_COUNT; i++) {
        const m = matches[i] || { left: {}, right: {} };
        const rowY = i * ROW_PITCH;
        const selected = String(m.selected || '').toLowerCase();

        const row = el('div', 'cc-row');
        if (selected === 'left' || selected === 'both') row.classList.add('sel-left');
        if (selected === 'right' || selected === 'both') row.classList.add('sel-right');

        // Per-side slide wrappers (never class the transform-carrying children).
        const sideL = el('div', 'cc-side unl-slide-left');
        sideL.style.setProperty('--unl-d', `${(i * ROW_STAGGER_S).toFixed(2)}s`);
        const sideR = el('div', 'cc-side unl-slide-right');
        sideR.style.setProperty('--unl-d', `${(i * ROW_STAGGER_S).toFixed(2)}s`);

        // Row plates (full-canvas PNGs — content pre-positioned for this row).
        const plateL = el('img', 'cc-plate');
        plateL.src = A(`plate-m${i + 1}-left`);
        plateL.alt = '';
        const plateR = el('img', 'cc-plate');
        plateR.src = A(`plate-m${i + 1}-right`);
        plateR.alt = '';
        sideL.appendChild(plateL);
        sideR.appendChild(plateR);

        // Domain runes + gold frames.
        addRunes(sideL, 'left', RUNE_LEFT_X, rowY, m.left && m.left.domains);
        addRunes(sideR, 'right', RUNE_RIGHT_X, rowY, m.right && m.right.domains);

        // Winner overlays (source art sits at row 1 — shift down per row).
        const selL = el('img', 'cc-selected-plate left', { transform: `translateY(${rowY}px)` });
        selL.src = A('plate-selected-left');
        selL.alt = '';
        const selR = el('img', 'cc-selected-plate right', { transform: `translateY(${rowY}px)` });
        selR.src = A('plate-selected-right');
        selR.alt = '';
        sideL.appendChild(selL);
        sideR.appendChild(selR);

        // Names + deck lines (drawn last → above the selected overlay).
        addTexts(sideL, 'left', rowY, m.left);
        addTexts(sideR, 'right', rowY, m.right);

        row.appendChild(sideL);
        row.appendChild(sideR);
        rows.appendChild(row);
    }
}
render();

// ── Content override: /data/scene-content/community-choice.json holds
// { matches: [ { left: {name, deck, domains[]}, right: {...},
//   selected: "left"|"right"|null } x4 ] }; 404 → defaults. ──────────────────
fetch('/data/scene-content/community-choice.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json || !Array.isArray(json.matches)) return;
        sceneData = { ...sceneData, ...json };
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
    console.warn('[CommunityChoice] socket unavailable — rendering with defaults', err);
}
