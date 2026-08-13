// scoreboard.js - Optimized Version
import {
    RIFTBOUND_RUNES_BG as RIFTBOUND_RUNES,
    RIFTBOUND_BATTLEFIELD_NAMES,
    RIFTBOUND_BATTLEFIELDS_BASE,
    RIFTBOUND_LEGENDS,
    RIFTBOUND_LEGENDS_DEFAULT,
} from './riftbound/constants.js';

// Auto-scale text to fit within a max width (consistent with other broadcast views)
function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return maxFontSize;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerHTML = element.innerHTML;
    document.body.appendChild(temp);

    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';
    document.body.removeChild(temp);
    return currentSize;
}

// Sync a paired group of riftbound elements to the smallest calculated size
function autoScalePaired(selectors, maxFontSize, minFontSize, maxWidth) {
    const rfb = document.getElementById('scoreboard-riftbound');
    if (!rfb) return;
    const els = selectors.map(sel => rfb.querySelector(sel)).filter(Boolean);
    if (els.length === 0) return;
    const sizes = els.map(el => autoScaleText(el, maxFontSize, minFontSize, maxWidth));
    const minSize = Math.min(...sizes);
    els.forEach(el => el.style.fontSize = minSize + 'px');
}

function autoScaleRiftboundNames() {
    const root = document.documentElement;
    const maxFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-name-max-font') || '20', 10);
    const maxWidth = parseInt(getComputedStyle(root).getPropertyValue('--rb-name-max-width') || '220', 10);
    autoScalePaired(['#player-name-left', '#player-name-right'], maxFont, 10, maxWidth);
}

function autoScaleRiftboundDetails() {
    // Legend + champion text — var-gated max font so vendors can pin to
    // PSD-true sizes (e.g. default UNL chrome wants 12px). Fallback 13.5
    // preserves prior behavior for other vendors.
    const root = document.documentElement;
    const detMax   = parseFloat(getComputedStyle(root).getPropertyValue('--rb-details-max-font')  || '13.5');
    const detMin   = parseFloat(getComputedStyle(root).getPropertyValue('--rb-details-min-font')  || '8');
    const detWidth = parseFloat(getComputedStyle(root).getPropertyValue('--rb-details-max-width') || '251');
    autoScalePaired([
        '#player-legend-left', '#player-legend-right',
        '#player-champion-left', '#player-champion-right'
    ], detMax, detMin, detWidth);

    // Battlefield text has its own var trio so the default UNL chrome
    // can use a smaller PSD-true 10px in the thin strip while keeping
    // legend/champion at 12px. Falls back to the details trio so other
    // vendors stay identical.
    const bfMax   = parseFloat(getComputedStyle(root).getPropertyValue('--rb-bf-max-font')  || detMax);
    const bfMin   = parseFloat(getComputedStyle(root).getPropertyValue('--rb-bf-min-font')  || detMin);
    const bfWidth = parseFloat(getComputedStyle(root).getPropertyValue('--rb-bf-max-width') || detWidth);
    autoScalePaired([
        '#player-battlefield-left', '#player-battlefield-right'
    ], bfMax, bfMin, bfWidth);
}

function autoScaleRiftboundRecords() {
    const root = document.documentElement;
    const maxFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-record-max-font') || '14', 10);
    const minFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-record-min-font') || '10', 10);
    const maxWidth = parseInt(getComputedStyle(root).getPropertyValue('--rb-record-max-width') || '60', 10);
    autoScalePaired(['#player-record-left', '#player-record-right'], maxFont, minFont, maxWidth);
}

function autoScaleRiftboundPoints() {
    const root = document.documentElement;
    const maxFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-points-max-font') || '28', 10);
    const minFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-points-min-font') || '20', 10);
    const maxWidth = parseInt(getComputedStyle(root).getPropertyValue('--rb-points-max-width') || '60', 10);
    const left = document.querySelector('#scoreboard-riftbound #player-life-left');
    const right = document.querySelector('#scoreboard-riftbound #player-life-right');
    if (left) autoScaleText(left, maxFont, minFont, maxWidth);
    if (right) autoScaleText(right, maxFont, minFont, maxWidth);
}

// Showdown Might Tracker — center-bottom slide-in overlay.
// Reads showdown-* control data fields and paints the active battlefield
// (1, 2, or Baron Pit) with its left + right might values.
//   showdown-visible           'true' | 'false'  — controls slide-in
//   showdown-active-bf         '1' | '2' | '3'   — which BF to show
//   showdown-bf-3-enabled      'true' | 'false'  — Baron Pit available
//   showdown-bf-{N}-name       text              — display name override
//   showdown-bf-{N}-left-might  integer
//   showdown-bf-{N}-right-might integer
//
// BF #1 default name = left's active battlefield (player-battlefield-left)
// BF #2 default name = right's active battlefield (player-battlefield-right)
// BF #3 default name = "Baron Pit" (when enabled)
function renderRiftboundShowdown() {
    const tracker = document.getElementById('riftbound-showdown-tracker');
    if (!tracker) return;

    const visible = lastState['showdown-visible'] === 'true';
    const activeBf = (lastState['showdown-active-bf'] || '1').toString();
    const baronPitEnabled = lastState['showdown-bf-3-enabled'] === 'true';

    // Resolve the display name for the active BF — operator override
    // (showdown-bf-N-name) wins; otherwise fall back to the auto source.
    const bfNameOverride = (lastState[`showdown-bf-${activeBf}-name`] || '').trim();
    let bfName = bfNameOverride;
    if (!bfName) {
        if (activeBf === '1') bfName = (lastState['player-battlefield-left'] || '').trim();
        else if (activeBf === '2') bfName = (lastState['player-battlefield-right'] || '').trim();
        else if (activeBf === '3' && baronPitEnabled) bfName = 'Baron Pit';
    }

    // Look up the battlefield art URL from the RIFTBOUND_BATTLEFIELDS
    // table (built at module init). Try exact key first, then a
    // case-insensitive match against the registered names. Falls back to
    // no background if unmatched.
    const bfArt = document.getElementById('riftbound-showdown-bf-art');
    if (bfArt) {
        let bfData = bfName ? RIFTBOUND_BATTLEFIELDS[bfName] : null;
        if (!bfData && bfName) {
            const lower = bfName.toLowerCase();
            const exactKey = Object.keys(RIFTBOUND_BATTLEFIELDS).find(k => k.toLowerCase() === lower);
            if (exactKey) bfData = RIFTBOUND_BATTLEFIELDS[exactKey];
        }
        const url = bfData?.left || '';
        bfArt.style.backgroundImage = url ? `url("${encodeURI(url)}")` : 'none';
    }

    // Update the visible text fields
    const nameEl = document.getElementById('riftbound-showdown-bf-name');
    if (nameEl) nameEl.textContent = bfName;
    const leftMightEl = document.getElementById('riftbound-showdown-might-left-value');
    if (leftMightEl) leftMightEl.textContent = lastState[`showdown-bf-${activeBf}-left-might`] || '0';
    const rightMightEl = document.getElementById('riftbound-showdown-might-right-value');
    if (rightMightEl) rightMightEl.textContent = lastState[`showdown-bf-${activeBf}-right-might`] || '0';

    // Toggle slide-in class — CSS handles the transform animation.
    tracker.classList.toggle('visible', visible);
}

// Shared score tracker bubble row — 1 2 3 ... MAX ... 3 2 1.
// Reads player-life-{left,right} as the player's current score, and
// checks player-battlefield-{left,right} for "Aspirant's Climb" (case
// insensitive substring match) which adds +1 to MAX per occurrence.
// Default MAX = 8, max possible MAX = 10 (both players have climb).
// Left's life fills bubbles from left edge inward; right's life fills
// from right edge inward. Filled bubbles get .filled class (gold).
function renderRiftboundScoreTracker() {
    const tracker = document.getElementById('riftbound-score-tracker');
    if (!tracker) return;

    // Read current state — life values + battlefield names. Fall back
    // to 0 / empty so the tracker still renders in idle state.
    const leftLife = parseInt(lastState['player-life-left'], 10) || 0;
    const rightLife = parseInt(lastState['player-life-right'], 10) || 0;
    const leftBf = (lastState['player-battlefield-left'] || '').toLowerCase();
    const rightBf = (lastState['player-battlefield-right'] || '').toLowerCase();

    // Climb detection — substring match on "aspirant" handles
    // both "Aspirant's Climb" and any future variant. One match per
    // side; max climb count = 2.
    let climbCount = 0;
    if (leftBf.includes('aspirant')) climbCount++;
    if (rightBf.includes('aspirant')) climbCount++;
    const maxScore = 8 + climbCount; // 8, 9, or 10

    // Build the bubble sequence: 1..MAX..1 mirrored about the center.
    // For MAX=8 → [1,2,3,4,5,6,7,8,7,6,5,4,3,2,1] (15 bubbles).
    const bubbles = [];
    for (let n = 1; n <= maxScore; n++) bubbles.push(n);
    for (let n = maxScore - 1; n >= 1; n--) bubbles.push(n);

    const centerIndex = maxScore - 1; // index of the MAX bubble

    // Render — clear and rebuild. Bubble count changes when climb
    // selections change, so we can't reuse existing nodes safely.
    // Only the bubble for the CURRENT score is filled (single-bubble
    // highlight per side), NOT cumulative. Left's filled bubble is at
    // index leftLife-1 (counted from the left edge); right's filled
    // bubble is at index bubbles.length-rightLife (counted from the
    // right edge). Both CLAMPED to the center index — if a player
    // overshoots the max (impossible in normal play but possible if
    // life is operator-set beyond the cap), their pip caps at the
    // center bubble rather than crossing onto the other player's side.
    const leftFilledIdx  = leftLife  >= 1 ? Math.min(leftLife - 1, centerIndex) : -1;
    const rightFilledIdx = rightLife >= 1 ? Math.max(bubbles.length - rightLife, centerIndex) : -1;

    tracker.innerHTML = '';
    bubbles.forEach((num, i) => {
        const bubble = document.createElement('div');
        bubble.className = 'riftbound-score-bubble';
        if (i === centerIndex) bubble.classList.add('center');

        // Wrap the number in a span so CSS can nudge only the text up
        // a pixel (optical centering trick — flex align-items: center on
        // the bubble would otherwise sit the digits slightly low).
        const label = document.createElement('span');
        label.className = 'riftbound-score-bubble-label';
        label.textContent = num;
        bubble.appendChild(label);

        if (i === leftFilledIdx || i === rightFilledIdx) {
            bubble.classList.add('filled');
        }

        tracker.appendChild(bubble);
    });
}

let lastState = {};
let archetypeList = [];

