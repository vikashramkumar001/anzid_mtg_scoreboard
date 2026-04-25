const socket = io();
window.roomManager = new RoomManager(socket);

// Slot positions config: bracket ID, x/y pixel position, animation delay
const SLOT_CONFIG = [
    // QF Match 1: 1 vs 8
    { id: 'bracket-quarterfinal-1', x: 194, y: 325, delay: 2000 },
    { id: 'bracket-quarterfinal-8', x: 194, y: 389, delay: 2100 },
    // QF Match 2: 4 vs 5
    { id: 'bracket-quarterfinal-4', x: 194, y: 495, delay: 2200 },
    { id: 'bracket-quarterfinal-5', x: 194, y: 559, delay: 2300 },
    // QF Match 3: 2 vs 7
    { id: 'bracket-quarterfinal-2', x: 194, y: 665, delay: 2400 },
    { id: 'bracket-quarterfinal-7', x: 194, y: 729, delay: 2500 },
    // QF Match 4: 3 vs 6
    { id: 'bracket-quarterfinal-3', x: 194, y: 835, delay: 2600 },
    { id: 'bracket-quarterfinal-6', x: 194, y: 899, delay: 2700 },
    // SF (tight pairs, 8px gap, centered between feeder QF pairs)
    { id: 'bracket-semifinal-1a', x: 748, y: 410, delay: 2100 },
    { id: 'bracket-semifinal-1b', x: 748, y: 474, delay: 2200 },
    { id: 'bracket-semifinal-2a', x: 748, y: 750, delay: 2500 },
    { id: 'bracket-semifinal-2b', x: 748, y: 814, delay: 2600 },
    // Finals (tight pair, 8px gap, centered between SF pairs)
    { id: 'bracket-final-1a', x: 1302, y: 580, delay: 2300 },
    { id: 'bracket-final-1b', x: 1302, y: 644, delay: 2400 },
];

const SLOT_WIDTH = 424;
const SLOT_HEIGHT = 56;

// Bracket line connections: two pairs merge at a vertical bar, single output to target pair midpoint
const BRACKET_CONNECTIONS = [
    // QF → SF
    { pair1: [0, 1], pair2: [2, 3], targetPair: [8, 9] },
    { pair1: [4, 5], pair2: [6, 7], targetPair: [10, 11] },
    // SF → Finals
    { pair1: [8, 9], pair2: [10, 11], targetPair: [12, 13] },
];

let bracketData = {};

// --- Theme state ---

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';
let textColorFull = 'rgba(0,0,0, 1)';
let textColorFaded = 'rgba(0,0,0, 0.5)';

// ── FQ 2v2 portrait roster ─────────────────────────────────────────────
// Mirrors the pattern in broadcast-round-standings-combined.js. The 2v2
// bracket slots render two 145×145 portraits pulled from playerRoster
// (looked up case-insensitively by name). Inlined here rather than
// extracted to a shared util until a third consumer appears.
let playerRoster = [];
let rosterByName = new Map();
function normalizeKey(s) {
    return (s || '').trim().toLowerCase();
}
function rebuildRosterIndex() {
    rosterByName = new Map();
    playerRoster.forEach(p => {
        if (p && p.name) rosterByName.set(normalizeKey(p.name), p.portraitUrl || '');
    });
}

// Body data-attrs gate the flyquest-2v2 CSS overrides (slot size switches
// to the 307×190 composite, portraits reveal, name/points/rank columns
// hide). Kept in sync on every selection update so vendor/player-count
// changes flip the layout live without a reload.
function applyBodyAttrs() {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.dataset.game        = currentGame        || '';
    document.body.dataset.vendor      = currentVendor      || '';
    document.body.dataset.playerCount = currentPlayerCount || '';
}

function isFlyquest2v2() {
    return String(currentVendor).toLowerCase() === 'flyquest'
        && String(currentPlayerCount).toLowerCase() === '2v2';
}

socket.emit('get-match-global-data');
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('getPlayerRoster');

let _initGame = false, _initVendor = false, _initPlayer = false;
function tryInitialTheme() {
    if (_initGame && _initVendor && _initPlayer) {
        updateTheme(currentGame, currentVendor, currentPlayerCount);
    }
}

socket.on('server-current-game-selection', ({gameSelection}) => {
    currentGame = gameSelection;
    _initGame = true;
    applyBodyAttrs();
    tryInitialTheme();
});
socket.on('game-selection-updated', ({gameSelection}) => {
    currentGame = gameSelection;
    applyBodyAttrs();
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-vendor-selection', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    _initVendor = true;
    applyBodyAttrs();
    tryInitialTheme();
});
socket.on('vendor-selection-updated', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    applyBodyAttrs();
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-player-count', ({playerCount}) => {
    currentPlayerCount = playerCount;
    _initPlayer = true;
    applyBodyAttrs();
    tryInitialTheme();
});
socket.on('player-count-updated', ({playerCount}) => {
    currentPlayerCount = playerCount;
    applyBodyAttrs();
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});

socket.on('playerRosterUpdated', (roster) => {
    playerRoster = Array.isArray(roster) ? roster : [];
    rebuildRosterIndex();
    // Re-render so any 2v2 portraits resolve against the fresh roster.
    renderAllSlots();
});

