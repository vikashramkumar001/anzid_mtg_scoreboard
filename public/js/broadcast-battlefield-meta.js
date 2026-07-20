// Battlefield Meta — UNLEASHED (RQ Sydney) broadcast scene.
// 6 battlefield tiles (2 cols x 3 rows): art strip + name + play-rate percent.
// The page IS the uvs-unleashed skin and renders unconditionally; socket
// hydration only stamps body data-attrs and must never block/crash rendering.
import { RIFTBOUND_BATTLEFIELDS_BASE } from './riftbound/constants.js';

// ── Defaults (PSD example uses placeholder 'BATTLEFIELDS NAME' + '3%' on all
// six tiles — replaced with real battlefield names + plausible percents so the
// scene demos meaningfully; geometry is unchanged) ──────────────────────────
const DEFAULTS = {
    battlefields: [
        { name: 'Baron Pit',       percent: '18%' },
        { name: 'Star Spring',     percent: '15%' },
        { name: 'Frozen Fortress', percent: '12%' },
        { name: 'The Academy',     percent: '9%' },
        { name: 'Vaults of Helia', percent: '7%' },
        { name: 'Brush',           percent: '5%' }
    ]
};

// ── Tile geometry (exact PSD coords, canvas-optimized against the truth PNG) ─
// Left col art x197, right col x899 (+702); percent-text centers x727/x1429.
// Name centers on the art strip (x437/x1139). Rows: art y216/421/627.
// nameCY/pctCY solved from truth baselines (name 297.75/502.75/708.75 @27px,
// pct 302.75/508.75/714.75 @43px) via top = baseline - 0.372*fontSize.
const COLS = [
    { artX: 197, nameCX: 437.5,  pctCX: 727.25 },
    { artX: 899, nameCX: 1139.5, pctCX: 1429.25 }
];
const ROWS = [
    { artY: 216, nameCY: 287.7, pctCY: 287 },
    { artY: 421, nameCY: 492.7, pctCY: 493 },
    { artY: 627, nameCY: 698.7, pctCY: 699 }
];

// Known-good fallback art for names without a matching asset file
const FALLBACK_ART = `${RIFTBOUND_BATTLEFIELDS_BASE}/Brush.png`;

let sceneData = DEFAULTS;

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
    console.warn('[BattlefieldMeta] Socket unavailable — rendering standalone', e);
}
applyBodyAttrs();

// ── Helpers ─────────────────────────────────────────────────────────────────
function artUrl(bf) {
    if (bf.art) return bf.art;                                  // explicit override
    return `${RIFTBOUND_BATTLEFIELDS_BASE}/${bf.name}.png`;     // repo battlefield art
}

// Cover-fit the art into the 480x143 window, cropping the baked-in card frame
// of the standard 1039x744 battlefield scans (black border + gray inner line +
// black line; art starts at L43 R41 T~53 B~77, plus small ornament notches at
// source rows 439-441/499-501). Insets carry an AA margin, and the 0.28 focal
// keeps the visible band inside source rows ~149-432, clear of the notches.
// Other sizes (custom art overrides) get a plain border-less cover.
const ART_W = 480, ART_H = 143, ART_FOCAL_Y = 0.28;
function placeArt(img) {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return;
    const std = (nw === 1039 && nh === 744);
    const l = std ? 46 : 0, r = std ? 44 : 0, t = std ? 58 : 0, b = std ? 78 : 0;
    const iw = nw - l - r, ih = nh - t - b;
    const s = Math.max(ART_W / iw, ART_H / ih);
    img.style.width = `${nw * s}px`;
    img.style.height = `${nh * s}px`;
    img.style.left = `${-(l * s + (iw * s - ART_W) * 0.5)}px`;
    img.style.top = `${-(t * s + (ih * s - ART_H) * ART_FOCAL_Y)}px`;
}

function formatPercent(value) {
    if (value === null || value === undefined || value === '') return '';
    const s = String(value).trim();
    return s.endsWith('%') ? s : `${s}%`;
}