// ── Per-vendor player portraits ───────────────────────────────────────────
// Portrait pools live at:
//   /assets/images/{game}/shared/player-portraits/{vendor}-{playerCount}/{slug}.png
//   e.g. /assets/images/mtg/shared/player-portraits/flyquest-2v2/ls.png
//        /assets/images/riftbound/shared/player-portraits/dsg-2v2/rob-stanley.png
// "{slug}" is the operator-typed name lowercased with non-alphanumerics
// collapsed to hyphens ("Anna Margaret" → "anna-margaret").
//
// Default vendor (or any vendor without a matching portrait file) shows no
// portrait — the slot's <img> is hidden via display:none. Missing files 404
// gracefully through the onerror handler. The legacy global-roster system
// (rosterByName / playerRosterUpdated) is still in use for master-control
// autocomplete + other broadcast pages, but the scoreboard portrait slots
// no longer consult it — they read straight from the per-vendor folder.
let rosterByName = new Map();    // unused for scoreboard portraits, retained
let lastMatchData = null;        // for compatibility with other code paths.

function normalizeName(name) {
    return (name || '').toLowerCase().trim();
}

// "Rob Stanley" → "rob-stanley" — collapses non-alphanumerics to hyphens
// and trims leading/trailing hyphens. Matches the on-disk file convention
// used by both flyquest-2v2 (mtg) and dsg-2v2 (riftbound).
function nameToSlug(name) {
    return (name || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function applyIcon(iconId, name) {
    const img = document.getElementById(iconId);
    if (!img) return;

    // No name OR vendor='default' (or unset) → no portrait. The "default"
    // vendor case is intentional per operator request: roster is opt-in
    // per vendor+count combo, not a global fallback.
    if (!name || !currentVendor || currentVendor === 'default' || !currentGame) {
        img.onerror = null;
        img.onload = null;
        img.removeAttribute('src');
        img.style.display = 'none';
        return;
    }

    const slug = nameToSlug(name);
    const url = `/assets/images/${currentGame}/shared/player-portraits/${currentVendor}-${currentPlayerCount}/${slug}.png`;

    // Capture the intended URL in the closure so a stale onerror from a
    // previous attempt doesn't hide a newer src that's still loading.
    img.onerror = function () {
        if (img.getAttribute('src') === url) {
            img.removeAttribute('src');
            img.style.display = 'none';
        }
    };
    img.onload = function () {
        if (img.getAttribute('src') === url) {
            img.style.display = '';
        }
    };
    img.src = url;
}

// Stamp every icon on both game overlays. Only one overlay is ever visible
// (gated by #scoreboard-{game} display:none), but we update both so switching
// games via master-control doesn't leave stale src on the hidden block.
function applyAllIcons() {
    if (!lastMatchData) return;
    const nameL  = lastMatchData['player-name-left'];
    const nameL2 = lastMatchData['player-name-left-2'];
    const nameR  = lastMatchData['player-name-right'];
    const nameR2 = lastMatchData['player-name-right-2'];
    applyIcon('mtg-p1-icon', nameL);
    applyIcon('mtg-p2-icon', nameL2);
    applyIcon('mtg-p3-icon', nameR);
    applyIcon('mtg-p4-icon', nameR2);
    applyIcon('rb-p1-icon',  nameL);
    applyIcon('rb-p2-icon',  nameL2);
    applyIcon('rb-p3-icon',  nameR);
    applyIcon('rb-p4-icon',  nameR2);
}

const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);

const pathSegments = window.location.pathname.split('/');
const isBroadcastMode = window.location.pathname.includes('/broadcast/round/scoreboard/');

let control_id, match_id, round_id;
if (isBroadcastMode) {
    match_id = pathSegments[4]; // e.g. 'match1'
    round_id = null; // set when server sends broadcast-scoreboard-round-id
    control_id = null;
} else {
    // Control mode URL is /scoreboard/:controlID. Accept both the classic
    // numeric form (/scoreboard/1) and the newer match-slug form
    // (/scoreboard/match1) — strip the "match" prefix so the control_id
    // lines up with the server-emitted event name (scoreboard-1-saved-state,
    // NOT scoreboard-match1-saved-state).
    const rawControlID = pathSegments[2] || '1';
    control_id = rawControlID.replace(/^match/i, '') || '1';
    round_id = '1';
    match_id = /^match/i.test(rawControlID) ? rawControlID : `match${control_id}`;
}

let selectedGame = '';  // global game type, e.g., 'mtg' or 'riftbound'
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

// Mirror player-count onto <body> so CSS can show/hide 2v2-only DOM
// (e.g. #player-name-left-2) via body[data-player-count="2v2"] selectors.
// See scoreboard.css "2v2 player-name-2 slots" block.
if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.playerCount = currentPlayerCount;
}

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: '/assets/images/mtg/icons/mana/W.svg'},
    U: {alt: 'Blue', src: '/assets/images/mtg/icons/mana/U.svg'},
    B: {alt: 'Black', src: '/assets/images/mtg/icons/mana/B.svg'},
    R: {alt: 'Red', src: '/assets/images/mtg/icons/mana/R.svg'},
    G: {alt: 'Green', src: '/assets/images/mtg/icons/mana/G.svg'},
    C: {alt: 'Colorless', src: '/assets/images/mtg/icons/mana/C.svg'}
};

// Star Wars Unlimited Aspects Dictionary
const SWU_ASPECTS = {
    'aggression': '/assets/images/starwars/icons/Aggression.png',
    'command': '/assets/images/starwars/icons/Command.png',
    'cunning': '/assets/images/starwars/icons/Cunning.png',
    'heroism': '/assets/images/starwars/icons/Heroism.png',
    'vigilance': '/assets/images/starwars/icons/Vigilance.png',
    'villainy': '/assets/images/starwars/icons/Villainy.png'
};
// SWU Leaders and Bases: empty for now, populated when card images are added
const SWU_LEADERS = {};
const SWU_BASES = {};

// Helper: find a matching key in a dictionary (case-insensitive, partial match)
function findDictMatch(name, dict) {
    if (!name) return null;
    const nameLower = name.toLowerCase();
    // Exact match first
    for (const key in dict) {
        if (key.toLowerCase() === nameLower) return key;
    }
    // Partial match: input contains key OR key contains input
    for (const key in dict) {
        const keyLower = key.toLowerCase();
        if (nameLower.includes(keyLower) || keyLower.includes(nameLower)) return key;
    }
    return null;
}

// Helper: render SWU aspect icons into a container from comma-separated string
function renderAspectIcons(value, container) {
    container.innerHTML = '';
    if (!value) return;
    const aspects = value.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
    aspects.forEach(aspect => {
        const iconUrl = SWU_ASPECTS[aspect];
        if (iconUrl) {
            const img = document.createElement('img');
            img.src = iconUrl;
            img.alt = aspect;
            img.className = 'swu-aspect-icon';
            container.appendChild(img);
        }
    });
}

// Riftbound Battlefields Dictionary
// Maps battlefield names to their left and right side image URLs
// Files with "180" are for left side, files without "180" are for right side
// Build battlefield lookup from shared names + base path (left/right use same image)
const RIFTBOUND_BATTLEFIELDS_DEFAULT = {
    left: '/assets/images/riftbound/battlefields/_0000_Default.png',
    right: '/assets/images/riftbound/battlefields/_0000_Default.png'
};
const RIFTBOUND_BATTLEFIELDS = {};
RIFTBOUND_BATTLEFIELD_NAMES.forEach(name => {
    const url = `${RIFTBOUND_BATTLEFIELDS_BASE}/${name}.png`;
    RIFTBOUND_BATTLEFIELDS[name] = { left: url, right: url };
});

// ── 2v2 Battlefields Row state ─────────────────────────────────────────
// Slot keys mirror the per-side `player-battlefield-{slot}` fields on the
// match payload AND the server's battlefieldVisibility map (features/control.js).
// Same key on both ends — no lookup table.
//
// Names cached separately from `lastState` because slots `-left-2`/`-right-2`
// don't have matching DOM elements in scoreboard.html (only `-left`/`-right`
// do — they drive the 1v1 battlefield-background images). Pulling from a
// dedicated cache keeps the row renderer agnostic of whether updateElementText
// was able to write through to a real element for each slot.
//
// Visibility defaults to "all visible" so the first render before the
// `battlefield-visibility-updated` reply isn't blank. Server is authoritative;
// `battlefieldVisibility` keys mirror this map exactly.
const RB_BF_SLOTS = ['left', 'left-2', 'right', 'right-2'];
let rbBattlefieldNames = { 'left': '', 'left-2': '', 'right': '', 'right-2': '' };
let rbBattlefieldVisibility = { 'left': true, 'left-2': true, 'right': true, 'right-2': true };

// Render the .riftbound-bf-row strip from cached names + visibility flags.
// Idempotent — safe to call on every state update or visibility flip; only
// changed images/text are written. Slots without a name OR flagged hidden
// are toggled off via the [hidden] attribute, which CSS converts to
// display:none. Flex `space-evenly` reflows the remaining cards
// automatically — no per-count math.
function updateRiftboundBattlefieldsRow() {
    const riftboundContainer = document.getElementById('scoreboard-riftbound');
    if (!riftboundContainer) return;
    const row = riftboundContainer.querySelector('.riftbound-bf-row');
    if (!row) return;

    RB_BF_SLOTS.forEach(slot => {
        const slotEl = row.querySelector(`.riftbound-bf-slot[data-slot="${slot}"]`);
        if (!slotEl) return;
        const visible = rbBattlefieldVisibility[slot] !== false;
        const name = (rbBattlefieldNames[slot] || '').trim();

        if (!visible || !name) {
            slotEl.hidden = true;
            return;
        }

        slotEl.hidden = false;
        const img = slotEl.querySelector('.riftbound-bf-img');
        const label = slotEl.querySelector('.riftbound-bf-label');
        if (label && label.textContent !== name) label.textContent = name;
        if (img) {
            // Battlefield image filenames preserve the literal name (apostrophes
            // and spaces). encodeURIComponent makes the URL safe; onerror hides
            // the broken image so a typo in the operator's input doesn't show
            // a busted icon — the label stays visible on its own.
            const src = `${RIFTBOUND_BATTLEFIELDS_BASE}/${encodeURIComponent(name)}.png`;
            // Compare via getAttribute so a relative src isn't normalized to
            // an absolute URL on read (would cause a needless reload each call).
            if (img.getAttribute('src') !== src) {
                img.style.display = '';
                img.src = src;
                img.onerror = () => { img.style.display = 'none'; };
            }
        }
    });
}

