// VS PiP Split Screen — UNLEASHED (RQ Sydney) broadcast scene.
// Two transparent PiP video windows (OBS feeds show through); this page
// paints the chrome plus per-player nameplates and 3 battlefield card slots
// per side. The page IS the uvs-unleashed skin and renders unconditionally;
// socket hydration stamps body data-attrs + applies live match data and must
// never block or crash rendering.
//
// REAL WIRING: joins the scoreboard-{N} room (?match=N, default 1 — see
// room-manager.js) and hydrates from scoreboard-{N}-saved-state:
//   player-name-{left,right}                → gamertags
//   player-legend-{left,right}              → deck label above the plate
//   player-battlefield-{1,2,3}-{left,right} → the three slots per side
//   player-battlefield-{left,right}         → active battlefield → tab highlight
import { RIFTBOUND_BATTLEFIELD_NAMES, RIFTBOUND_BATTLEFIELDS_BASE } from './riftbound/constants.js';

// ── Defaults: replicate the PSD's own example data verbatim ─────────────────
// battlefields[i] / tabLabels[i] = game i+1. Game 3 is unpicked in the PSD
// (empty slot + placeholder swirl; the left game-3 tab has no text at all).
const DEFAULTS = {
    left: {
        gamertag: 'GAMERTAG',
        deckLabel: '',
        battlefields: ['vilemaw’s lair', 'the arena’S greatest', ''],
        tabLabels: ['game 1', 'game 2', ''],
        activeGame: null
    },
    right: {
        gamertag: 'GAMERTAG',
        deckLabel: '',
        battlefields: ['startipped peak', 'targon’s peak', ''],
        tabLabels: ['game 1', 'game 2', 'game3'],
        activeGame: null
    }
};

// ── Slot geometry (exact PSD coords; slots listed as game 1,2,3) ────────────
// Game 1 sits nearest the center divider on both sides; game 3 at the outer
// edge. Tabs are the 96x24 gold rects at y996 (baked into bf-over).
const SLOTS = {
    left: [
        { game: 1, x: 642,  y: 811, w: 304, h: 208, tabX: 746 },
        { game: 2, x: 328,  y: 811, w: 304, h: 208, tabX: 432 },
        { game: 3, x: 12,   y: 811, w: 303, h: 209, tabX: 117 }
    ],
    right: [
        { game: 1, x: 974,  y: 811, w: 304, h: 208, tabX: 1078 },
        { game: 2, x: 1288, y: 811, w: 304, h: 208, tabX: 1392 },
        { game: 3, x: 1605, y: 811, w: 303, h: 209, tabX: 1707 }
    ]
};

const FALLBACK_ART = `${RIFTBOUND_BATTLEFIELDS_BASE}/Brush.png`;

let sceneData = DEFAULTS;
let hasLiveData = false; // once live match data applies, scene-content JSON no longer overrides

// ── Socket setup (guarded so the page still renders standalone) ─────────────
let currentGame = 'riftbound';
let currentVendor = 'uvs-unleashed';
let currentPlayerCount = '1v1';

function applyBodyAttrs() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;
}

const matchN = new URLSearchParams(window.location.search).get('match') || '1';

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

    // ── Live match data: same room + event the /scoreboard page uses. The
    // server re-emits the full saved state to scoreboard-{N} on every control
    // edit, so this doubles as the live-update path. ─────────────────────────
    socket.emit('getSavedControlState', { control_id: matchN });
    socket.on(`scoreboard-${matchN}-saved-state`, (payload) => {
        try {
            if (payload && payload.data) applyLiveState(payload.data);
        } catch (e) {
            console.error('[VsPip] saved-state handler failed', e);
        }
    });
} catch (e) {
    console.warn('[VsPip] Socket unavailable — rendering standalone', e);
}
applyBodyAttrs();

// ── Helpers ─────────────────────────────────────────────────────────────────
function normalizeApostrophes(s) {
    return (s || '').replace(/[‘’]/g, '\'');
}

// Resolve a battlefield display name to its repo art URL (same asset set the
// scoreboard's L3 strip uses). Case-insensitive against the canonical list so
// PSD-style lowercase names still hit e.g. "Vilemaw's Lair.png".
function battlefieldArtUrl(name) {
    const wanted = normalizeApostrophes(name).trim().toLowerCase();
    if (!wanted) return '';
    const canonical = RIFTBOUND_BATTLEFIELD_NAMES.find(
        n => normalizeApostrophes(n).toLowerCase() === wanted
    );
    return `${RIFTBOUND_BATTLEFIELDS_BASE}/${encodeURIComponent(canonical || normalizeApostrophes(name).trim())}.png`;
}

function str(v) {
    return (v === null || v === undefined) ? '' : String(v).trim();
}

// ── Entrance-motion re-render suppression ───────────────────────────────────
// First render (page load / initial hydration) animates; once the entrance has
// had time to finish, #vsp-battlefields gets .unl-still so later control edits
// re-render at rest (no re-pop). Renders inside the entrance window simply
// restart the entrance — that's still "page load" territory.
let unlStillTimer = null;
function armUnlStill() {
    const bfEl = document.getElementById('vsp-battlefields');
    if (!bfEl || bfEl.classList.contains('unl-still')) return;
    clearTimeout(unlStillTimer);
    unlStillTimer = setTimeout(() => bfEl.classList.add('unl-still'), 1500);
}

