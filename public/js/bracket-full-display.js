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

socket.emit('get-match-global-data');
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');

socket.on('server-current-game-selection', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('game-selection-updated', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-vendor-selection', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('vendor-selection-updated', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-player-count', ({playerCount}) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('player-count-updated', ({playerCount}) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
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
    textColorFull = 'rgba(0,0,0, 1)';
    textColorFaded = 'rgba(0,0,0, 0.5)';
    document.documentElement.style.setProperty('--slot-points-width', '100px');

    if (game === 'mtg') {
        document.documentElement.style.setProperty('--dynamic-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--dynamic-font-weight', '700');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '400');
    } else if (game === 'starwars') {
        document.documentElement.style.setProperty('--dynamic-font', 'Barlow');
        document.documentElement.style.setProperty('--dynamic-font-weight', '600');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '600');
        document.documentElement.style.setProperty('--slot-points-width', '70px');
        textColorFull = 'rgba(255,255,255, 1)';
        textColorFaded = 'rgba(255,255,255, 0.5)';
    } else {
        document.documentElement.style.setProperty('--dynamic-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--dynamic-font-weight', 'bold');
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

    // 3. Update bracket images with vendor + player count suffix
    const bg = document.getElementById('bracket-bg');
    if (bg && vc) bg.src = vc.getAssetPath(`/assets/images/${game}/bracket/${game}-bracket-bg.png`, vendor, playerCount);

    if (vc) {
        document.querySelectorAll('.slot-frame').forEach((frame) => {
            frame.src = vc.getAssetPath(`/assets/images/${game}/bracket/${game}-bracket-frame.png`, vendor, playerCount);
        });
    }

    // Re-render slots so text colors and unified sizing update
    renderAllSlots();
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
        el.style.left = slot.x + 'px';
        el.style.top = slot.y + 'px';

        // Frame background image
        const frame = document.createElement('img');
        frame.className = 'slot-frame';
        frame.src = '';
        frame.alt = '';

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

    const rankEl = el.querySelector('.slot-rank');
    const nameEl = el.querySelector('.slot-name');
    const archetypeEl = el.querySelector('.slot-archetype');
    const pointsEl = el.querySelector('.slot-points');

    const rank_key = `${slotId}-rank`;
    const name_key = `${slotId}-name`;
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
    rankEl.style.color = textColorFull;
    nameEl.style.color = textColorFull;
    archetypeEl.style.color = textColorFull;
    pointsEl.style.color = textColorFull;

    // Opacity if loss
    const win = data[win_key] || '';
    if (win === '0') {
        rankEl.style.color = textColorFaded;
        nameEl.style.color = textColorFaded;
        archetypeEl.style.color = textColorFaded;
        pointsEl.style.color = textColorFaded;
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

// --- Render all slots ---

function renderAllSlots() {
    SLOT_CONFIG.forEach((slot) => {
        renderSlot(slot.id, bracketData);
    });

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

// --- Progressive reveal animation ---

function animateReveal() {
    const slots = document.querySelectorAll('.bracket-slot');
    const paths = document.querySelectorAll('#bracket-lines path');
    const labels = document.querySelectorAll('.round-label');

    // Each slot has its own delay
    slots.forEach((slot) => {
        const delay = parseInt(slot.dataset.delay) || 0;
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

// --- Socket events ---

socket.emit('get-bracket-data');

socket.on('bracket-data', (data) => {
    console.log('[FullBracket] Received bracket data', data['bracketData']);
    bracketData = data['bracketData'];
    renderAllSlots();
});

// --- Initialize ---

createRoundLabels();
createSlotElements();
drawBracketLines();

// Trigger reveal animation after a brief delay to let elements render
setTimeout(() => {
    animateReveal();
}, 100);

console.log('[FullBracket] Initialized');
