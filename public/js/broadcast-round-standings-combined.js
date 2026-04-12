import { RIFTBOUND_LEGENDS } from './riftbound/constants.js';

const socket = io();
window.roomManager = new RoomManager(socket);

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

const TOTAL_STANDINGS = 16;
const slider = document.getElementById('standings-slider');

// Debug logging
const DEBUG_OBS = true;
function obsLog(...args) {
    if (DEBUG_OBS) console.log('[OBS Standings]', ...args);
}

// ── Font Size Calculation ────────────────────────────────────────────────────
function calculateFontSize(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return maxFontSize;

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

    document.body.removeChild(temp);
    return currentSize;
}

// ── Generate Rows for Both Pages ─────────────────────────────────────────────
function generateStandingsRows(wrapperId, startRank) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    wrapper.innerHTML = '';
    for (let i = 1; i <= TOTAL_STANDINGS; i++) {
        const row = document.createElement('div');
        row.className = 'round-standings-container';
        row.id = `${wrapperId}-row-${i}`;
        row.innerHTML = `
            <div class="standings-rank" id="${wrapperId}-rank-${i}"></div>
            <img class="standings-portrait" id="${wrapperId}-portrait-${i}" src="" alt="">
            <div class="player-name-archetype">
                <div class="standings-name" id="${wrapperId}-name-${i}"></div>
                <div class="standings-archetype" id="${wrapperId}-archetype-${i}"></div>
            </div>
            <div class="standings-record" id="${wrapperId}-record-${i}"></div>
        `;
        wrapper.appendChild(row);
    }
}

generateStandingsRows('standings-wrapper-1', 1);
generateStandingsRows('standings-wrapper-2', 17);
generateStandingsRows('standings-wrapper-3', 33);
generateStandingsRows('standings-wrapper-4', 49);

// ── Socket Setup ─────────────────────────────────────────────────────────────
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('get-broadcast-standings');
socket.emit('get-broadcast-scoreboard-data');

// Event round info
socket.on('broadcast-round-data', (data) => {
    const eventRound = data?.match1?.['event-round'] || '';
    const el = document.getElementById('standings-event-round');
    if (el) el.textContent = eventRound;
});

// ── Theme ────────────────────────────────────────────────────────────────────
let _initGame = false, _initVendor = false, _initPlayer = false;
function tryInitialTheme() {
    if (_initGame && _initVendor && _initPlayer) {
        updateTheme(currentGame, currentVendor, currentPlayerCount);
    }
}

socket.on('server-current-game-selection', ({gameSelection}) => {
    currentGame = gameSelection;
    _initGame = true;
    tryInitialTheme();
});
socket.on('game-selection-updated', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-vendor-selection', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    _initVendor = true;
    tryInitialTheme();
});
socket.on('vendor-selection-updated', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-player-count', ({playerCount}) => {
    currentPlayerCount = playerCount;
    _initPlayer = true;
    tryInitialTheme();
});
socket.on('player-count-updated', ({playerCount}) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});

function updateTheme(game, vendor, playerCount) {
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
    }

    document.documentElement.style.setProperty('--standings-color', '#000');

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
        document.documentElement.style.setProperty('--standings-color', '#fff');
    } else {
        document.documentElement.style.setProperty('--dynamic-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--dynamic-font-weight', 'bold');
        document.documentElement.style.setProperty('--archetype-font-style', 'italic');
        document.documentElement.style.setProperty('--archetype-font-weight', 'bold');
    }

    if (vc) {
        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }

    // Update frame images for both pages
    if (vc) {
        const framePath = vc.getAssetPath(
            `/assets/images/${game}/standings/${game}-standings-frame.png`,
            vendor, playerCount
        );
        document.querySelectorAll('.round-standings-container').forEach(el => {
            el.style.backgroundImage = `url("${framePath}")`;
        });

        // Update bg image
        const bgPath = vc.getAssetPath(
            `/assets/images/${game}/standings/${game}-standings-bg.png`,
            vendor, playerCount
        );
        const bgEl = document.getElementById('standings-bg');
        if (bgEl) {
            const img = new Image();
            img.onload = () => { bgEl.src = bgPath; };
            img.onerror = () => { bgEl.src = ''; };
            img.src = bgPath;
        }
    }
}