function updateTheme(game, vendor, playerCount) {
    // 1. Clear old vendor overrides first
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
    }

    // 2. Apply game defaults
    document.documentElement.style.setProperty('--slot-points-width', '100px');
    document.documentElement.style.setProperty('--bracket-text-color', 'rgba(0,0,0, 1)');
    document.documentElement.style.setProperty('--bracket-text-color-faded', 'rgba(0,0,0, 0.5)');

    if (game === 'mtg') {
        document.documentElement.style.setProperty('--bracket-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--bracket-font-weight', '700');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '400');
    } else if (game === 'starwars') {
        document.documentElement.style.setProperty('--bracket-font', 'Barlow');
        document.documentElement.style.setProperty('--bracket-font-weight', '600');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '600');
        document.documentElement.style.setProperty('--slot-points-width', '70px');
        document.documentElement.style.setProperty('--bracket-text-color', 'rgba(255,255,255, 1)');
        document.documentElement.style.setProperty('--bracket-text-color-faded', 'rgba(255,255,255, 0.5)');
    } else {
        document.documentElement.style.setProperty('--bracket-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--bracket-font-weight', 'bold');
        document.documentElement.style.setProperty('--archetype-font-style', 'italic');
        document.documentElement.style.setProperty('--archetype-font-weight', 'bold');
    }

    // 3. Apply new vendor overrides (can override game defaults)
    if (vc) {
        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }

    // 3. Update bracket background (video or image) with vendor + player count suffix
    const bg = document.getElementById('bracket-bg');
    const bgVideo = document.getElementById('bracket-bg-video');

    if (vc) {
        if (bg) bg.src = vc.getAssetPath(`/assets/images/${game}/bracket/${game}-bracket-bg.png`, vendor, playerCount);

        // Event-wide video background — sits beneath the PNG bg per CSS
        // z-index stack. Shown only when the file exists for current
        // game/vendor/playerCount.
        // Pattern: /assets/animations/{game}/shared/{game}-event-bg-{vendor}-{playerCount}.mp4
        if (bgVideo) {
            const videoPath = vc.getAssetPath(`/assets/animations/${game}/shared/${game}-event-bg.mp4`, vendor, playerCount);
            fetch(videoPath, { method: 'HEAD' })
                .then(r => {
                    if (r.ok) {
                        bgVideo.src = videoPath;
                        bgVideo.load();
                        bgVideo.play().catch(() => {});
                    } else {
                        bgVideo.removeAttribute('src');
                        bgVideo.load();
                    }
                })
                .catch(() => {
                    bgVideo.removeAttribute('src');
                    bgVideo.load();
                });
        }
    }

    if (vc) {
        // Per-slot frame PNG. Painted onto every .slot-frame element so the
        // frame reveals in lockstep with the portraits/name via the slot's
        // clip-path animation — baking the frames into the bg PNG would make
        // them appear instantly on page load and lose that wipe-in effect.
        //
        // FQ 2v2 has no per-slot "win" frame swap (best-of-1 games), so the
        // 1v1 renderSlot()'s frame/frame-win logic stays gated behind its own
        // isFlyquest2v2() early-return. Here we just set the base frame src.
        // For FQ 2v2, vc.getAssetPath() resolves to
        // mtg-bracket-frame-flyquest-2v2.png (a 307×190 transparent PNG with
        // the two portrait boxes + 307×45 name bar).
        document.querySelectorAll('.slot-frame').forEach((frame) => {
            frame.src = vc.getAssetPath(`/assets/images/${game}/bracket/${game}-bracket-frame.png`, vendor, playerCount);
        });
    }

    // Re-render slots so text colors and unified sizing update
    renderAllSlots();

    // Redraw SVG connectors after vendor/playerCount flip. The initial
    // boot draws them once before selections arrive; without this call a
    // boot-into-FQ-2v2 user would see 1v1 connector lines on top of the
    // 2v2 bg. drawBracketLines() branches on isFlyquest2v2() internally
    // to pick the right geometry (see drawBracketLinesFq2v2).
    drawBracketLines();

    // Replay the reveal after we've finalized positions + paths.
    //
    // Why this is needed: the initial boot runs `setTimeout(animateReveal,
    // 100)` once, but by the time the three selection events land (game,
    // vendor, playerCount) and updateTheme actually runs for the first
    // time, the slots have usually already been given `.revealed` under the
    // default 1v1 CSS — wrong positions, wrong direction. Even worse, the
    // SVG paths drawn here are brand-new, so the setTimeouts the initial
    // animateReveal() queued for dash-offset zeroing fire against
    // now-detached 1v1 paths and leave the 2v2 paths hidden forever.
    //
    // Calling replayReveal() re-arms the whole sequence against the actual
    // current CSS (FQ 2v2 bottom-up overrides etc.) and the newly drawn
    // paths. Cost is a single animation replay on every vendor/playerCount
    // commit — acceptable since those events only fire when the operator
    // explicitly changes a dropdown.
    replayReveal();
}

// --- Auto-scale text ---