function updateElementText(id, value) {
    // Update element in both MTG and Riftbound sections if they exist
    // This ensures data is ready when switching between games
    const mtgContainer = document.getElementById('scoreboard-mtg');
    const riftboundContainer = document.getElementById('scoreboard-riftbound');
    const vibesContainer = document.getElementById('scoreboard-vibes');
    const starwarsContainer = document.getElementById('scoreboard-starwars');

    let updated = false;

    // Update MTG section
    if (mtgContainer) {
        const mtgEl = mtgContainer.querySelector(`#${id}`);
        if (mtgEl && lastState[id] !== value) {
            mtgEl.innerHTML = value;
            updated = true;
        }
    }

    // Update Riftbound section
    if (riftboundContainer) {
        const riftboundEl = riftboundContainer.querySelector(`#${id}`);
        if (riftboundEl && lastState[id] !== value) {
            riftboundEl.innerHTML = value;
            updated = true;
        }
    }

    // Update Vibes section
    if (vibesContainer) {
        const vibesEl = vibesContainer.querySelector(`#${id}`);
        if (vibesEl && lastState[id] !== value) {
            vibesEl.innerHTML = value;
            updated = true;
        }
    }

    // Update Star Wars section
    if (starwarsContainer) {
        const starwarsEl = starwarsContainer.querySelector(`#${id}`);
        if (starwarsEl && lastState[id] !== value) {
            if (id === 'event-round') {
                starwarsEl.innerHTML = value.replace(/\s+of\s+\d+/i, '');
            } else if (id !== 'player-leader-left' && id !== 'player-leader-right') {
                starwarsEl.innerHTML = value;
            }
            updated = true;
        }
        // Leader name formatting: always apply (split on comma, en-dash, em-dash, or spaced hyphen)
        if (starwarsEl && (id === 'player-leader-left' || id === 'player-leader-right')) {
            const raw = value ? value.trim() : '';
            const splitMatch = raw.match(/^(.+?)(?:\s*[,\u2013\u2014]\s*|\s+[-]\s+)(.+)$/);
            if (splitMatch) {
                starwarsEl.innerHTML = splitMatch[1] + '<br><span class="swu-leader-subtitle">' + splitMatch[2] + '</span>';
            } else {
                starwarsEl.innerHTML = raw;
            }
            updated = true;
        }
    }
    
    // Fallback: if not found in containers, try global search (for elements that don't exist in both sections)
    if (!updated) {
        const el = document.getElementById(id);
        if (el && lastState[id] !== value) {
            el.innerHTML = value;
            updated = true;
        }
    }
    
    if (updated) {
        lastState[id] = value;
    }
}