// ── Render ──────────────────────────────────────────────────────────────────
// Entrance choreography (unleashed-motion.css): the six tiles fade-rise
// row-by-row left-then-right at 90ms steps; each tile's name rises in lockstep
// with its art, and the percent pops in its gold box ~200ms after the tile.
// Re-renders inside the entrance window restart it (real data gets the
// entrance); after ~1.4s the containers go .unl-still so live-data re-renders
// paint at rest. window.unlReplay() re-runs everything.
const TILE_STEP_S = 0.09, PCT_LAG_S = 0.2, STILL_AFTER_MS = 1400;
let stillTimer = null;
function armStill() {
    clearTimeout(stillTimer);
    stillTimer = setTimeout(() => {
        document.getElementById('bfm-tiles')?.classList.add('unl-still');
        document.getElementById('bfm-labels')?.classList.add('unl-still');
    }, STILL_AFTER_MS);
}

// unlReplay() strips .unl-still so the entrance can re-run (kit behavior);
// re-arm the still timer afterwards so post-replay data edits stay at rest.
if (typeof window.unlReplay === 'function') {
    const kitReplay = window.unlReplay;
    window.unlReplay = function () {
        const result = kitReplay();
        armStill();
        return result;
    };
}

function render() {
    const tilesEl = document.getElementById('bfm-tiles');
    const labelsEl = document.getElementById('bfm-labels');
    if (!tilesEl || !labelsEl) return;
    tilesEl.innerHTML = '';
    labelsEl.innerHTML = '';

    const battlefields = (sceneData.battlefields || []).slice(0, 6);
    battlefields.forEach((bf, i) => {
        const row = ROWS[Math.floor(i / 2)];
        const col = COLS[i % 2];
        if (!row || !col) return;
        const tileDelay = `${(i * TILE_STEP_S).toFixed(2)}s`;
        const pctDelay = `${(i * TILE_STEP_S + PCT_LAG_S).toFixed(2)}s`;

        // Static underlay — hides the bg's baked placeholder while the art
        // strip above it is still fading in (see .bfm-art-under)
        const under = document.createElement('div');
        under.className = 'bfm-art-under';
        under.style.left = `${col.artX}px`;
        under.style.top = `${row.artY}px`;
        tilesEl.appendChild(under);

        // Art strip (covers the truth bg's baked example art + name)
        const clip = document.createElement('div');
        clip.className = 'bfm-art unl-fade-rise';
        clip.style.left = `${col.artX}px`;
        clip.style.top = `${row.artY}px`;
        clip.style.setProperty('--unl-d', tileDelay);
        const img = document.createElement('img');
        img.alt = '';
        img.onload = () => placeArt(img);
        img.onerror = () => {
            if (img.src !== location.origin + FALLBACK_ART) img.src = FALLBACK_ART;
        };
        img.src = artUrl(bf);
        if (img.complete && img.naturalWidth) placeArt(img);
        clip.appendChild(img);
        tilesEl.appendChild(clip);

        // Name — centered on the art strip, entering with it. .bfm-name owns a
        // translate(-50%,-50%) so the motion class lives on a 0x0 wrapper.
        const nameWrap = document.createElement('div');
        nameWrap.className = 'bfm-name-wrap unl-fade-rise';
        nameWrap.style.left = `${col.nameCX}px`;
        nameWrap.style.top = `${row.nameCY}px`;
        nameWrap.style.setProperty('--unl-d', tileDelay);
        const name = document.createElement('div');
        name.className = 'bfm-name';
        name.textContent = bf.name || '';
        nameWrap.appendChild(name);
        labelsEl.appendChild(nameWrap);

        // Percent — centered in the gold box, popping after its tile. Same
        // wrapper treatment (.bfm-pct centers itself with a transform).
        const pctWrap = document.createElement('div');
        pctWrap.className = 'bfm-pct-wrap unl-pop';
        pctWrap.style.left = `${col.pctCX}px`;
        pctWrap.style.top = `${row.pctCY}px`;
        pctWrap.style.setProperty('--unl-d', pctDelay);
        const pct = document.createElement('div');
        pct.className = 'bfm-pct';
        pct.textContent = formatPercent(bf.percent);
        pctWrap.appendChild(pct);
        labelsEl.appendChild(pctWrap);
    });

    armStill();
}

// ── Content override (optional JSON; 404 -> defaults) ───────────────────────
async function loadContent() {
    try {
        const res = await fetch('/data/scene-content/battlefield-meta.json', { cache: 'no-cache' });
        if (!res.ok) return;
        const json = await res.json();
        if (json && Array.isArray(json.battlefields) && json.battlefields.length) {
            sceneData = json;
            render();
        }
    } catch (e) {
        console.warn('[BattlefieldMeta] No scene-content override, using defaults', e);
    }
}

render();
loadContent();