// Calculate the font size needed to fit text, returns the size (does not apply it)
function calculateFontSize(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerText) return maxFontSize;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerText = element.innerText;
    document.body.appendChild(temp);

    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    document.body.removeChild(temp);
    return currentSize;
}

// --- Round labels config ---

const ROUND_LABELS = [
    { text: 'QUARTERFINAL', centerX: 194 + SLOT_WIDTH / 2, y: 280, delay: 2500, clipBottom: 325 },
    { text: 'SEMIFINAL', centerX: 748 + SLOT_WIDTH / 2, y: 365, delay: 2600, clipBottom: 410 },
    { text: 'FINAL', centerX: 1302 + SLOT_WIDTH / 2, y: 535, delay: 2800, clipBottom: 580 },
];

function createRoundLabels() {
    const container = document.getElementById('bracket-slots');
    ROUND_LABELS.forEach((label) => {
        // Wrapper clips the label so it can't show in the frame area during animation
        const wrapperTop = label.y - 60;
        const wrapperHeight = label.clipBottom - wrapperTop;

        const wrapper = document.createElement('div');
        wrapper.className = 'round-label-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.top = wrapperTop + 'px';
        wrapper.style.left = '0';
        wrapper.style.width = '1920px';
        wrapper.style.height = wrapperHeight + 'px';
        wrapper.style.overflow = 'hidden';
        wrapper.style.pointerEvents = 'none';

        const el = document.createElement('div');
        el.className = 'round-label';
        el.innerText = label.text;
        el.style.top = (label.y - wrapperTop) + 'px';
        el.style.left = label.centerX + 'px';
        el.dataset.delay = label.delay;

        wrapper.appendChild(el);
        container.appendChild(wrapper);
    });
}

// --- Create slot DOM elements ---

function createSlotElements() {
    const container = document.getElementById('bracket-slots');

    SLOT_CONFIG.forEach((slot) => {
        const el = document.createElement('div');
        el.className = 'bracket-slot';
        el.id = `slot-${slot.id}`;
        el.dataset.delay = slot.delay;
        // Positioning is driven by CSS custom properties (per-slot
        // `--slot-{id}-top/left/display`) with 1v1 defaults in
        // bracket-full-display.css. Vendors (FQ 2v2) override those vars
        // via vendor-config so we no longer need inline style.left/top.

        // Frame background image
        const frame = document.createElement('img');
        frame.className = 'slot-frame';
        frame.src = '';
        frame.alt = '';

        // Portraits — hidden by default; revealed only under
        // body[data-vendor="flyquest"][data-player-count="2v2"]. Two per
        // slot: one for each captain of the 2v2 team.
        const portrait1 = document.createElement('img');
        portrait1.className = 'slot-portrait slot-portrait-1';
        portrait1.alt = '';
        const portrait2 = document.createElement('img');
        portrait2.className = 'slot-portrait slot-portrait-2';
        portrait2.alt = '';

        const rank = document.createElement('div');
        rank.className = 'slot-rank';

        const nameArchetype = document.createElement('div');
        nameArchetype.className = 'slot-name-archetype';

        const name = document.createElement('div');
        name.className = 'slot-name';

        const archetype = document.createElement('div');
        archetype.className = 'slot-archetype';

        nameArchetype.appendChild(name);
        nameArchetype.appendChild(archetype);

        const points = document.createElement('div');
        points.className = 'slot-points';

        el.appendChild(frame);
        el.appendChild(portrait1);
        el.appendChild(portrait2);
        el.appendChild(rank);
        el.appendChild(nameArchetype);
        el.appendChild(points);

        container.appendChild(el);
    });
}

// --- Render a single slot ---

function renderSlot(slotId, data) {
    const el = document.getElementById(`slot-${slotId}`);
    if (!el) return;

    // ── FQ 2v2 path ─────────────────────────────────────────────────────
    // Composite slot: two portraits stacked on a 307×45 name bar. Reads
    // `-player-1-name` as player 1 and new `-player-2-name` field as player 2.
    // NOTE: `-player-1-name` holds player 1 in 2v2 and "Player Name" in 1v1. When
    // an operator flips modes mid-broadcast, existing values don't
    // auto-translate — v1 expects the operator to re-run auto-populate
    // after switching, same contract as the standings textarea.
    if (isFlyquest2v2()) {
        return renderSlotFq2v2(el, slotId, data);
    }

    const rankEl = el.querySelector('.slot-rank');
    const nameEl = el.querySelector('.slot-name');
    const archetypeEl = el.querySelector('.slot-archetype');
    const pointsEl = el.querySelector('.slot-points');

    const rank_key = `${slotId}-rank`;
    const name_key = `${slotId}-player-1-name`;
    const archetype_key = `${slotId}-archetype`;
    const points_key = `${slotId}-points`;
    const win_key = `${slotId}-win`;

    if (rank_key in data) {
        rankEl.innerText = data[rank_key];
    }
    if (name_key in data) {
        nameEl.innerText = data[name_key];
    }
    if (archetype_key in data) {
        archetypeEl.innerText = data[archetype_key];
        archetypeEl.style.display = data[archetype_key] ? 'block' : 'none';
        nameEl.style.lineHeight = data[archetype_key] ? '39px' : '31px';
    }
    if (points_key in data) {
        pointsEl.innerText = data[points_key];
    }

    // Default: full opacity
    const root = document.documentElement;
    const colorFull = root.style.getPropertyValue('--bracket-text-color').trim() || 'rgba(0,0,0,1)';
    const colorFaded = root.style.getPropertyValue('--bracket-text-color-faded').trim() || 'rgba(0,0,0,0.5)';

    rankEl.style.color = colorFull;
    nameEl.style.color = colorFull;
    archetypeEl.style.color = colorFull;
    pointsEl.style.color = colorFull;

    // Opacity if loss
    const win = data[win_key] || '';
    if (win === '0') {
        rankEl.style.color = colorFaded;
        nameEl.style.color = colorFaded;
        archetypeEl.style.color = colorFaded;
        pointsEl.style.color = colorFaded;
    }

    // Swap frame image: win variant when points = 2
    const frameEl = el.querySelector('.slot-frame');
    const vc = window.VENDOR_CONFIG;
    if (frameEl && vc) {
        const frameBase = data[points_key] === '2'
            ? `/assets/images/${currentGame}/bracket/${currentGame}-bracket-frame-win.png`
            : `/assets/images/${currentGame}/bracket/${currentGame}-bracket-frame.png`;
        frameEl.src = vc.getAssetPath(frameBase, currentVendor, currentPlayerCount);
    }
}

