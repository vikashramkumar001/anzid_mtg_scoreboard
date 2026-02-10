const socket = io();
window.roomManager = new RoomManager(socket);

// Slot positions config: bracket ID, x/y pixel position, animation delay
const SLOT_CONFIG = [
    // QF Match 1: 1 vs 8
    { id: 'bracket-quarterfinal-1', x: 40, y: 120, delay: 2000 },
    { id: 'bracket-quarterfinal-8', x: 40, y: 184, delay: 2100 },
    // QF Match 2: 4 vs 5
    { id: 'bracket-quarterfinal-4', x: 40, y: 330, delay: 2200 },
    { id: 'bracket-quarterfinal-5', x: 40, y: 394, delay: 2300 },
    // QF Match 3: 2 vs 7
    { id: 'bracket-quarterfinal-2', x: 40, y: 540, delay: 2400 },
    { id: 'bracket-quarterfinal-7', x: 40, y: 604, delay: 2500 },
    // QF Match 4: 3 vs 6
    { id: 'bracket-quarterfinal-3', x: 40, y: 750, delay: 2600 },
    { id: 'bracket-quarterfinal-6', x: 40, y: 814, delay: 2700 },
    // SF (tight pairs, 8px gap, centered between feeder QF pairs)
    { id: 'bracket-semifinal-1a', x: 748, y: 225, delay: 2100 },
    { id: 'bracket-semifinal-1b', x: 748, y: 289, delay: 2200 },
    { id: 'bracket-semifinal-2a', x: 748, y: 645, delay: 2500 },
    { id: 'bracket-semifinal-2b', x: 748, y: 709, delay: 2600 },
    // Finals (tight pair, 8px gap, centered between SF pairs)
    { id: 'bracket-final-1a', x: 1456, y: 435, delay: 2300 },
    { id: 'bracket-final-1b', x: 1456, y: 499, delay: 2400 },
];

const SLOT_WIDTH = 424;
const SLOT_HEIGHT = 56;

// Bracket line connections: each pair merges then L-routes to its target slot
const BRACKET_CONNECTIONS = [
    // QF → SF
    { pair: [0, 1], target: 8 },    // QF 1,8 → SF 1a
    { pair: [2, 3], target: 9 },    // QF 4,5 → SF 1b
    { pair: [4, 5], target: 10 },   // QF 2,7 → SF 2a
    { pair: [6, 7], target: 11 },   // QF 3,6 → SF 2b
    // SF → Finals
    { pair: [8, 9], target: 12 },   // SF 1 → Final 1a
    { pair: [10, 11], target: 13 }, // SF 2 → Final 1b
];

let bracketData = {};

// --- Font logic (same as bracket-individual-display.js) ---

socket.emit('get-match-global-data');
socket.emit('get-game-selection');

socket.on('server-current-game-selection', ({gameSelection}) => {
    updateFontForGame(gameSelection);
});

socket.on('game-selection-updated', ({gameSelection}) => {
    updateFontForGame(gameSelection);
});

function updateFontForGame(game) {
    if (game === 'mtg') {
        document.documentElement.style.setProperty('--dynamic-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--dynamic-font-weight', '700');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '400');
    } else {
        document.documentElement.style.setProperty('--dynamic-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--dynamic-font-weight', 'bold');
        document.documentElement.style.setProperty('--archetype-font-style', 'italic');
        document.documentElement.style.setProperty('--archetype-font-weight', 'bold');
    }
}

// --- Auto-scale text (same as bracket-individual-display.js) ---

function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerText) return;

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

    element.style.fontSize = currentSize + 'px';
    document.body.removeChild(temp);
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
        frame.src = '/assets/images/mtg/bracket/bracket-frame.png';
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
        nameEl.style.lineHeight = data[archetype_key] ? '39px' : '34px';
    }
    if (points_key in data) {
        pointsEl.innerText = data[points_key];
    }

    // Default: full opacity
    rankEl.style.color = 'rgba(0,0,0, 1)';
    nameEl.style.color = 'rgba(0,0,0, 1)';
    archetypeEl.style.color = 'rgba(0,0,0, 1)';
    pointsEl.style.color = 'rgba(0,0,0, 1)';

    // Opacity if loss
    const win = data[win_key] || '';
    if (win === '0') {
        rankEl.style.color = 'rgba(0,0,0, 0.5)';
        nameEl.style.color = 'rgba(0,0,0, 0.5)';
        archetypeEl.style.color = 'rgba(0,0,0, 0.5)';
        pointsEl.style.color = 'rgba(0,0,0, 0.5)';
    }

    // Points background color
    if (data[points_key] === '2') {
        pointsEl.style.backgroundColor = '#E9CE89';
    } else {
        pointsEl.style.backgroundColor = '#fff';
    }

    // Auto-scale text after fonts load
    document.fonts.ready.then(() => {
        autoScaleText(nameEl, 28, 16, 280);
        autoScaleText(archetypeEl, 16, 10, 265);
    });
}

// --- Render all slots ---

function renderAllSlots() {
    SLOT_CONFIG.forEach((slot) => {
        renderSlot(slot.id, bracketData);
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
        const srcRightX = rightX(conn.pair[0]);
        const tgtLeftX = leftX(conn.target);
        const gap = tgtLeftX - srcRightX;
        const mergeX = srcRightX + gap / 3;
        const turnX = srcRightX + (2 * gap) / 3;

        const topY = centerY(conn.pair[0]);
        const botY = centerY(conn.pair[1]);
        const pairMidY = (topY + botY) / 2;
        const targetY = centerY(conn.target);

        const d = [
            // Pair merge: stubs from each slot + vertical bar
            `M ${srcRightX} ${topY} H ${mergeX}`,
            `M ${srcRightX} ${botY} H ${mergeX}`,
            `M ${mergeX} ${topY} V ${botY}`,
            // L-route from pair midpoint to target slot
            `M ${mergeX} ${pairMidY} H ${turnX}`,
            `M ${turnX} ${pairMidY} V ${targetY}`,
            `M ${turnX} ${targetY} H ${tgtLeftX}`,
        ].join(' ');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.dataset.delay = SLOT_CONFIG[conn.target].delay;

        svg.appendChild(path);
        const totalLength = path.getTotalLength();
        path.style.strokeDasharray = totalLength;
        path.style.strokeDashoffset = totalLength;
    });
}

// --- Progressive reveal animation ---

function animateReveal() {
    const slots = document.querySelectorAll('.bracket-slot');
    const paths = document.querySelectorAll('#bracket-lines path');

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
}

// --- Socket events ---

socket.emit('get-bracket-data');

socket.on('bracket-data', (data) => {
    console.log('[FullBracket] Received bracket data', data['bracketData']);
    bracketData = data['bracketData'];
    renderAllSlots();
});

// --- Initialize ---

createSlotElements();
drawBracketLines();

// Trigger reveal animation after a brief delay to let elements render
setTimeout(() => {
    animateReveal();
}, 100);

console.log('[FullBracket] Initialized');