function updateState(data) {
    // Cache for the icon layer — roster may arrive before OR after state, so
    // both pipes (the socket below + this one) end by calling applyAllIcons()
    // and reading from whichever cache is populated.
    lastMatchData = data;

    // Snapshot the four 2v2 battlefield names into the row cache before the
    // per-key loop. Slots `-left-2` / `-right-2` have no matching DOM IDs in
    // scoreboard.html, so updateElementText would no-op on them — the row
    // renderer reads from this cache instead. We update before the loop so
    // updateRiftboundBattlefieldsRow() at the bottom sees consistent values
    // regardless of which slot's key the loop handled last.
    RB_BF_SLOTS.forEach(slot => {
        const k = `player-battlefield-${slot}`;
        if (k in data) rbBattlefieldNames[slot] = (data[k] || '').toString().trim();
    });

    Object.entries(data).forEach(([key, value]) => {
        // Handle runes (player-rune-color-1/2-left/right → render icons)
        if (/^player-rune-color-[12]-(left|right)$/.test(key)) {
            const side = key.endsWith('-left') ? 'left' : 'right';
            const slot = key.includes('-1-') ? 0 : 1;
            if (!lastState._runeColors) lastState._runeColors = {};
            const newVal = value ? value.trim().toLowerCase() : '';
            if (lastState._runeColors[`${side}-${slot}`] === newVal) return;
            lastState._runeColors[`${side}-${slot}`] = newVal;

            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                const runesContainer = riftboundContainer.querySelector(`#player-runes-${side}`);
                if (runesContainer) {
                    runesContainer.innerHTML = '';
                    for (let i = 0; i < 2; i++) {
                        const letter = lastState._runeColors[`${side}-${i}`];
                        const runeUrl = letter && RIFTBOUND_RUNES[letter];
                        if (runeUrl) {
                            const img = document.createElement('img');
                            img.src = runeUrl;
                            img.alt = `Rune ${letter}`;
                            img.className = 'riftbound-rune-icon';
                            runesContainer.appendChild(img);
                        }
                    }
                }
            }
            return;
        }
        
        // Handle legend backgrounds BEFORE general element handling.
        // Supports 1v1 ('-left'/'-right') AND 2v2 inner slots ('-left-2'/'-right-2').
        // The "side" suffix selects the background div; the team orientation
        // (left vs right asset variant in RIFTBOUND_LEGENDS) drops the trailing
        // '-2' so P2/P4 reuse the team's canonical legend image.
        if (["player-legend-left", "player-legend-right", "player-legend-left-2", "player-legend-right-2"].includes(key)) {
            // Handle Riftbound legend background images (only update if value changed)
            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                const side = key.replace('player-legend-', ''); // 'left' | 'left-2' | 'right' | 'right-2'
                const team = side.startsWith('left') ? 'left' : 'right'; // strip '-2' for asset lookup
                const currentValue = lastState[`legend-value-${side}`];
                const newValue = value ? value.trim() : '';

                // Only update if the value actually changed
                if (currentValue !== newValue) {
                    const backgroundDiv = riftboundContainer.querySelector(`.riftbound-player-legend-background.riftbound-player-legend-background-${side}`);

                    if (backgroundDiv) {
                        if (newValue) {
                            const legendValueLower = newValue.toLowerCase();
                            let matchedLegendKey = null;

                            // First try exact case-insensitive match
                            for (const legendKey in RIFTBOUND_LEGENDS) {
                                if (legendKey.toLowerCase() === legendValueLower) {
                                    matchedLegendKey = legendKey;
                                    break;
                                }
                            }

                            // If no exact match, check if the value contains any of the legend dictionary keys
                            // This handles cases like "Jinx, Loose Cannon" matching "Jinx"
                            if (!matchedLegendKey) {
                                for (const legendKey in RIFTBOUND_LEGENDS) {
                                    const legendKeyLower = legendKey.toLowerCase();
                                    // Check if the incoming value contains the legend key (e.g., "jinx, loose cannon" contains "jinx")
                                    if (legendValueLower.includes(legendKeyLower)) {
                                        matchedLegendKey = legendKey;
                                        break;
                                    }
                                }
                            }

                            if (matchedLegendKey) {
                                const legendData = RIFTBOUND_LEGENDS[matchedLegendKey];
                                if (legendData && legendData[team]) {
                                    const imageUrl = legendData[team];
                                    // Encode the URL to handle spaces and special characters in filenames
                                    const encodedUrl = encodeURI(imageUrl);
                                    // Add cache buster to force browser to reload image
                                    const cacheBuster = new Date().getTime();
                                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                    backgroundDiv.style.backgroundSize = '';
                                    backgroundDiv.style.backgroundPosition = '';
                                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                    // Don't force display: block on inner slots — CSS toggles visibility via --rb-legend-2-display
                                    if (side === 'left' || side === 'right') backgroundDiv.style.display = 'block';
                                    lastState[`legend-${side}`] = imageUrl;
                                    lastState[`legend-value-${side}`] = newValue;
                                } else {
                                }
                            } else {
                                // Use default images if legend name doesn't match
                                const defaultImageUrl = RIFTBOUND_LEGENDS_DEFAULT[team];
                                const encodedUrl = encodeURI(defaultImageUrl);
                                const cacheBuster = new Date().getTime();
                                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                backgroundDiv.style.backgroundSize = '';
                                backgroundDiv.style.backgroundPosition = '';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                if (side === 'left' || side === 'right') backgroundDiv.style.display = 'block';
                                lastState[`legend-${side}`] = defaultImageUrl;
                                lastState[`legend-value-${side}`] = newValue;
                            }
                        } else {
                            // Show default image if value is empty
                            const defaultImageUrl = RIFTBOUND_LEGENDS_DEFAULT[team];
                            const encodedUrl = encodeURI(defaultImageUrl);
                            const cacheBuster = new Date().getTime();
                            const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                            backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                            backgroundDiv.style.backgroundSize = '';
                            backgroundDiv.style.backgroundPosition = '';
                            backgroundDiv.style.backgroundRepeat = 'no-repeat';
                            if (side === 'left' || side === 'right') backgroundDiv.style.display = 'block';
                            lastState[`legend-${side}`] = defaultImageUrl;
                            lastState[`legend-value-${side}`] = '';
                        }
                    }
                }
            }
        }
        
        // Handle battlefield backgrounds BEFORE general element handling
        if (["player-battlefield-left", "player-battlefield-right"].includes(key)) {
            // Handle Riftbound battlefield background images (only update if value changed)
            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                const side = key === 'player-battlefield-left' ? 'left' : 'right';
                const currentValue = lastState[`battlefield-value-${side}`];
                const newValue = value ? value.trim() : '';

                // Only update if the value actually changed
                if (currentValue !== newValue) {
                    const backgroundDiv = riftboundContainer.querySelector(`.riftbound-player-battlefield-background.riftbound-player-battlefield-background-${side}`);

                    if (backgroundDiv) {
                        if (newValue) {
                            // Try exact match first
                            let battlefieldData = RIFTBOUND_BATTLEFIELDS[newValue];

                            // If no exact match, try case-insensitive match
                            if (!battlefieldData) {
                                const battlefieldNameLower = newValue.toLowerCase();
                                for (const key in RIFTBOUND_BATTLEFIELDS) {
                                    if (key.toLowerCase() === battlefieldNameLower) {
                                        battlefieldData = RIFTBOUND_BATTLEFIELDS[key];
                                        break;
                                    }
                                }
                            }

                            if (battlefieldData && battlefieldData[side]) {
                                const imageUrl = battlefieldData[side];
                                // Encode the URL to handle spaces and special characters in filenames
                                const encodedUrl = encodeURI(imageUrl);
                                // Add cache buster to force browser to reload image
                                const cacheBuster = new Date().getTime();
                                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                backgroundDiv.style.backgroundSize = '';
                                backgroundDiv.style.backgroundPosition = '';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                // Don't force display:block — CSS gates visibility via
                                // --rb-bf-bg-display so DSG 2v2 (which set this to `none`
                                // because its frame has no battlefield-bg slot) stays hidden.
                                lastState[`battlefield-${side}`] = imageUrl;
                                lastState[`battlefield-value-${side}`] = newValue;
                            } else {
                                // Use default image if battlefield name doesn't match
                                const defaultImageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT[side];
                                const encodedUrl = encodeURI(defaultImageUrl);
                                const cacheBuster = new Date().getTime();
                                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                backgroundDiv.style.backgroundSize = '';
                                backgroundDiv.style.backgroundPosition = '';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                // Don't force display:block — see note on the matched-bf branch.
                                lastState[`battlefield-${side}`] = defaultImageUrl;
                                lastState[`battlefield-value-${side}`] = newValue;
                            }
                        } else {
                            // Show default image if value is empty
                            const defaultImageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT[side];
                            const encodedUrl = encodeURI(defaultImageUrl);
                            const cacheBuster = new Date().getTime();
                            const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                            backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                            backgroundDiv.style.backgroundSize = '';
                            backgroundDiv.style.backgroundPosition = '';
                            backgroundDiv.style.backgroundRepeat = 'no-repeat';
                            // Don't force display:block — see note on the matched-bf branch.
                            lastState[`battlefield-${side}`] = defaultImageUrl;
                            lastState[`battlefield-value-${side}`] = '';
                        }
                    }
                }
            }
        }
        
        // Handle MTG-specific event round and event name
        if (key === 'event-round') {
            const mtgEventRound = document.getElementById('mtg-event-round');
            if (mtgEventRound && lastState['mtg-event-round'] !== value) {
                mtgEventRound.textContent = value;
                lastState['mtg-event-round'] = value;
            }
        }
        if (key === 'event-name') {
            const mtgEventName = document.getElementById('mtg-event-name');
            if (mtgEventName && lastState['mtg-event-name'] !== value) {
                mtgEventName.textContent = value;
                lastState['mtg-event-name'] = value;
            }
        }

        // Handle Star Wars base damage/HP composite display (uses player-life for damage)
        if (["player-life-left", "player-life-right", "player-base-hp-left", "player-base-hp-right"].includes(key)) {
            const side = key.includes('left') ? 'left' : 'right';
            // Use current value directly; fall back to lastState for the other field
            const damage = key.includes('player-life') ? value : (lastState[`player-life-${side}`] || '0');
            const hp = key.includes('player-base-hp') ? value : (lastState[`player-base-hp-${side}`] || '30');
            const composite = `${String(damage).padStart(2, '0')}/${hp}`;
            const statsEl = document.getElementById(`swu-base-stats-${side}`);
            if (statsEl) {
                statsEl.textContent = composite;
            }
        }

        // Handle Star Wars leader image lookup + name formatting
        if (["player-leader-left", "player-leader-right"].includes(key)) {
            const side = key === 'player-leader-left' ? 'left' : 'right';
            const starwarsContainer = document.getElementById('scoreboard-starwars');
            if (starwarsContainer) {
                const imgEl = starwarsContainer.querySelector(`#swu-leader-image-${side}`);
                if (imgEl) {
                    const leaderName = value ? value.trim() : '';
                    const matchedKey = findDictMatch(leaderName, SWU_LEADERS);
                    if (matchedKey && SWU_LEADERS[matchedKey]) {
                        imgEl.src = SWU_LEADERS[matchedKey];
                        imgEl.style.display = 'block';
                    } else {
                        imgEl.src = '';
                        imgEl.style.display = 'none';
                    }
                }
                // Leader name formatting moved to after updateElementText to avoid overwrite
            }
        }

        // Handle Star Wars base image lookup
        if (["player-base-left", "player-base-right"].includes(key)) {
            const side = key === 'player-base-left' ? 'left' : 'right';
            const starwarsContainer = document.getElementById('scoreboard-starwars');
            if (starwarsContainer) {
                const imgEl = starwarsContainer.querySelector(`#swu-base-image-${side}`);
                if (imgEl) {
                    const baseName = value ? value.trim() : '';
                    const matchedKey = findDictMatch(baseName, SWU_BASES);
                    if (matchedKey && SWU_BASES[matchedKey]) {
                        imgEl.src = SWU_BASES[matchedKey];
                        imgEl.style.display = 'block';
                    } else {
                        imgEl.src = '';
                        imgEl.style.display = 'none';
                    }
                }
            }
        }

        // Handle Star Wars leader aspects (two separate fields)
        if (["player-leader-aspect-1-left", "player-leader-aspect-1-right",
             "player-leader-aspect-2-left", "player-leader-aspect-2-right"].includes(key)) {
            const side = key.includes('left') ? 'left' : 'right';
            lastState[key] = value;
            const container = document.getElementById(`swu-leader-aspects-${side}`);
            if (container) {
                const a1 = lastState[`player-leader-aspect-1-${side}`] || '';
                const a2 = lastState[`player-leader-aspect-2-${side}`] || '';
                const combined = [a1, a2].filter(Boolean).join(', ');
                renderAspectIcons(combined, container);
            }
        }

        // Handle Star Wars base aspects
        if (["player-base-aspects-left", "player-base-aspects-right"].includes(key)) {
            const side = key.includes('left') ? 'left' : 'right';
            const container = document.getElementById(`swu-base-aspects-${side}`);
            if (container) {
                renderAspectIcons(value, container);
            }
            lastState[key] = value;
        }

        // Riftbound Showdown Might tracker — any showdown-* field change
        // triggers a re-render. Also re-render when the auto-source
        // battlefield names change (player-battlefield-left/right) so the
        // active BF's auto-derived name stays in sync.
        //
        // For showdown-* keys (which have NO matching #id DOM element on
        // the scoreboard), updateElementText would never set lastState[key],
        // so we must set it here for renderRiftboundShowdown to read the
        // new value. For player-battlefield-{left,right} (which DO have
        // matching elements), we leave it to updateElementText — setting
        // it here would suppress the DOM write (the guard skips if
        // lastState matches), which empties the text element and triggers
        // updateTheme's riftbound mode-switch to reset the bg to the
        // default URL.
        if (key.startsWith('showdown-')) {
            lastState[key] = value;
            renderRiftboundShowdown();
        } else if (key === 'player-battlefield-left' || key === 'player-battlefield-right') {
            renderRiftboundShowdown();
        }

        const el = document.getElementById(key);

        if (el) {
            if (["player-poison-left", "player-poison-right"].includes(key)) {
                const parent = el.parentElement;
                const shouldShow = value > 0;
                if (lastState[key + '_display'] !== shouldShow) {
                    parent.style.display = shouldShow ? 'inherit' : 'none';
                    lastState[key + '_display'] = shouldShow;
                }
            }

            // Riftbound XP tracker — toggle wrapper display based on > 0.
            // Mirrors the poison pattern above; the wrapper is .riftbound-player-xp-wrapper.
            if (["player-xp-left", "player-xp-right"].includes(key)) {
                const wrapper = el.parentElement;
                const numeric = parseInt(value, 10);
                const shouldShow = Number.isFinite(numeric) && numeric > 0;
                if (lastState[key + '_display'] !== shouldShow) {
                    wrapper.style.display = shouldShow ? 'flex' : 'none';
                    lastState[key + '_display'] = shouldShow;
                }
            }

            updateElementText(key, value);

            // Auto-scale riftbound text after updates
            if (['player-name-left', 'player-name-right'].includes(key)) {
                autoScaleRiftboundNames();
            }
            if (['player-record-left', 'player-record-right'].includes(key)) {
                autoScaleRiftboundRecords();
            }
            if (['player-life-left', 'player-life-right'].includes(key)) {
                autoScaleRiftboundPoints();
                // Score tracker bubbles fill based on life values.
                renderRiftboundScoreTracker();
            }
            if (['player-legend-left', 'player-legend-right',
                 'player-champion-left', 'player-champion-right',
                 'player-battlefield-left', 'player-battlefield-right'].includes(key)) {
                autoScaleRiftboundDetails();
            }
            // Battlefield changes affect the score tracker's MAX
            // (Aspirant's Climb adds +1), so re-render on bf updates.
            if (['player-battlefield-left', 'player-battlefield-right'].includes(key)) {
                renderRiftboundScoreTracker();
            }

            if (key === 'player-archetype-left') {
                updateBackground('left', value);
            } else if (key === 'player-archetype-right') {
                updateBackground('right', value);
            }
        } else if (["player-wins-left", "player-wins-right"].includes(key)) {
            // Handle MTG wins display
            const prefix = key === 'player-wins-left' ? "scorebug-left-life-wins" : "scorebug-right-life-wins";

            if (value > 1) {
                updateElementText(prefix + "-1", "&#11044;");
                updateElementText(prefix + "-2", "&#11044;");
            } else if (value > 0) {
                updateElementText(prefix + "-1", "&#11044;");
                updateElementText(prefix + "-2", "");
            } else {
                updateElementText(prefix + "-1", "");
                updateElementText(prefix + "-2", "");
            }
            
            // Handle Riftbound wins display with pip images (always update so data is ready when switching)
            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                if (key === 'player-wins-left') {
                    const pip1 = riftboundContainer.querySelector('#riftbound-wins-left-1');
                    const pip2 = riftboundContainer.querySelector('#riftbound-wins-left-2');
                    if (pip1 && pip2) {
                        // Use visibility (not display) so hidden pips keep their
                        // slot in the flex layout — pip1 stays anchored in its
                        // chrome ring even when pip2 is hidden.
                        if (value > 1) {
                            pip1.style.visibility = 'visible';
                            pip2.style.visibility = 'visible';
                        } else if (value > 0) {
                            pip1.style.visibility = 'visible';
                            pip2.style.visibility = 'hidden';
                        } else {
                            pip1.style.visibility = 'hidden';
                            pip2.style.visibility = 'hidden';
                        }
                    }
                } else if (key === 'player-wins-right') {
                    const pip1 = riftboundContainer.querySelector('#riftbound-wins-right-1');
                    const pip2 = riftboundContainer.querySelector('#riftbound-wins-right-2');
                    if (pip1 && pip2) {
                        if (value > 1) {
                            pip1.style.visibility = 'visible';
                            pip2.style.visibility = 'visible';
                        } else if (value > 0) {
                            pip1.style.visibility = 'visible';
                            pip2.style.visibility = 'hidden';
                        } else {
                            pip1.style.visibility = 'hidden';
                            pip2.style.visibility = 'hidden';
                        }
                    }
                }
            }

            // Handle Star Wars wins display with pip images (block/none like Riftbound)
            const starwarsContainer = document.getElementById('scoreboard-starwars');
            if (starwarsContainer) {
                const swuSide = key === 'player-wins-left' ? 'left' : 'right';
                const swuPip1 = starwarsContainer.querySelector(`#swu-wins-${swuSide}-1`);
                const swuPip2 = starwarsContainer.querySelector(`#swu-wins-${swuSide}-2`);
                if (swuPip1 && swuPip2) {
                    if (value > 1) {
                        swuPip1.style.display = 'block';
                        swuPip2.style.display = 'block';
                    } else if (value > 0) {
                        swuPip1.style.display = 'block';
                        swuPip2.style.display = 'none';
                    } else {
                        swuPip1.style.display = 'none';
                        swuPip2.style.display = 'none';
                    }
                }
            }
        } else if (["player-mana-symbols-left", "player-mana-symbols-right"].includes(key)) {
            if (key === 'player-mana-symbols-left') {
                renderManaSymbols(value, 'player-mana-symbols-left-symbols');
            }
            if (key === 'player-mana-symbols-right') {
                renderManaSymbols(value, 'player-mana-symbols-right-symbols');
            }
        }
    });
    // Re-stamp portrait icons whenever state changes (name edits arrive here).
    // Safe to call every update: applyIcon is idempotent on same-src writes.
    applyAllIcons();
    // Re-render the 2v2 battlefields row from the cache populated above.
    // No-op on vendor/playerCount combos that haven't opted in
    // (--rb-battlefields-row-display defaults to none).
    updateRiftboundBattlefieldsRow();
}

function updateBackground(side, archetypeName) {
    const backgroundElement = document.querySelector(`.background-${side}`);
    const archetype = archetypeList.find(d => d.name.toLowerCase() === archetypeName.toLowerCase());
    if (!backgroundElement) return;

    if (archetype && archetype.imageUrl) {
        const newUrl = archetype.imageUrl;
        const currentBg = lastState[`background-${side}`];

        if (currentBg !== newUrl) {
            const cacheBuster = new Date().getTime();
            const finalUrl = `${newUrl}?v=${cacheBuster}`;

            const img = new Image();
            img.onload = () => {
                backgroundElement.style.backgroundImage = `url(${finalUrl})`;
                backgroundElement.style.display = 'block';
                lastState[`background-${side}`] = newUrl;
            };
            // turning off archetypes image change for now
            // if img src is not set - img.onload is not run
            // img.src = finalUrl;
        }
    } else {
        if (lastState[`background-${side}`] !== 'none') {
            backgroundElement.style.backgroundImage = 'none';
            backgroundElement.style.display = 'none';
            lastState[`background-${side}`] = 'none';
        }
    }
}