// ── FQ 2v2 slot renderer ────────────────────────────────────────────────
// Separate function (not inlined) to keep the 1v1 path visually unchanged
// and isolate 2v2-specific logic (portrait lookup, concatenated name,
// no win/fade, no frame swap). Skipped fields (-archetype, -points, -win)
// are hidden via CSS under the body[data-vendor][data-player-count] gate,
// so we don't bother writing their innerText — but we DO clear the
// rank/points DOM just so stale 1v1 data doesn't bleed through if a user
// flipped modes after painting.
function renderSlotFq2v2(el, slotId, data) {
    const name_key = `${slotId}-player-1-name`;
    const player2_key = `${slotId}-player-2-name`;
    const rank_key = `${slotId}-rank`;

    const player1 = (data[name_key] || '').trim();
    const player2 = (data[player2_key] || '').trim();

    const portrait1El = el.querySelector('.slot-portrait-1');
    const portrait2El = el.querySelector('.slot-portrait-2');
    const nameEl = el.querySelector('.slot-name');
    const rankEl = el.querySelector('.slot-rank');
    const archetypeEl = el.querySelector('.slot-archetype');
    const pointsEl = el.querySelector('.slot-points');

    // Defensive reset: the 1v1 render path (renderSlot above) sets inline
    // `style.display` / `style.color` on archetype/points/rank and writes
    // innerText for archetype+points. Two realistic scenarios leave that
    // inline state on the DOM before we reach this function:
    //
    //   1. Page-load race — `bracket-data` arrives before the three
    //      game/vendor/player-count selection events, so the first
    //      renderAllSlots() pass runs through the 1v1 branch with default
    //      vendor/count, painting inline `display: block` onto every
    //      archetype element. The CSS rule we rely on to hide archetype in
    //      2v2 mode (`body[...] .slot-archetype { display: none }`) then
    //      loses the specificity fight against that inline style.
    //
    //   2. Operator flips 1v1 → 2v2 mid-broadcast (no reload). Same stale
    //      inline styles, same override problem.
    //
    // Wiping the inline styles (and clearing innerText so no stale "AZORIUS
    // CONTROL"-style strings ghost around in empty SF/F slots) restores the
    // CSS rule's authority. Cheap — three elements × a handful of props.
    if (archetypeEl) {
        archetypeEl.style.display = '';
        archetypeEl.style.color = '';
        archetypeEl.innerText = '';
    }
    if (pointsEl) {
        pointsEl.style.color = '';
        pointsEl.innerText = '';
    }
    if (rankEl) {
        rankEl.style.color = '';
    }

    // Resolve portraits via rosterByName (case-insensitive). Unknown names
    // leave src empty — same graceful degradation the standings page uses.
    const p1Src = player1 ? (rosterByName.get(normalizeKey(player1)) || '') : '';
    const p2Src = player2 ? (rosterByName.get(normalizeKey(player2)) || '') : '';
    if (portrait1El) {
        if (p1Src) portrait1El.src = p1Src; else portrait1El.removeAttribute('src');
    }
    if (portrait2El) {
        if (p2Src) portrait2El.src = p2Src; else portrait2El.removeAttribute('src');
    }

    // Concatenated display name. Matches the standings layout's "FirstName
    // LastName" style — keeps a consistent team label across the two
    // flyquest-2v2 overlays.
    if (nameEl) {
        if (player1 && player2) {
            nameEl.innerText = `${player1} & ${player2}`;
        } else {
            nameEl.innerText = player1 || player2 || '';
        }
        // Use the vendor-configured FQ 2v2 text color.
        const root = document.documentElement;
        const colorFull = root.style.getPropertyValue('--bracket-text-color').trim() || '#fff';
        nameEl.style.color = colorFull;
        // Unset 1v1 line-height override since the 307×45 bar controls it.
        nameEl.style.lineHeight = '';
    }

    // Rank is hidden in 2v2 but keep the DOM value in sync so the node
    // doesn't retain a stale 1v1 seed if the operator flips back.
    if (rankEl && rank_key in data) rankEl.innerText = data[rank_key];
}