// ── Populate Standings Data ──────────────────────────────────────────────────
function populatePage(wrapperId, data, startRank) {
    for (let i = 1; i <= TOTAL_STANDINGS; i++) {
        const dataRank = startRank + i - 1;
        const rowData = data[dataRank];
        const rankEl = document.getElementById(`${wrapperId}-rank-${i}`);
        const nameEl = document.getElementById(`${wrapperId}-name-${i}`);
        const archetypeEl = document.getElementById(`${wrapperId}-archetype-${i}`);
        const recordEl = document.getElementById(`${wrapperId}-record-${i}`);
        const portraitEl = document.getElementById(`${wrapperId}-portrait-${i}`);
        const rowEl = document.getElementById(`${wrapperId}-row-${i}`);

        if (rowData) {
            rankEl.innerHTML = rowData['rank'] || '';
            nameEl.innerHTML = rowData['name'] || '';
            archetypeEl.innerHTML = rowData['archetype'] || '';
            recordEl.innerHTML = rowData['record'] || '';
            rowEl.style.display = 'flex';

            // Legend portrait
            const legendName = rowData['archetype'] || '';
            const legendData = RIFTBOUND_LEGENDS[legendName];
            if (portraitEl) {
                portraitEl.src = legendData?.left || '';
            }

            // Hide empty archetype
            if (legendName.trim() === '') {
                archetypeEl.style.display = 'none';
            } else {
                archetypeEl.style.display = 'block';
            }
        } else {
            rankEl.innerHTML = '';
            nameEl.innerHTML = '';
            archetypeEl.innerHTML = '';
            recordEl.innerHTML = '';
            if (portraitEl) portraitEl.src = '';
            rowEl.style.display = 'none';
        }
    }

    // Auto-size
    document.fonts.ready.then(() => {
        const rootStyle = getComputedStyle(document.documentElement);
        const maxNameSize = parseInt(rootStyle.getPropertyValue('--standings-name-font-size')) || 36;
        const maxArchetypeSize = parseInt(rootStyle.getPropertyValue('--standings-archetype-font-size')) || 24;
        const textWidth = parseInt(rootStyle.getPropertyValue('--standings-text-width')) || 428;

        const wrapper = document.getElementById(wrapperId);
        wrapper.querySelectorAll('.standings-name').forEach(el => {
            if (el.innerText) {
                el.style.fontSize = calculateFontSize(el, maxNameSize, 16, textWidth) + 'px';
            }
        });
        wrapper.querySelectorAll('.standings-archetype').forEach(el => {
            if (el.innerText) {
                el.style.fontSize = calculateFontSize(el, maxArchetypeSize, 10, textWidth) + 'px';
            }
        });
    });
}

socket.on('broadcast-round-standings-data', (incoming) => {
    console.log('standings data', incoming);
    const data = incoming.standings || incoming;

    populatePage('standings-wrapper-1', data, 1);
    populatePage('standings-wrapper-2', data, 17);
    populatePage('standings-wrapper-3', data, 33);
    populatePage('standings-wrapper-4', data, 49);
});

// ── OBS Scene Slide Animation ────────────────────────────────────────────────
let currentPage = 1;

obsLog('Combined page initialized');

let isAnimating = false;
let wasAway = false;

function jumpTo(targetPage) {
    if (targetPage === currentPage) return;
    obsLog(`Jumping from page ${currentPage} to page ${targetPage}`);

    document.getElementById(`standings-page-${currentPage}`).classList.remove('active', 'slide-out', 'slide-in');
    const incoming = document.getElementById(`standings-page-${targetPage}`);
    incoming.classList.remove('slide-out', 'slide-in');
    incoming.classList.add('active');
    currentPage = targetPage;
}

function slideTo(targetPage) {
    if (targetPage === currentPage || isAnimating) return;
    isAnimating = true;

    obsLog(`Sliding from page ${currentPage} to page ${targetPage}`);

    const outgoing = document.getElementById(`standings-page-${currentPage}`);
    const incoming = document.getElementById(`standings-page-${targetPage}`);

    outgoing.classList.remove('active');
    outgoing.classList.add('slide-out');
    incoming.classList.add('slide-in');

    setTimeout(() => {
        outgoing.classList.remove('slide-out');
        incoming.classList.remove('slide-in');
        incoming.classList.add('active');
        currentPage = targetPage;
        isAnimating = false;
        obsLog(`Now on page ${currentPage}`);
    }, 1000);
}

// ── OBS Scene Detection (via server obs-websocket) ──────────────────────────
socket.on('obs-standings-page', ({ page }) => {
    obsLog(`Server says go to page ${page} | currentPage: ${currentPage}`);
    if (page && page !== currentPage) {
        if (wasAway) {
            jumpTo(page);
        } else {
            slideTo(page);
        }
        wasAway = false;
    } else if (page) {
        wasAway = false;
    }
});

socket.on('obs-left-standings', () => {
    wasAway = true;
    jumpTo(1);
    obsLog('Left standings scenes — reset to page 1');
});
//   window.dispatchEvent(new CustomEvent('obsSceneChanged', { detail: { name: 'Standings - Current Round 49-64' } }));