// INITIAL STATE
if (isBroadcastMode) {
    // Broadcast mode: request current broadcast data
    socket.emit('get-broadcast-scoreboard-data');
    socket.emit('getArchetypeList');

    // Listen for round_id from broadcast tracker
    socket.on('broadcast-scoreboard-round-id', ({ round_id: rid }) => {
        round_id = rid;
        // Re-request timer and scoreboard state now that we know round_id
        socket.emit('get-all-timer-states');
        socket.emit('get-scoreboard-state');
    });

    // Listen for broadcast-round-data
    socket.on('broadcast-round-data', (data) => {
        if (data[match_id]) {
            updateState(data[match_id]);
        }
    });
} else {
    // Control mode: original behavior
    socket.emit('getSavedControlState', {control_id});
    socket.emit('getArchetypeList');

    socket.on('scoreboard-' + control_id + '-saved-state', (data) => {
        try {
            archetypeList = data['archetypeList'];
            round_id = data['round_id'];
            match_id = data['match_id'];
            updateState(data['data']);
        } catch (e) {
            console.error('Error in saved-state handler:', e);
        }
    });
}

socket.on('overlayHeaderBackgroundUpdate', (newImageUrl) => {
    const last = lastState['header-background'];
    if (last !== newImageUrl) {
        const cacheBuster = new Date().getTime();
        const el = document.querySelector(`#scoreboard-${currentGame} .header .background`);
        // null = no overlay uploaded for this game; clear inline style so CSS defaults apply
        if (el) el.style.backgroundImage = newImageUrl ? `url(${newImageUrl}?v=${cacheBuster})` : '';
        lastState['header-background'] = newImageUrl;
    }
});

socket.on('overlayFooterBackgroundUpdate', (newImageUrl) => {
    const last = lastState['footer-background'];
    if (last !== newImageUrl) {
        const cacheBuster = new Date().getTime();
        const el = document.querySelector(`#scoreboard-${currentGame} .footer .background`);
        if (el) el.style.backgroundImage = newImageUrl ? `url(${newImageUrl}?v=${cacheBuster})` : '';
        lastState['footer-background'] = newImageUrl;
    }
});

socket.on('archetypeListUpdated', (archetypes) => {
    archetypeList = archetypes;
    if (!isBroadcastMode) {
        socket.emit('getSavedControlState', {control_id});
    }
});

// Player roster → portrait-icon lookup table. Master-control editor emits
// `playerRosterUpdated` on add/delete/portrait-upload; applyAllIcons re-stamps
// every visible icon so newly-uploaded portraits refresh on open scoreboards
// without a reload.
socket.on('playerRosterUpdated', (players) => {
    rosterByName = new Map((players || []).map(p => [normalizeName(p.name), p.portraitUrl]));
    applyAllIcons();
});
socket.emit('getPlayerRoster');

// 2v2 battlefields row visibility — operator toggles per-slot Hide checkboxes
// in master-control. State lives in features/control.js (server authoritative,
// resets on restart). Independent of match data, so the row renderer needs to
// be re-run when only the flags change. Initial fetch handles late joiners.
socket.emit('get-battlefield-visibility');
socket.on('battlefield-visibility-updated', (flags) => {
    if (flags && typeof flags === 'object') {
        rbBattlefieldVisibility = { ...rbBattlefieldVisibility, ...flags };
    }
    updateRiftboundBattlefieldsRow();
});

// TIMER
socket.emit('get-all-timer-states');

socket.on('current-all-timer-states', ({timerState}) => {
    if (!round_id) return; // Not ready yet in broadcast mode
    const matchState = timerState[round_id]?.[match_id];
    if (matchState) {
        // For count up mode, always show the time (never show TURNS)
        // For count down mode, show TURNS when time reaches 0
        const timerText = matchState.countUp
            ? formatTime(matchState.time)
            : (matchState.time > 0 ? formatTime(matchState.time) : `TURN ${matchState.turnCount ?? 0}`);
        const shouldShow = matchState.show;
        
        // Update MTG timer
        const mtgContainer = document.getElementById('scoreboard-mtg');
        if (mtgContainer) {
            const mtgTimer = mtgContainer.querySelector('#timer');
            if (mtgTimer) {
                mtgTimer.innerText = timerText;
                mtgTimer.style.display = shouldShow ? 'block' : 'none';
            }
        }
        
        // Update Riftbound timer
        const riftboundContainer = document.getElementById('scoreboard-riftbound');
        if (riftboundContainer) {
            const riftboundTimer = riftboundContainer.querySelector('#timer');
            if (riftboundTimer) {
                riftboundTimer.innerText = timerText;
                riftboundTimer.style.display = shouldShow ? 'block' : 'none';
                const root = document.documentElement;
                const maxFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-timer-font-size') || '36', 10);
                const maxWidth = parseInt(getComputedStyle(root).getPropertyValue('--rb-timer-max-width') || '140', 10);
                autoScaleText(riftboundTimer, maxFont, 20, maxWidth);
            }
        }

        // Update Vibes timer
        const vibesContainer = document.getElementById('scoreboard-vibes');
        if (vibesContainer) {
            const vibesTimer = vibesContainer.querySelector('#timer');
            if (vibesTimer) {
                vibesTimer.innerText = timerText;
                vibesTimer.style.display = shouldShow ? 'block' : 'none';
            }
        }

        // Update Star Wars timer
        const starwarsContainer = document.getElementById('scoreboard-starwars');
        if (starwarsContainer) {
            const swuTimer = starwarsContainer.querySelector('#timer');
            if (swuTimer) {
                swuTimer.innerText = timerText;
                swuTimer.style.display = shouldShow ? 'block' : 'none';
            }
        }
    }
});

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// GLOBAL DATA
socket.emit('get-match-global-data');

socket.on('update-match-global-data', (data) => {
    const globalData = data.globalData || {};

    const miscText = globalData['global-event-miscellaneous-details'];
    const eventFormatText = globalData['global-event-format'];
    const eventNameText = globalData['global-event-name'];
    const eventRoundText = globalData['global-event-round'];

    if (miscText) updateElementText('miscellaneous-details', miscText);
    if (eventFormatText) updateElementText('event-format', eventFormatText);
    if (eventNameText) {
        updateElementText('event-name', eventNameText);
        // Also update MTG-specific event name element
        const mtgEventName = document.getElementById('mtg-event-name');
        if (mtgEventName) mtgEventName.textContent = eventNameText;
    }
    if (eventRoundText) {
        updateElementText('event-round', eventRoundText);
        // Also update MTG-specific event round element
        const mtgEventRound = document.getElementById('mtg-event-round');
        if (mtgEventRound) mtgEventRound.textContent = eventRoundText;
    }
});

// SCOREBOARD STATE DATA

// call for scoreboard state - for now its wins show check
socket.emit('get-scoreboard-state');

// Listen for updated scoreboard state from server
socket.on('scoreboard-state-data', ({scoreboardState}) => {
    if (!round_id) return; // Not ready yet in broadcast mode
    const matchState = scoreboardState[round_id]?.[match_id];
    if (matchState) {
        const winsDisplays = document.querySelectorAll('#scorebug-right-life-wins-1, #scorebug-right-life-wins-2, #scorebug-left-life-wins-1, #scorebug-left-life-wins-2');
        winsDisplays.forEach(el => {
            el.style.display = matchState.showWins ? 'flex' : 'none';
        });
    }
});

// MANA SYMBOLS

function renderManaSymbols(inputStr, containerId, scenario = {}) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear existing symbols

    const presentSymbols = new Set(
        inputStr.toUpperCase().split('').filter(char => MANA_SYMBOLS[char])
    );

    // If there are no valid symbols, hide the container and exit early
    if (presentSymbols.size === 0) {
        container.style.display = 'none';
        return;
    }

    // Otherwise, make sure it's visible
    container.style.display = 'flex';

    let symbolsToRender = MANA_ORDER.filter(symbol => presentSymbols.has(symbol));
    if (scenario.reverse === true) {
        symbolsToRender.reverse();
    }

    symbolsToRender.forEach(symbol => {
        const img = document.createElement('img');
        img.className = 'mana-symbols';
        img.src = MANA_SYMBOLS[symbol].src;
        img.alt = MANA_SYMBOLS[symbol].alt;
        container.appendChild(img);
    });
}