// --- Render all slots ---

function renderAllSlots() {
    SLOT_CONFIG.forEach((slot) => {
        renderSlot(slot.id, bracketData);
    });

    // 2v2 name bar: 307×45 with 8px horizontal padding → 291px usable.
    // Names like "Persephone Valentine & Gavin Verhey" blow past the
    // default 24px size set by --fq2v2-bracket-name-font-size, so we
    // auto-shrink per-slot using the same helper the 1v1 path uses.
    // Fallback: text-overflow: ellipsis in CSS kicks in if a name is
    // still too long at the minimum size.
    if (isFlyquest2v2()) {
        document.fonts.ready.then(() => {
            const nameEls = document.querySelectorAll('.slot-name');
            // Each slot sizes independently — unlike 1v1 we don't unify
            // to the smallest size, because the 2v2 bar is wider and a
            // shared shrink would make short names (e.g. "LS & Reynad")
            // needlessly tiny. Long names get squeezed; short ones stay
            // at the configured max.
            nameEls.forEach((el) => {
                if (!el.innerText) return;
                el.style.fontSize = calculateFontSize(el, 24, 12, 291) + 'px';
            });
        });
        return;
    }

    // Unify font sizes: use the smallest size across all slots
    document.fonts.ready.then(() => {
        const nameEls = document.querySelectorAll('.slot-name');
        const archetypeEls = document.querySelectorAll('.slot-archetype');

        let minNameSize = 28;
        let minArchetypeSize = 16;

        nameEls.forEach(el => {
            if (el.innerText) {
                const size = calculateFontSize(el, 28, 16, 280);
                if (size < minNameSize) minNameSize = size;
            }
        });

        archetypeEls.forEach(el => {
            if (el.innerText) {
                const size = calculateFontSize(el, 16, 10, 265);
                if (size < minArchetypeSize) minArchetypeSize = size;
            }
        });

        nameEls.forEach(el => {
            el.style.fontSize = minNameSize + 'px';
        });

        archetypeEls.forEach(el => {
            el.style.fontSize = minArchetypeSize + 'px';
        });
    });
}

// --- Draw bracket connecting lines (SVG) ---

function drawBracketLines() {
    const svg = document.getElementById('bracket-lines');
    svg.innerHTML = '';

    // FQ 2v2 has its own connector geometry (bottom-up, 4 QF → 2 SF merge).
    // Delegate and return so the 1v1 line-drawing below is skipped.
    if (isFlyquest2v2()) {
        drawBracketLinesFq2v2(svg);
        return;
    }

    function centerY(i) { return SLOT_CONFIG[i].y + SLOT_HEIGHT / 2; }
    function rightX(i) { return SLOT_CONFIG[i].x + SLOT_WIDTH; }
    function leftX(i) { return SLOT_CONFIG[i].x; }

    BRACKET_CONNECTIONS.forEach((conn) => {
        const srcRightX = rightX(conn.pair1[0]);
        const tgtLeftX = leftX(conn.targetPair[0]);
        const gap = tgtLeftX - srcRightX;
        const turnX = srcRightX + gap / 2;

        const p1MidY = (centerY(conn.pair1[0]) + centerY(conn.pair1[1])) / 2;
        const p2MidY = (centerY(conn.pair2[0]) + centerY(conn.pair2[1])) / 2;
        const targetMidY = (centerY(conn.targetPair[0]) + centerY(conn.targetPair[1])) / 2;

        const startX = srcRightX + 30;

        // 1) Horizontal stubs
        const dStubs = [
            `M ${startX} ${p1MidY} H ${turnX}`,
            `M ${startX} ${p2MidY} H ${turnX}`,
        ].join(' ');

        const stubsPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        stubsPath.setAttribute('d', dStubs);
        stubsPath.dataset.delay = 2000;

        svg.appendChild(stubsPath);
        const stubsLength = stubsPath.getTotalLength();
        stubsPath.style.transition = 'none';
        stubsPath.style.strokeDasharray = stubsLength;
        stubsPath.style.strokeDashoffset = stubsLength;
        stubsPath.getBoundingClientRect();
        stubsPath.style.transition = 'stroke-dashoffset 1s ease-out';

        // 2) Vertical lines (start after stubs finish: 2000 + 1000 = 3000)
        const dVerticals = [
            `M ${turnX} ${p1MidY} V ${targetMidY}`,
            `M ${turnX} ${p2MidY} V ${targetMidY}`,
        ].join(' ');

        const verticalsPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        verticalsPath.setAttribute('d', dVerticals);
        verticalsPath.dataset.delay = 2175;

        svg.appendChild(verticalsPath);
        const verticalsLength = verticalsPath.getTotalLength();
        verticalsPath.style.transition = 'none';
        verticalsPath.style.strokeDasharray = verticalsLength;
        verticalsPath.style.strokeDashoffset = verticalsLength;
        verticalsPath.getBoundingClientRect();
        verticalsPath.style.transition = 'stroke-dashoffset 2s ease-out';

        // 3) Output line (start after verticals finish: 3000 + 2000 = 5000)
        const dOutput = `M ${turnX} ${targetMidY} H ${turnX + (turnX - startX)}`;

        const outputPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        outputPath.setAttribute('d', dOutput);
        outputPath.dataset.delay = 2700;

        svg.appendChild(outputPath);
        const outputLength = outputPath.getTotalLength();
        outputPath.style.transition = 'none';
        outputPath.style.strokeDasharray = outputLength;
        outputPath.style.strokeDashoffset = outputLength;
        outputPath.getBoundingClientRect();
        outputPath.style.transition = 'stroke-dashoffset 0.5s linear';
    });
}

