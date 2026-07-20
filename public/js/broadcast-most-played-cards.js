// UNLEASHED "Most Played Cards" — one page, three variants (spells / gear / units).
// Variant comes from ?variant=… or the trailing path segment
// (/broadcast/most-played-cards/<variant>); default "spells".
//
// The page renders its scene UNCONDITIONALLY (it IS the uvs-unleashed skin):
// socket hydration only stamps body dataset attrs and must never crash the
// page if the server / socket.io is unavailable.

const VARIANTS = ['spells', 'gear', 'units'];

function getVariant() {
    const q = (new URLSearchParams(window.location.search).get('variant') || '').toLowerCase();
    if (VARIANTS.includes(q)) return q;
    const seg = window.location.pathname.replace(/\/+$/, '').split('/').pop().toLowerCase();
    if (VARIANTS.includes(seg)) return seg;
    return 'spells';
}
const variant = getVariant();

// ── Defaults: the PSD's own example data, verbatim (all three variants share
// the same sample content in the PSD — only the baked headline/champion differ). ─
const SAMPLE_CARD_IMAGE = '/assets/images/riftbound/cards/UNL-009.png'; // Upstage Comedy
const CARD_FALLBACK = '/assets/images/riftbound/cards/riftbound-card-back.png';

function sampleVariant() {
    return {
        featured: [
            { name: 'Upstage Comedy', usage: '24%', image: SAMPLE_CARD_IMAGE },
            { name: 'Upstage Comedy', usage: '24%', image: SAMPLE_CARD_IMAGE },
            { name: 'Upstage Comedy', usage: '24%', image: SAMPLE_CARD_IMAGE }
        ],
        table: [
            { name: 'Rebuke',              usage: '18%' },
            { name: 'Hard Bargain',        usage: '15%' },
            { name: 'Brynhir Thundersong', usage: '15%' },
            { name: 'Noxu Hopeful',        usage: '12%' },
            { name: 'Discipline',          usage: '8%'  },
            { name: 'Ferrous Forerunner',  usage: '4%'  },
            { name: 'Ride the Wind',       usage: '4%'  }
        ]
    };
}
const DEFAULTS = { spells: sampleVariant(), gear: sampleVariant(), units: sampleVariant() };

let sceneData = DEFAULTS[variant];
let cardIndex = null;   // name (lowercased) → imageUrl, from riftboundCardNames.json

// ── Table row geometry (PSD): 7 row strips, 92px pitch from y177; text caps at
// y213+92k → block top 204+92k with the CSS 38px line box (Beaufort 30px has a
// 38px font box → zero half-leading; caps outline lands ~10px below block top). ─
const TABLE_ROW_TOP = 204;
const TABLE_ROW_PITCH = 92;
const TABLE_MAX_ROWS = 7;

function fmtUsage(u) {
    if (u === undefined || u === null || u === '') return '';
    const s = String(u).trim();
    return s.endsWith('%') ? s : `${s}%`;
}

function resolveCardImage(entry) {
    if (entry && entry.image) return entry.image;
    if (entry && entry.name && cardIndex) {
        const hit = cardIndex[entry.name.toLowerCase()];
        if (hit) return hit;
    }
    return CARD_FALLBACK;
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
    const bg = document.getElementById('mpc-bg');
    bg.src = `/assets/images/riftbound/most-played-cards/riftbound-most-played-cards-bg-${variant}-uvs-unleashed-1v1.png`;

    // featured cards
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`mpc-card-${i + 1}`);
        const entry = (sceneData.featured || [])[i];
        const art = slot.querySelector('.mpc-card-art');
        const name = slot.querySelector('.mpc-card-name');
        const usage = slot.querySelector('.mpc-card-usage');
        if (!entry) {
            art.removeAttribute('src');
            art.style.display = 'none';
            name.textContent = '';
            usage.textContent = '';
            continue;
        }
        art.style.display = '';
        const src = resolveCardImage(entry);
        if (art.getAttribute('src') !== src) {
            art.onerror = () => { art.onerror = null; art.src = CARD_FALLBACK; };
            art.src = src;
        }
        name.textContent = entry.name || '';
        usage.textContent = fmtUsage(entry.usage);
    }

    // right table — entrance: rows fade-rise top-to-bottom (70ms cascade),
    // each row's % number pops in the baked gold pill 100ms behind its name.
    const table = document.getElementById('mpc-table');
    table.innerHTML = '';
    (sceneData.table || []).slice(0, TABLE_MAX_ROWS).forEach((row, k) => {
        const top = TABLE_ROW_TOP + TABLE_ROW_PITCH * k;
        const nameEl = document.createElement('div');
        nameEl.className = 'mpc-row-name unl-fade-rise';
        nameEl.style.setProperty('--unl-d', `${(0.20 + k * 0.07).toFixed(2)}s`);
        nameEl.style.top = `${top}px`;
        nameEl.textContent = row.name || '';
        const usageEl = document.createElement('div');
        usageEl.className = 'mpc-row-usage unl-pop';
        usageEl.style.setProperty('--unl-d', `${(0.30 + k * 0.07).toFixed(2)}s`);
        usageEl.style.top = `${top}px`;
        usageEl.textContent = fmtUsage(row.usage);
        table.appendChild(nameEl);
        table.appendChild(usageEl);
    });
    armUnlStill();
}

// Once the entrance (longest delay .72s + .45s pop ≈ 1.2s) has finished, mark the
// stage .unl-still so later data re-renders paint at rest instead of re-popping.
// The early hydration re-renders (content JSON + card index, ~first 200ms) land
// inside the window and simply restart the cascade with the real data.
let unlStillTimer = null;
function armUnlStill() {
    const stage = document.getElementById('mpc-stage');
    if (!stage || stage.classList.contains('unl-still')) return;
    if (unlStillTimer) clearTimeout(unlStillTimer);
    unlStillTimer = setTimeout(() => stage.classList.add('unl-still'), 1500);
}
render();

// ── Content override: /data/scene-content/most-played-cards.json holds
// { spells: {featured, table}, gear: {...}, units: {...} }; 404 → defaults. ────
fetch('/data/scene-content/most-played-cards.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json || !json[variant]) return;
        sceneData = { ...sceneData, ...json[variant] };
        render();
    })
    .catch(() => {});

// Card-name → image index (same file master-control uses). Best-effort: lets the
// content JSON reference cards by name alone; entries with an explicit `image`
// never need it.
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
    console.warn('[MostPlayedCards] socket unavailable — rendering with defaults', err);
}