// game selection logic
function updateTheme(game, vendor, playerCount) {
    const normalized = game?.toLowerCase();
    if (!normalized) return;

    // Expose the vendor for CSS gating (e.g. the anu-only Restream chat overlay).
    document.body.dataset.vendor = vendor || 'default';
    // Lazy-load the Restream chat iframe the first time anu is active, so other
    // vendors never open a hidden Restream connection. URL comes from the
    // gitignored restream-config.js (window.RESTREAM_CHAT_URL).
    if (vendor === 'anu') {
        const chat = document.getElementById('rb-restream-chat');
        if (chat && !chat.getAttribute('src') && window.RESTREAM_CHAT_URL) {
            chat.src = window.RESTREAM_CHAT_URL;
        }
    }

    // --- Game switch (only when game actually changes) ---
    if (normalized !== selectedGame) {
        // Remove previous game class if it exists
        if (selectedGame) {
            document.body.classList.remove(selectedGame);
        }

        selectedGame = normalized;
        console.log('Game selection updated:', selectedGame);

        // Add game type class to body
        document.body.classList.add(selectedGame);

    // Show/hide appropriate scoreboard containers
    const mtgScoreboard = document.getElementById('scoreboard-mtg');
    const riftboundScoreboard = document.getElementById('scoreboard-riftbound');
    const vibesScoreboard = document.getElementById('scoreboard-vibes');
    const starwarsScoreboard = document.getElementById('scoreboard-starwars');

    if (selectedGame === 'mtg') {
        console.log('Switching scoreboard to MTG mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'block';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
        if (vibesScoreboard) vibesScoreboard.style.display = 'none';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'none';
    } else if (selectedGame === 'riftbound') {
        console.log('Switching scoreboard to Riftbound mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'block';
        if (vibesScoreboard) vibesScoreboard.style.display = 'none';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'none';
        
        // Apply battlefield images - always set a background (use default if empty or not found)
        const riftboundContainer = document.getElementById('scoreboard-riftbound');
        if (riftboundContainer) {
            const battlefieldLeftEl = riftboundContainer.querySelector('#player-battlefield-left');
            const battlefieldRightEl = riftboundContainer.querySelector('#player-battlefield-right');
            
            if (battlefieldLeftEl) {
                const battlefieldName = battlefieldLeftEl.textContent ? battlefieldLeftEl.textContent.trim() : '';
                let battlefieldData = null;
                
                if (battlefieldName) {
                    // Try exact match first
                    battlefieldData = RIFTBOUND_BATTLEFIELDS[battlefieldName];
                    
                    // If no exact match, try case-insensitive match
                    if (!battlefieldData) {
                        const battlefieldNameLower = battlefieldName.toLowerCase();
                        for (const key in RIFTBOUND_BATTLEFIELDS) {
                            if (key.toLowerCase() === battlefieldNameLower) {
                                battlefieldData = RIFTBOUND_BATTLEFIELDS[key];
                                break;
                            }
                        }
                    }
                }
                
                const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-battlefield-background.riftbound-player-battlefield-background-left');
                if (backgroundDiv) {
                    let imageUrl;
                    if (battlefieldData && battlefieldData.left) {
                        imageUrl = battlefieldData.left;
                    } else {
                        imageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT.left;
                    }
                    const encodedUrl = encodeURI(imageUrl);
                    const cacheBuster = new Date().getTime();
                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                    backgroundDiv.style.backgroundSize = '';
                    backgroundDiv.style.backgroundPosition = '';
                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                    // Don't force display:block — CSS gates visibility via
                    // --rb-bf-bg-display (DSG 2v2 sets it `none`).
                    lastState['battlefield-left'] = imageUrl;
                }
            }
            
            if (battlefieldRightEl) {
                const battlefieldName = battlefieldRightEl.textContent ? battlefieldRightEl.textContent.trim() : '';
                let battlefieldData = null;
                
                if (battlefieldName) {
                    // Try exact match first
                    battlefieldData = RIFTBOUND_BATTLEFIELDS[battlefieldName];
                    
                    // If no exact match, try case-insensitive match
                    if (!battlefieldData) {
                        const battlefieldNameLower = battlefieldName.toLowerCase();
                        for (const key in RIFTBOUND_BATTLEFIELDS) {
                            if (key.toLowerCase() === battlefieldNameLower) {
                                battlefieldData = RIFTBOUND_BATTLEFIELDS[key];
                                break;
                            }
                        }
                    }
                }
                
                const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-battlefield-background.riftbound-player-battlefield-background-right');
                if (backgroundDiv) {
                    let imageUrl;
                    if (battlefieldData && battlefieldData.right) {
                        imageUrl = battlefieldData.right;
                    } else {
                        imageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT.right;
                    }
                    const encodedUrl = encodeURI(imageUrl);
                    const cacheBuster = new Date().getTime();
                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                    backgroundDiv.style.backgroundSize = '';
                    backgroundDiv.style.backgroundPosition = '';
                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                    // Don't force display:block — see note on the left branch above.
                    lastState['battlefield-right'] = imageUrl;
                }
            }
            
            // Apply legend images - always set a background (use default if empty)
            const legendLeftEl = riftboundContainer.querySelector('#player-legend-left');
            const legendRightEl = riftboundContainer.querySelector('#player-legend-right');
            
            if (legendLeftEl) {
                const legendValue = legendLeftEl.textContent ? legendLeftEl.textContent.trim().toLowerCase() : '';
                let matchedLegendKey = null;
                
                if (legendValue) {
                    // First try exact case-insensitive match
                    for (const legendKey in RIFTBOUND_LEGENDS) {
                        if (legendKey.toLowerCase() === legendValue) {
                            matchedLegendKey = legendKey;
                            break;
                        }
                    }
                    
                    // If no exact match, check if the value contains any of the legend dictionary keys
                    if (!matchedLegendKey) {
                        for (const legendKey in RIFTBOUND_LEGENDS) {
                            if (legendValue.includes(legendKey.toLowerCase())) {
                                matchedLegendKey = legendKey;
                                break;
                            }
                        }
                    }
                }
                
                const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-legend-background.riftbound-player-legend-background-left');
                if (backgroundDiv) {
                    let imageUrl;
                    if (matchedLegendKey) {
                        const legendData = RIFTBOUND_LEGENDS[matchedLegendKey];
                        imageUrl = legendData && legendData.left ? legendData.left : RIFTBOUND_LEGENDS_DEFAULT.left;
                    } else {
                        imageUrl = RIFTBOUND_LEGENDS_DEFAULT.left;
                    }
                    const encodedUrl = encodeURI(imageUrl);
                    const cacheBuster = new Date().getTime();
                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                    backgroundDiv.style.backgroundSize = '';
                    backgroundDiv.style.backgroundPosition = '';
                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                    backgroundDiv.style.display = 'block';
                    lastState['legend-left'] = imageUrl;
                }
            }
            
            if (legendRightEl) {
                const legendValue = legendRightEl.textContent ? legendRightEl.textContent.trim().toLowerCase() : '';
                let matchedLegendKey = null;
                
                if (legendValue) {
                    // First try exact case-insensitive match
                    for (const legendKey in RIFTBOUND_LEGENDS) {
                        if (legendKey.toLowerCase() === legendValue) {
                            matchedLegendKey = legendKey;
                            break;
                        }
                    }
                    
                    // If no exact match, check if the value contains any of the legend dictionary keys
                    if (!matchedLegendKey) {
                        for (const legendKey in RIFTBOUND_LEGENDS) {
                            if (legendValue.includes(legendKey.toLowerCase())) {
                                matchedLegendKey = legendKey;
                                break;
                            }
                        }
                    }
                }
                
                const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-legend-background.riftbound-player-legend-background-right');
                if (backgroundDiv) {
                    let imageUrl;
                    if (matchedLegendKey) {
                        const legendData = RIFTBOUND_LEGENDS[matchedLegendKey];
                        imageUrl = legendData && legendData.right ? legendData.right : RIFTBOUND_LEGENDS_DEFAULT.right;
                    } else {
                        imageUrl = RIFTBOUND_LEGENDS_DEFAULT.right;
                    }
                    const encodedUrl = encodeURI(imageUrl);
                    const cacheBuster = new Date().getTime();
                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                    backgroundDiv.style.backgroundSize = '';
                    backgroundDiv.style.backgroundPosition = '';
                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                    backgroundDiv.style.display = 'block';
                    lastState['legend-right'] = imageUrl;
                }
            }

            // Inner team-A / team-B legend slots (P2 / P4) — only paint if the
            // corresponding text holder is present (it always is in scoreboard.html
            // now). Don't force display:block; CSS gates visibility via
            // --rb-legend-2-display so 1v1 / non-DSG vendors stay hidden.
            ['left-2', 'right-2'].forEach(slot => {
                const team = slot.startsWith('left') ? 'left' : 'right';
                const textEl = riftboundContainer.querySelector(`#player-legend-${slot}`);
                const backgroundDiv = riftboundContainer.querySelector(`.riftbound-player-legend-background.riftbound-player-legend-background-${slot}`);
                if (!backgroundDiv) return;
                const legendValue = textEl && textEl.textContent ? textEl.textContent.trim().toLowerCase() : '';
                let matchedLegendKey = null;
                if (legendValue) {
                    for (const legendKey in RIFTBOUND_LEGENDS) {
                        if (legendKey.toLowerCase() === legendValue) { matchedLegendKey = legendKey; break; }
                    }
                    if (!matchedLegendKey) {
                        for (const legendKey in RIFTBOUND_LEGENDS) {
                            if (legendValue.includes(legendKey.toLowerCase())) { matchedLegendKey = legendKey; break; }
                        }
                    }
                }
                let imageUrl;
                if (matchedLegendKey) {
                    const legendData = RIFTBOUND_LEGENDS[matchedLegendKey];
                    imageUrl = legendData && legendData[team] ? legendData[team] : RIFTBOUND_LEGENDS_DEFAULT[team];
                } else {
                    imageUrl = RIFTBOUND_LEGENDS_DEFAULT[team];
                }
                const encodedUrl = encodeURI(imageUrl);
                const cacheBuster = new Date().getTime();
                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                backgroundDiv.style.backgroundSize = '';
                backgroundDiv.style.backgroundPosition = '';
                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                lastState[`legend-${slot}`] = imageUrl;
            });
        }
    } else if (selectedGame === 'vibes') {
        console.log('Scoreboard switching to Vibes mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
        if (vibesScoreboard) vibesScoreboard.style.display = 'block';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'none';
    } else if (selectedGame === 'starwars') {
        console.log('Switching scoreboard to Star Wars mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
        if (vibesScoreboard) vibesScoreboard.style.display = 'none';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'block';
    } else {
        // Default: hide all if unknown game type
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
        if (vibesScoreboard) vibesScoreboard.style.display = 'none';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'none';
    }
    } // end game-switch block

    // --- Vendor overrides (always run) ---
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        // Clear all previous vendor overrides so defaults kick in
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
        // Apply new vendor overrides
        const overrides = vc.getOverrides(normalized, vendor, playerCount);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });

        // Update scoreboard frame — try mp4 first, fallback to PNG
        const frameSelectors = {
            mtg: '#scoreboard-mtg .mtg-frame',
            riftbound: '#scoreboard-riftbound .riftbound-frame',
            vibes: '#scoreboard-vibes .vibes-frame',
            starwars: '#scoreboard-starwars .starwars-frame',
        };
        const frameSelector = frameSelectors[normalized];
        if (frameSelector) {
            const frameEl = document.querySelector(frameSelector);
            if (frameEl) {
                const framePath = vc.getAssetPath(`/assets/images/${normalized}/scoreboard/frame/${normalized}-scoreboard-frame.png`, vendor, playerCount);
                frameEl.style.backgroundImage = `url("${framePath}")`;
            }
        }

        // Update legend over-frame (above frame, same position as legend portraits)
        if (normalized === 'riftbound') {
            const overFramePath = vc.getAssetPath(`/assets/images/${normalized}/scoreboard/frame/${normalized}-scoreboard-over_frame.png`, vendor, playerCount);
            document.querySelectorAll('.riftbound-player-legend-over-frame').forEach(el => {
                el.style.backgroundImage = `url("${overFramePath}")`;
            });
        }

        // Riftbound: try animated mp4 frame, fallback to PNG
        if (normalized === 'riftbound') {
            // resolveAssetVendor → asset-aliased vendors (e.g. uvs-unleashed)
            // borrow default's chrome FILES so these raw paths don't 404.
            const v = vc.resolveAssetVendor(vendor);
            const p = playerCount || '1v1';
            const videoEl = document.getElementById('riftbound-frame-video');
            const bgVideoContainer = document.querySelector('#scoreboard-riftbound .riftbound-bg-video');
            if (videoEl && bgVideoContainer) {
                const mp4Path = `/assets/animations/riftbound/scoreboard/frame/riftbound-scoreboard-frame-${v}-${p}.mp4`;
                const maskPath = `/assets/animations/riftbound/scoreboard/frame/riftbound-scoreboard-frame-${v}-${p}-mask.png`;
                videoEl.oncanplay = () => {
                    bgVideoContainer.style.display = 'block';
                    bgVideoContainer.style.webkitMaskImage = `url("${maskPath}")`;
                    bgVideoContainer.style.maskImage = `url("${maskPath}")`;
                };
                videoEl.onerror = () => {
                    bgVideoContainer.style.display = 'none';
                };
                videoEl.src = mp4Path;
            }

            // Set riftbound pip images dynamically based on vendor + playerCount
            const leftPipPath = `/assets/images/riftbound/scoreboard/pips/scoreboard-pips-${v}-${p}-left.png`;
            const rightPipPath = `/assets/images/riftbound/scoreboard/pips/scoreboard-pips-${v}-${p}-right.png`;
            document.documentElement.style.setProperty('--rb-pip-left-url', `url("${leftPipPath}")`);
            document.documentElement.style.setProperty('--rb-pip-right-url', `url("${rightPipPath}")`);

            // Re-scale names/details after vendor switch (font size limits may have changed)
            autoScaleRiftboundNames();
            autoScaleRiftboundDetails();
            autoScaleRiftboundRecords();
            autoScaleRiftboundPoints();
            // Re-render the shared score tracker — bubble layout depends
            // on current life + battlefield values; refresh after vendor
            // switch so the right vendor's display var applies.
            renderRiftboundScoreTracker();
            // Re-render the showdown might tracker — text + art may have
            // been hydrated before the vendor's display var applied.
            renderRiftboundShowdown();
        }
    }
}

socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('starwars-get-leaders-and-bases');

// Game/vendor/playerCount handlers all call applyAllIcons() at the end so
// the per-vendor portrait pool re-resolves whenever the selection changes
// (URL is keyed off currentGame + currentVendor + currentPlayerCount).
socket.on('server-current-game-selection', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    applyAllIcons();
});
socket.on('game-selection-updated', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    applyAllIcons();
});
socket.on('server-current-vendor-selection', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    applyAllIcons();
});
socket.on('vendor-selection-updated', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    applyAllIcons();
});
socket.on('server-current-player-count', ({playerCount}) => {
    currentPlayerCount = playerCount;
    document.body.dataset.playerCount = playerCount;  // gates 2v2 DOM via CSS
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    applyAllIcons();
});
socket.on('player-count-updated', ({playerCount}) => {
    currentPlayerCount = playerCount;
    document.body.dataset.playerCount = playerCount;  // gates 2v2 DOM via CSS
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    applyAllIcons();
});