// ── FQ 2v2 bracket connectors ──────────────────────────────────────────
// Two separate connector groups:
//
//   QF → SF (pair merge, 3 phases):
//     Phase 1: stubs — short verticals rising from each QF top (left +
//              right in parallel)
//     Phase 2: horizontals — from stub tops converging to the SF center-x
//              (left + right in parallel, "meet in the middle")
//     Phase 3: merge — single vertical from the meet point up to the SF
//              slot's bottom edge
//
//   SF → F (L-shape, 2 phases per side):
//     Phase 1: stubs — short verticals rising from each SF top
//     Phase 2: horizontals — from stub tops running outward into the F
//              slot's left/right edges
//
// F's bottom (y=468) actually sits ~25px BELOW SF's top (y=443) given the
// current vendor-config — so the L's vertical portion runs from F's mid-y
// (y=365.5) *down* to SF top (y=443), with the horizontal sitting above
// the overlap. The horizontal x runs from SF center (547.5 or 1373.5)
// outward to F left/right edge (806 or 1113), which stays outside F's own
// x range so there's no clash with the F portraits.
function drawBracketLinesFq2v2(svg) {
    // Slot composite 307×205 (matches vendor-config --bracket-slot-width /
    // --bracket-slot-height). Source of truth for FQ 2v2 positioning —
    // querying live DOM layout would race CSS-var resolution on first paint.
    const SLOT_W = 307;
    const SLOT_H = 205;
    const POS = {
        qf1: { x: 214,  y: 708 },  // rank 1 — bottom row, left outer
        qf4: { x: 574,  y: 709 },  // rank 4 — bottom row, left inner
        qf2: { x: 1040, y: 708 },  // rank 2 — bottom row, right inner
        qf3: { x: 1400, y: 709 },  // rank 3 — bottom row, right outer
        sf1: { x: 394,  y: 443 },  // SF A — middle row left
        sf2: { x: 1220, y: 443 },  // SF B — middle row right
        fin: { x: 806,  y: 263 },  // Finals / Champion — top center
    };

    function topCenter(p)    { return { x: p.x + SLOT_W / 2, y: p.y }; }
    function bottomCenter(p) { return { x: p.x + SLOT_W / 2, y: p.y + SLOT_H }; }
    function midY(p)         { return p.y + SLOT_H / 2; }

    // Helper: add a path with dash-offset reveal animation.
    function addPath(d, delay, duration) {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', d);
        p.dataset.delay = delay;
        p.dataset.duration = duration;
        svg.appendChild(p);
        const len = p.getTotalLength();
        p.style.transition = 'none';
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset ${duration}ms ease-out`;
    }

    // ── QF → SF: phased merge ──────────────────────────────────────────
    // Break the merge into three discrete phases so the operator-facing
    // animation reads as "tiny stubs rise → horizontals converge → merge
    // line lifts into SF". Single-path was too smooth; this sells the
    // bracket-flow intent.
    function drawMergeUp(feederA, feederB, target, baseDelay) {
        const fa = topCenter(feederA);
        const fb = topCenter(feederB);
        const t  = bottomCenter(target);
        // Turn y sits halfway in the ~60px gap between the QF tops and
        // the SF bottom. Stubs rise to this y; horizontals run along it.
        const turnY = (fa.y + t.y) / 2;
        const mergeX = t.x;

        // Phase 1: stubs. Short vertical from each QF top rising to turnY.
        addPath(`M ${fa.x} ${fa.y} V ${turnY}`, baseDelay,        150);
        addPath(`M ${fb.x} ${fb.y} V ${turnY}`, baseDelay,        150);

        // Phase 2: horizontals "meet in the middle". Each path starts at
        // the outer stub top and strokes toward mergeX, so the dash-offset
        // reveal flows inward — visually the two lines meet at the center.
        addPath(`M ${fa.x} ${turnY} H ${mergeX}`, baseDelay + 200, 250);
        addPath(`M ${fb.x} ${turnY} H ${mergeX}`, baseDelay + 200, 250);

        // Phase 3: merge. Single vertical from the meet point up to the
        // SF bottom — "from the middle to its final height".
        addPath(`M ${mergeX} ${turnY} V ${t.y}`,  baseDelay + 500, 200);
    }

    // ── SF → F: horizontals from name bars → meet in middle → up ──────
    // Per user spec: "lines go left and right from the SF name bars and
    // meet at the midpoint, then the merged line goes up to the bottom
    // of the F name bar."
    //
    // Emergence points are the INSIDE edge of each SF's name bar at its
    // vertical midpoint (not SF top centers — the old design). Lines
    // converge at F's center-x (still at SF name bar midline, comfortably
    // below F). Then a single vertical rises from the meet point up to
    // the BOTTOM of F's name bar (which is also F.bottom, y=468) so the
    // line visually taps F's underside without any hidden-behind-bar
    // segment.
    //
    // Name bar geometry (shared across all FQ 2v2 slots): slot-rel y =
    // 160..205, so vertical-middle offset from slot.top = 182.5, and the
    // bottom of the name bar is just slot.top + SLOT_H.
    function drawMergeUpToFinal(sfA, sfB, target, baseDelay) {
        const NAME_BAR_MID = 182.5;

        // SF name bar inside edges (right side of SF A, left side of SF B),
        // both at name-bar midline y.
        const aX = sfA.x + SLOT_W;                 // 701 — SF A right edge
        const bX = sfB.x;                           // 1220 — SF B left edge
        const mergeY = sfA.y + NAME_BAR_MID;       // 625.5 — SF name bar midline

        // Meet point directly below F's center x, still at SF name bar y.
        const mergeX = target.x + SLOT_W / 2;      // 959.5

        // Final: bottom of F's name bar (= F.bottom = slot.top + SLOT_H).
        const targetY = target.y + SLOT_H;         // 468

        // Phase 1 — horizontals run inward from each SF name bar's inside
        // edge and converge at mergeX. Single phase: "go left and right
        // from the SF name bars and meet at the midpoint."
        addPath(`M ${aX} ${mergeY} H ${mergeX}`, baseDelay, 350);
        addPath(`M ${bX} ${mergeY} H ${mergeX}`, baseDelay, 350);

        // Phase 2 — single vertical up from the meet point rising to the
        // bottom edge of F's name bar. Fully visible the whole way (y=625.5
        // up to y=468, all outside any opaque slot element); terminates
        // flush against the underside of F's name bar. Slow 950ms draw —
        // a deliberate "tap up into the champion" beat that ends the reveal.
        addPath(`M ${mergeX} ${mergeY} V ${targetY}`, baseDelay + 400, 950);
    }

    // ── Timing budget ──────────────────────────────────────────────────
    // QF reveals land 2000-2300. QF→SF lines fill 2350-3050 across three
    // phases. SFs reveal 3000-3100 (briefly overlapping the merge's tail —
    // same technique the 1v1 path uses to avoid dead air). SF→F lines fill
    // 3300-4650 in TWO phases (horizontals converge 3300-3650, then
    // vertical rises 3700-4650 — slow, deliberate tap into the champion
    // bar). F reveals 4050, 600ms before the vertical finishes — so F
    // appears while the line is still rising toward it.
    //
    // Both QF→SF pairs share a baseDelay so left and right merges animate
    // in lockstep — "4 stubs then 2 horizontals then 2 merges" reads as
    // one coherent beat, not a staggered L/R cascade.
    drawMergeUp(POS.qf1, POS.qf4, POS.sf1, 2350);
    drawMergeUp(POS.qf2, POS.qf3, POS.sf2, 2350);

    drawMergeUpToFinal(POS.sf1, POS.sf2, POS.fin, 3300);
}

// --- Progressive reveal animation ---

// ── FQ 2v2 reveal order ────────────────────────────────────────────────
// Bottom-up cascade: QF (bottom) first, SF (middle) next, F (top) last.
// Keyed by slot id since the 1v1 SLOT_CONFIG.delay values land in random
// order across the shown 2v2 subset (and the 7 hidden-in-2v2 slots don't
// animate at all — they're display:none).
//
// Timing budget (must stay in lock-step with drawBracketLinesFq2v2's
// phased delays — change one, change the other):
//   QFs        reveal 2000–2300
//   QF→SF lines 2350–3050 (stubs → meet in middle → merge up)
//   SFs        reveal 3000–3100 (slight overlap w/ merge tail — same
//              "no dead air" trick the 1v1 path uses)
//   SF→F lines 3300–4650 (horizontals converge → slow vertical tap up)
//   F          reveals 4050 (600ms before vertical finishes — line
//              rises toward an already-visible F)
const FQ2V2_SLOT_DELAYS = {
    'bracket-quarterfinal-1': 2000,
    'bracket-quarterfinal-4': 2100,
    'bracket-quarterfinal-2': 2200,
    'bracket-quarterfinal-3': 2300,
    'bracket-semifinal-1a':   3000,
    'bracket-semifinal-2a':   3100,
    'bracket-final-1a':       4050,
};

function animateReveal() {
    const slots = document.querySelectorAll('.bracket-slot');
    const paths = document.querySelectorAll('#bracket-lines path');
    const labels = document.querySelectorAll('.round-label');
    const fq2v2 = isFlyquest2v2();

    // Each slot has its own delay. In 2v2 mode, lookup by slot id so the
    // reveal cascades bottom-up regardless of the 1v1-tuned delay values
    // baked into SLOT_CONFIG.
    slots.forEach((slot) => {
        let delay;
        if (fq2v2) {
            const key = slot.id.replace(/^slot-/, '');
            delay = FQ2V2_SLOT_DELAYS[key];
            if (delay == null) return; // hidden slots — skip reveal
        } else {
            delay = parseInt(slot.dataset.delay) || 0;
        }
        setTimeout(() => {
            slot.classList.add('revealed');
        }, delay);
    });

    // Lines animate at the same time as their target slot
    paths.forEach((path) => {
        const delay = parseInt(path.dataset.delay) || 0;
        setTimeout(() => {
            path.style.strokeDashoffset = '0';
        }, delay);
    });

    // Round labels fade in and slide up
    labels.forEach((label) => {
        const delay = parseInt(label.dataset.delay) || 0;
        setTimeout(() => {
            label.classList.add('revealed');
        }, delay);
    });
}

// ── Replay reveal ──────────────────────────────────────────────────────
// Used by both the initial boot (animateReveal fires once from a 100ms
// setTimeout below) and the OBS scene-trigger path (obs-animate-bracket).
// Strips the `.revealed` class off every slot + round label, and resets
// each SVG path's stroke-dashoffset back to its full length so the dashed
// reveal can run again. The transition property is also reset — setting
// it back to its animation value with a forced reflow in between so the
// browser treats the next dash-offset change as a fresh animation rather
// than a continuation of the previous one.
function replayReveal() {
    const slots = document.querySelectorAll('.bracket-slot');
    const labels = document.querySelectorAll('.round-label');
    const paths = document.querySelectorAll('#bracket-lines path');

    // Strip `.revealed` from everything, but disable transitions during the
    // strip so slots/labels don't visibly "un-reveal" over their clip-path
    // transition — we want them to snap back to hidden instantly and then
    // re-reveal cleanly. Re-enable transitions after a forced reflow so the
    // browser treats the next `.revealed` add as a fresh animation.
    slots.forEach((slot) => {
        slot.style.transition = 'none';
        slot.classList.remove('revealed');
    });
    labels.forEach((label) => {
        label.style.transition = 'none';
        label.classList.remove('revealed');
    });
    paths.forEach((p) => {
        const len = p.getTotalLength();
        p.style.transition = 'none';
        p.style.strokeDashoffset = len;
    });

    // Force a reflow so the transition: none + dashoffset reset commits
    // before we re-enable transitions below. Without this the browser can
    // coalesce the change with the upcoming `.revealed` add and skip the
    // animation entirely.
    document.body.getBoundingClientRect();

    // Clear the inline transition overrides so the CSS rules take over
    // again (which is what we want for the actual reveal animation).
    slots.forEach((slot)  => { slot.style.transition = ''; });
    labels.forEach((label) => { label.style.transition = ''; });
    paths.forEach((p) => {
        // Each path stores its transition duration on dataset.duration (set
        // by drawBracketLinesFq2v2) or falls back to the 1v1 default. This
        // keeps QF→SF connectors at their 600ms reveal rather than the
        // multi-second 1v1 sweep.
        const duration = p.dataset.duration ? `${p.dataset.duration}ms` : '1s';
        p.style.transition = `stroke-dashoffset ${duration} ease-out`;
    });

    // Slightly deferred so the transition-reset settles before the reveal
    // sequence re-arms. 50ms is enough for two paint frames on 60Hz.
    setTimeout(animateReveal, 50);
}

// --- Socket events ---

socket.emit('get-bracket-data');

socket.on('bracket-data', (data) => {
    console.log('[FullBracket] Received bracket data', data['bracketData']);
    bracketData = data['bracketData'];
    renderAllSlots();
});

// OBS scene cut → Bracket: replay the reveal animation. The server-side
// trigger lives in features/obs-websocket.js::handleSceneChange (watches
// for scene "Bracket - Top 8"). Fires on every cut to the bracket scene,
// so the operator gets a fresh animation on every transition without
// needing to reload the display page.
socket.on('obs-animate-bracket', () => {
    console.log('[FullBracket] OBS transition to bracket — replaying animation');
    replayReveal();
});

// --- Initialize ---

createRoundLabels();
createSlotElements();
drawBracketLines();

// The reveal animation is no longer kicked off from here. It runs the
// first time updateTheme() fires — which happens once the three selection
// events (game, vendor, playerCount) all arrive and `tryInitialTheme()`
// unlocks. updateTheme calls `replayReveal()` at its tail after the body
// data-attrs / SVG paths / slot positions are all in place, so the
// animation always plays against the correct layout (1v1 or FQ 2v2).
//
// Dropping the old setTimeout(animateReveal, 100) here prevents a race
// where the initial reveal would fire before body attrs were set —
// snapping slots to `.revealed` under the default 1v1 CSS, so when
// FQ 2v2 body attrs landed a moment later the 2v2 CSS couldn't animate
// the transition (slot was already `.revealed`) and the slots appeared
// instantly without any wipe.

console.log('[FullBracket] Initialized');