// ── Render ──────────────────────────────────────────────────────────────────
function render() {
    const slotsEl = document.getElementById('vsp-slots');
    const tabsEl = document.getElementById('vsp-tabs');
    if (!slotsEl || !tabsEl) return;
    slotsEl.innerHTML = '';
    tabsEl.innerHTML = '';

    ['left', 'right'].forEach(side => {
        const d = sceneData[side] || DEFAULTS[side];

        SLOTS[side].forEach((geo, i) => {
            const bfName = str((d.battlefields || [])[i]);
            // Stagger inward-out (game 1 sits nearest the center divider on
            // both sides): art first, its name a beat later, tabs pop last.
            const artDelay = 0.15 + i * 0.09;

            // Slot: art (or placeholder swirl) + name
            const slot = document.createElement('div');
            slot.className = 'vsp-slot';
            slot.style.left = `${geo.x}px`;
            slot.style.top = `${geo.y}px`;
            slot.style.width = `${geo.w}px`;
            slot.style.height = `${geo.h}px`;

            // Empty slot → nothing rendered here: the navy plate + faint
            // placeholder swirl are baked into bf-under and show through.
            if (bfName) {
                const art = document.createElement('img');
                art.className = 'vsp-slot-art unl-fade-rise';
                art.style.setProperty('--unl-d', `${artDelay.toFixed(2)}s`);
                art.alt = '';
                art.onerror = () => {
                    // Unknown name → any real art so the slot geometry stays
                    // verifiable (there is no _0000_Default in this asset set)
                    if (!art.src.endsWith('/Brush.png')) art.src = FALLBACK_ART;
                };
                art.src = battlefieldArtUrl(bfName);
                slot.appendChild(art);

                const name = document.createElement('div');
                name.className = 'vsp-slot-name';
                name.textContent = bfName;
                // .vsp-slot-name carries translateX(-50%) — animate a wrapper,
                // never the name itself (keyframes end at transform:none).
                const nameWrap = document.createElement('div');
                nameWrap.className = 'vsp-slot-name-wrap unl-fade-rise';
                nameWrap.style.setProperty('--unl-d', `${(artDelay + 0.12).toFixed(2)}s`);
                nameWrap.appendChild(name);
                slot.appendChild(nameWrap);
            }
            slotsEl.appendChild(slot);

            // Tab label (gold rect is baked chrome; active highlight is DOM)
            const tab = document.createElement('div');
            tab.className = 'vsp-tab unl-pop';
            tab.style.setProperty('--unl-d', `${(0.62 + i * 0.07).toFixed(2)}s`);
            tab.style.left = `${geo.tabX}px`;
            if (d.activeGame === geo.game) tab.classList.add('active');
            tab.textContent = str((d.tabLabels || [])[i]);
            tabsEl.appendChild(tab);
        });

        const tagEl = document.getElementById(`vsp-gamertag-${side}`);
        if (tagEl) tagEl.textContent = str(d.gamertag) || DEFAULTS[side].gamertag;
        const labelEl = document.getElementById(`vsp-deck-label-${side}`);
        if (labelEl) labelEl.textContent = str(d.deckLabel);
    });

    armUnlStill();
}

// ── Live match data → scene state ───────────────────────────────────────────
function applyLiveState(data) {
    const FIELDS = ['player-name-left', 'player-name-right',
        'player-battlefield-left', 'player-battlefield-right',
        'player-battlefield-1-left', 'player-battlefield-2-left', 'player-battlefield-3-left',
        'player-battlefield-1-right', 'player-battlefield-2-right', 'player-battlefield-3-right'];
    if (!FIELDS.some(f => str(data[f]))) return; // nothing usable — keep defaults

    hasLiveData = true;
    const next = {};
    ['left', 'right'].forEach(side => {
        const battlefields = [1, 2, 3].map(g => str(data[`player-battlefield-${g}-${side}`]));
        const active = normalizeApostrophes(str(data[`player-battlefield-${side}`])).toLowerCase();
        const activeIdx = active
            ? battlefields.findIndex(b => normalizeApostrophes(b).toLowerCase() === active)
            : -1;
        next[side] = {
            gamertag: str(data[`player-name-${side}`]) || DEFAULTS[side].gamertag,
            deckLabel: str(data[`player-legend-${side}`]) || str(data[`player-archetype-${side}`]),
            battlefields,
            tabLabels: ['game 1', 'game 2', 'game 3'],
            activeGame: activeIdx >= 0 ? activeIdx + 1 : null
        };
    });
    sceneData = next;
    render();
}

// ── Content override (optional JSON; 404 → defaults) ────────────────────────
async function loadContent() {
    try {
        const res = await fetch('/data/scene-content/vs-pip.json', { cache: 'no-cache' });
        if (!res.ok) return;
        const json = await res.json();
        if (json && json.left && json.right && !hasLiveData) {
            sceneData = json;
            render();
        }
    } catch (e) {
        console.warn('[VsPip] No scene-content override, using defaults', e);
    }
}

render();
loadContent();