socket.on('starwars-leaders-and-bases', ({ leaders, bases }) => {
    leaders.forEach(l => { SWU_LEADERS[l.name] = l.image; });
    bases.forEach(b => { SWU_BASES[b.name] = b.image; });
});

// end game selection logic

// ─── Card View Overlay on Scoreboard ───
// card-id 1 = left, card-id 2 = right
const CARD_VIEW_EVENTS = [
    'card-view-card-selected',
    'vibes-card-view-card-selected',
    'riftbound-card-view-card-selected',
    'starwars-card-view-card-selected'
];

// Elements to hide per side when card overlay is shown (Star Wars)
const SWU_LEADER_BASE_CLASSES = [
    'swu-leader-name', 'swu-leader-image',
    'swu-base-name', 'swu-base-image'
];

function setSwuOverlayVisibility(side, visible) {
    const display = visible ? '' : 'none';
    for (const cls of SWU_LEADER_BASE_CLASSES) {
        const el = document.querySelector(`#scoreboard-starwars .${cls}-${side}`);
        if (el) el.style.display = display;
    }
}

// Maps currentGame → DOM prefix for the on-scoreboard card overlay.
// Games not in this map silently no-op (e.g. vibes — no overlay built yet).
// Replaces a prior `currentGame === 'riftbound' ? 'riftbound' : 'swu'` ternary
// that silently routed MTG + vibes into the hidden starwars overlay elements.
const GAME_TO_OVERLAY_PREFIX = {
    mtg:       'mtg',
    riftbound: 'riftbound',
    starwars:  'swu',
};

// Per-overlay state for the MTG preload + sequenced-crossfade pipeline.
// Keyed by the overlay element (not by side), so left/right are independent:
//   activeIdx        : which of the two .mtg-card-slot imgs currently holds
//                      the visible card (0 or 1). Incoming View targets the
//                      OTHER slot so the crossfade has somewhere to fade in.
//   token            : symbol identifying the in-flight preload. A newer
//                      View replaces it; when an older preload finally
//                      resolves we compare and bail if superseded.
//   pendingFadeTimer : handle for the delayed outgoing-slot fade-out. Kept
//                      so Reset (or a rapid subsequent View) can cancel it.
//   stale            : set by Reset. On the next reveal we instant-clear
//                      slot state (transition:none) while the overlay is
//                      still hidden — otherwise the prior card's slot, still
//                      .active with opacity 1, flashes through the overlay's
//                      opacity-0-to-1 fade-in on Case A.
const mtgOverlayState = new WeakMap();

// Safety timeout for the preload. If neither onload nor onerror fires within
// this window (stuck request, network stall), we reveal anyway so the
// operator isn't left staring at a blank overlay. Worst case = today's
// pre-preload behavior, but only after the timeout.
const MTG_PRELOAD_TIMEOUT_MS = 2000;

function handleCardViewOnScoreboard(data) {
    const prefix = GAME_TO_OVERLAY_PREFIX[currentGame];
    if (!prefix) return;

    const side = data['card-id']?.toString() === '1' ? 'left' : 'right';
    const overlay = document.getElementById(`${prefix}-card-overlay-${side}`);
    const img = document.getElementById(`${prefix}-card-overlay-img-${side}`);
    if (!overlay || !img) return;

    if (data.url) {
        showCardOverlay(prefix, overlay, img, data.url);
        if (currentGame === 'starwars') setSwuOverlayVisibility(side, false);
    } else {
        resetCardOverlay(prefix, overlay, img);
        if (currentGame === 'starwars') setSwuOverlayVisibility(side, true);
    }
}

function showCardOverlay(prefix, overlay, img, url) {
    if (prefix === 'mtg') {
        // MTG routes through its own preload + crossfade pipeline. The passed
        // `img` is one of the two .mtg-card-slot elements inside the overlay —
        // showMtgCardOverlay queries both slots from the overlay and manages
        // them directly, so we intentionally don't touch `img` here.
        showMtgCardOverlay(overlay, url);
        return;
    }
    if (prefix === 'riftbound' && currentPlayerCount === '2v2') {
        // 2v2 riftbound (DSG today) routes through the slide+fade+tilt-in
        // pipeline that mirrors MTG flyquest. No Scryfall preload needed —
        // riftbound card PNGs are served locally so onload is effectively
        // immediate; the function just runs the crossfade in the same tick.
        showRiftboundCardOverlay(overlay, url);
        return;
    }
    // riftbound 1v1 + swu: unchanged — local assets, no preload needed. Set
    // src and snap on via display:block.
    img.src = url;
    overlay.style.display = 'block';
}

function resetCardOverlay(prefix, overlay, img) {
    if (prefix === 'riftbound') {
        if (currentPlayerCount === '2v2') {
            // 2v2: animated reset — mirrors the MTG path. Pin transform inline
            // so ONLY rotateY reverses (no vertical slide on exit), fade dim
            // + overlay opacity in parallel, then on transitionend silently
            // re-cock to the base below-rest anchor for the next reveal.
            // Mark slots stale so the next reveal instant-clears them before
            // fading the new card in (same recovery pattern as MTG —
            // otherwise the prior card flashes through the overlay's 0→1
            // opacity fade-in on the next View).
            const state = riftboundOverlayState.get(overlay);
            if (state) {
                if (state.pendingFadeTimer) {
                    clearTimeout(state.pendingFadeTimer);
                    state.pendingFadeTimer = null;
                }
                state.stale = true;
            }
            const perspective = getComputedStyle(overlay).getPropertyValue('--rb-card-perspective').trim() || '1500px';
            overlay.style.transform = `perspective(${perspective}) translateY(0px) rotateY(0deg)`;
            document.getElementById('riftbound-card-dim')?.classList.remove('visible');
            overlay.classList.remove('visible');
            const cleanup = (e) => {
                if (e.propertyName !== 'opacity' || e.target !== overlay) return;
                overlay.removeEventListener('transitionend', cleanup);
                overlay.style.transition = 'none';
                overlay.style.transform = '';
                void overlay.offsetWidth;       // flush the no-transition state
                overlay.style.transition = '';  // restore CSS-defined transitions
            };
            overlay.addEventListener('transitionend', cleanup);
            return;
        }
        // 1v1 (legacy): reset to a card-back image rather than hiding.
        img.src = '/assets/images/riftbound/cards/riftbound-card-back.jpg';
        return;
    }
    if (prefix === 'mtg') {
        // Cancel any in-flight preload/fade timers from showMtgCardOverlay and
        // mark slots stale so the next reveal instant-clears them before fading
        // the new card in. We don't remove .active here — the overlay's opacity
        // fade handles hiding the current card during reset; pulling .active
        // off slots now would start a slot-level fade-out that competes with
        // the overlay fade and make the exit animation feel wrong.
        const state = mtgOverlayState.get(overlay);
        if (state) {
            state.token = null;
            if (state.pendingFadeTimer) {
                clearTimeout(state.pendingFadeTimer);
                state.pendingFadeTimer = null;
            }
            state.stale = true;
        }

        // MTG reset: rotateY animates back to 0° while opacity fades 1→0, but
        // NO vertical slide (user spec: "fade out without any motion" aside from
        // the tilt reversal). Mechanics:
        //   1. Pin transform inline at 'perspective(…) translateY(0) rotateY(0)'.
        //      Because .visible's transform is 'perspective(…) translateY(0)
        //      rotateY(--tilt)', transitioning to the pin changes ONLY rotateY
        //      (translateY stays at 0 = no slide). Keeping the full transform
        //      string (not just one component) ensures the transition interpolates
        //      cleanly instead of recomputing from a different matrix.
        //   2. transition-property stays as the CSS default (opacity, transform),
        //      so both opacity AND the rotateY change animate in parallel.
        //   3. Remove .visible from the card overlay AND the dim layer — dim
        //      opacity transitions from 1→0 over the same --mtg-card-fade-duration.
        //   4. On opacity transitionend, silently re-cock: disable transitions,
        //      clear the inline transform override (base rule's translateY(offset)
        //      + rotateY(0) re-applies instantly), reflow, re-enable transitions
        //      so the next .visible animates the full slide-up + tilt-in fresh.
        const perspective = getComputedStyle(overlay).getPropertyValue('--mtg-card-perspective').trim() || '1500px';
        overlay.style.transform = `perspective(${perspective}) translateY(0px) rotateY(0deg)`;
        document.getElementById('mtg-card-dim')?.classList.remove('visible');
        overlay.classList.remove('visible');

        const cleanup = (e) => {
            if (e.propertyName !== 'opacity' || e.target !== overlay) return;
            overlay.removeEventListener('transitionend', cleanup);
            overlay.style.transition = 'none';
            overlay.style.transform = '';
            void overlay.offsetWidth;       // flush the no-transition state
            overlay.style.transition = '';  // restore CSS-defined transitions
        };
        overlay.addEventListener('transitionend', cleanup);
        return;
    }
    // starwars: unchanged — snap off via display:none + empty src.
    img.src = '';
    overlay.style.display = 'none';
}

// MTG-only reveal path: preloads the Scryfall PNG off-DOM, then crossfades it
// in over the currently-visible slot. Motivation:
//   * Scryfall is a remote CDN (~100-500ms typical, 2s worst case) whereas
//     Riftbound/SWU card PNGs are served locally — setting img.src + adding
//     .visible in the same frame used to clip-in the image row-by-row as the
//     stream arrived mid-animation. Preloading gates the reveal on onload so
//     the animation always plays against a complete bitmap.
//   * Two-slot sequenced crossfade (SLOT_FADE_MS new-in, then SLOT_FADE_MS
//     old-out with the new slot z-boosted on top) means Case B swaps (View
//     card B while card A is still shown) transition smoothly without the
//     old bitmap getting dropped mid-render.
//
// Three user-visible cases, one code path:
//   Case A (viewer off, press View)       — wasVisible=false; reveal triggers
//                                            the overlay's slide/tilt-in *and*
//                                            the incoming slot's fade.
//   Case B (viewer on, press View again)  — wasVisible=true; overlay stays
//                                            put, only the slots crossfade.
//   Case Reset → View                     — stale flag set in resetCardOverlay
//                                            triggers an instant slot-clear
//                                            here before the new fade starts.
function showMtgCardOverlay(overlay, url) {
    const slots = overlay.querySelectorAll('.mtg-card-slot');
    if (slots.length !== 2) return;  // HTML drift guard; should always be 2

    let state = mtgOverlayState.get(overlay);
    if (!state) {
        state = { activeIdx: 0, token: null, pendingFadeTimer: null, stale: false };
        mtgOverlayState.set(overlay, state);
    }

    // New token supersedes any in-flight preload for this overlay; if that
    // older preload eventually resolves, its reveal() will bail on the mismatch.
    const token = Symbol('mtg-card-preload');
    state.token = token;

    // Capture visibility *before* any state change so the reveal closure runs
    // Case A vs Case B correctly even if .visible is toggled (by Reset, etc.)
    // while the preload is in flight.
    const wasVisible = overlay.classList.contains('visible');

    // Read slot-fade duration from CSS so the setTimeout that delays the
    // outgoing slot's fade-out stays in lockstep with the CSS transition.
    const fadeMs = parseFloat(
        getComputedStyle(overlay).getPropertyValue('--mtg-card-slot-fade-duration')
    ) || 400;

    const reveal = () => {
        // Bail if superseded (newer View) or cleared (Reset mid-preload).
        if (state.token !== token) return;
        state.token = null;

        // If a previous swap's outgoing-slot fade-out is still pending, run it
        // now so that slot is cleanly inactive before we repurpose it for the
        // incoming card.
        if (state.pendingFadeTimer) {
            clearTimeout(state.pendingFadeTimer);
            state.pendingFadeTimer = null;
            slots.forEach(s => s.classList.remove('active'));
        }

        // Reset→View recovery: slots still hold the previous card as .active
        // but the overlay itself was hidden by the reset. Instant-clear (with
        // transition suppressed) while overlay is still at opacity 0, so
        // there's no visible flash when the overlay fades back in.
        if (state.stale) {
            state.stale = false;
            slots.forEach(s => {
                s.style.transition = 'none';
                s.classList.remove('active');
            });
            void slots[0].offsetWidth;                      // flush the no-transition state
            slots.forEach(s => { s.style.transition = ''; });
        }

        const nextIdx = 1 - state.activeIdx;
        const nextSlot = slots[nextIdx];
        const prevSlot = slots[state.activeIdx];
        nextSlot.src = url;

        // Both slots are absolute at top:0 left:0 — DOM order alone would put
        // slots[1] always on top. On every swap, hoist the incoming slot so
        // it fades in *over* the outgoing (which stays fully opaque for the
        // first fadeMs of the sequenced crossfade, occluded once new hits 1).
        nextSlot.style.zIndex = '2';
        prevSlot.style.zIndex = '1';

        requestAnimationFrame(() => {
            nextSlot.classList.add('active');
            state.activeIdx = nextIdx;

            // Sequenced fade-out: don't pull .active off the outgoing slot
            // until the incoming is fully opaque (fadeMs later). Skip the
            // timer entirely if the outgoing slot isn't actually .active —
            // fresh install, post-Reset clear, or two blank slots.
            if (prevSlot.classList.contains('active')) {
                const timer = setTimeout(() => {
                    if (state.pendingFadeTimer !== timer) return;
                    state.pendingFadeTimer = null;
                    prevSlot.classList.remove('active');
                }, fadeMs);
                state.pendingFadeTimer = timer;
            }

            // Case A (overlay was hidden): run the overlay's slide/tilt-in
            // reveal now. Mirrors the pre-preload code's snap-to-base-state
            // pattern so a Reset-pinned inline transform doesn't stick through
            // the fresh animation.
            if (!wasVisible) {
                overlay.style.transition = 'none';
                overlay.style.transform = '';
                overlay.style.transitionProperty = '';
                void overlay.offsetWidth;
                overlay.style.transition = '';
                document.getElementById('mtg-card-dim')?.classList.add('visible');
                overlay.classList.add('visible');
            }
        });
    };

    // Off-DOM preload. Guard with `settled` so the 2s safety timeout can't
    // race with a legit onload/onerror and fire reveal() twice.
    let settled = false;
    const onSuccess = () => { if (!settled) { settled = true; reveal(); } };
    const onFailure = () => {
        if (settled) return;
        settled = true;
        if (state.token === token) state.token = null;
        console.warn('[mtg card view] preload failed:', url);
        // Deliberately don't reveal on error — avoids flashing a broken-image
        // icon on-air. Operator retries with a fresh View.
    };

    const preloader = new Image();
    preloader.onload = onSuccess;
    preloader.onerror = onFailure;
    preloader.src = url;

    setTimeout(onSuccess, MTG_PRELOAD_TIMEOUT_MS);
}

// Per-overlay state for the riftbound 2v2 sequenced-crossfade pipeline. Keyed
// by the overlay element so left/right are independent. Mirrors mtgOverlayState
// but without the `token`/preload guard since riftbound PNGs are served locally
// (onload is effectively immediate; the reveal can run in the same tick as the
// call without flashing a half-loaded image):
//   activeIdx        : which of the two .riftbound-card-slot imgs currently
//                      holds the visible card (0 or 1). The next View targets
//                      the OTHER slot so the crossfade has a destination.
//   pendingFadeTimer : handle for the delayed outgoing-slot fade-out. Kept so
//                      Reset (or a rapid subsequent View) can cancel it.
//   stale            : set by Reset. On the next reveal we instant-clear slot
//                      state (transition:none) while the overlay is still
//                      hidden — otherwise the prior card's slot, still .active
//                      with opacity 1, flashes through the overlay's fade-in.
const riftboundOverlayState = new WeakMap();

// Riftbound 2v2 reveal path — mirrors showMtgCardOverlay's three-case
// crossfade pattern, minus the off-DOM Scryfall preload (local assets):
//   Case A (viewer off, press View)       — wasVisible=false; runs the
//                                            overlay slide+fade+tilt-in *and*
//                                            the incoming slot's fade.
//   Case B (viewer on, press View again)  — wasVisible=true; overlay stays
//                                            put, only the slots crossfade.
//   Case Reset → View                     — stale flag from resetCardOverlay
//                                            triggers an instant slot-clear
//                                            here before the new fade starts.
function showRiftboundCardOverlay(overlay, url) {
    const slots = overlay.querySelectorAll('.riftbound-card-slot');
    if (slots.length !== 2) return;  // HTML drift guard; should always be 2

    let state = riftboundOverlayState.get(overlay);
    if (!state) {
        state = { activeIdx: 0, pendingFadeTimer: null, stale: false };
        riftboundOverlayState.set(overlay, state);
    }

    // Capture visibility *before* any state change so the Case A vs Case B
    // branch below is correct even if .visible is being toggled elsewhere.
    const wasVisible = overlay.classList.contains('visible');

    // Read slot-fade duration from CSS so the setTimeout that delays the
    // outgoing slot's fade-out stays in lockstep with the CSS transition.
    const fadeMs = parseFloat(
        getComputedStyle(overlay).getPropertyValue('--rb-card-slot-fade-duration')
    ) || 400;

    // If a previous swap's outgoing-slot fade-out is still pending, run it
    // now so that slot is cleanly inactive before we repurpose it for the
    // incoming card.
    if (state.pendingFadeTimer) {
        clearTimeout(state.pendingFadeTimer);
        state.pendingFadeTimer = null;
        slots.forEach(s => s.classList.remove('active'));
    }

    // Reset→View recovery: slots still hold the previous card as .active but
    // the overlay itself was hidden by the reset. Instant-clear (with
    // transition suppressed) while the overlay is still at opacity 0, so
    // there's no visible flash when the overlay fades back in on Case A.
    if (state.stale) {
        state.stale = false;
        slots.forEach(s => {
            s.style.transition = 'none';
            s.classList.remove('active');
        });
        void slots[0].offsetWidth;                      // flush no-transition state
        slots.forEach(s => { s.style.transition = ''; });
    }

    const nextIdx = 1 - state.activeIdx;
    const nextSlot = slots[nextIdx];
    const prevSlot = slots[state.activeIdx];
    nextSlot.src = url;

    // Both slots are absolute at top:0 left:0 — DOM order alone would put
    // slots[1] always on top. On every swap, hoist the incoming slot so it
    // fades in *over* the outgoing (which stays fully opaque for the first
    // fadeMs of the sequenced crossfade, occluded once new hits opacity 1).
    nextSlot.style.zIndex = '2';
    prevSlot.style.zIndex = '1';

    requestAnimationFrame(() => {
        nextSlot.classList.add('active');
        state.activeIdx = nextIdx;

        // Sequenced fade-out: don't pull .active off the outgoing slot until
        // the incoming is fully opaque (fadeMs later). Skip the timer entirely
        // if the outgoing slot isn't actually .active — fresh install,
        // post-Reset clear, or two blank slots.
        if (prevSlot.classList.contains('active')) {
            const timer = setTimeout(() => {
                if (state.pendingFadeTimer !== timer) return;
                state.pendingFadeTimer = null;
                prevSlot.classList.remove('active');
            }, fadeMs);
            state.pendingFadeTimer = timer;
        }

        // Case A (overlay was hidden): run the overlay's slide/tilt-in reveal
        // now. Mirrors the MTG snap-to-base-state pattern so a Reset-pinned
        // inline transform doesn't stick through the fresh animation.
        if (!wasVisible) {
            // Clear any inline display:none left from a prior 1v1 path. The
            // 2v2 path controls visibility via the .visible class on opacity,
            // not display, so this gets out of the way for the CSS rules.
            overlay.style.display = '';
            overlay.style.transition = 'none';
            overlay.style.transform = '';
            overlay.style.transitionProperty = '';
            void overlay.offsetWidth;
            overlay.style.transition = '';
            document.getElementById('riftbound-card-dim')?.classList.add('visible');
            overlay.classList.add('visible');
        }
    });
}

CARD_VIEW_EVENTS.forEach(event => {
    socket.on(event, handleCardViewOnScoreboard);
});

