import { RIFTBOUND_LEGENDS } from './riftbound/constants.js';

const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let standingsData = {};
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

const standingsWrapper = document.getElementById('standings-wrapper');
const TOTAL_STANDINGS = 16;
const START_RANK = parseInt(standingsWrapper?.dataset.startRank) || 1;

// Calculate font size needed to fit text within a max width (returns size, does not apply it)
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

// Generate all 16 standing rows
function generateStandingsRows() {
    standingsWrapper.innerHTML = '';
    for (let i = 1; i <= TOTAL_STANDINGS; i++) {
        const row = document.createElement('div');
        row.className = 'round-standings-container';
        row.id = `standings-row-${i}`;
        row.innerHTML = `
            <div class="standings-rank" id="standings-rank-${i}"></div>
            <img class="standings-portrait" id="standings-portrait-${i}" src="" alt="">
            <div class="player-name-archetype">
                <div class="standings-name" id="standings-name-${i}"></div>
                <div class="standings-archetype" id="standings-archetype-${i}"></div>
            </div>
            <div class="standings-record" id="standings-record-${i}"></div>
        `;
        standingsWrapper.appendChild(row);
    }
}

// Initialize rows on load
generateStandingsRows();

// Get game selection and current standings on load
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('get-broadcast-standings');
socket.emit('get-broadcast-scoreboard-data');

// Listen for broadcast round data to get event-round info
socket.on('broadcast-round-data', (data) => {
    const eventRound = data?.match1?.['event-round'] || '';
    const el = document.getElementById('standings-event-round');
    if (el) el.textContent = eventRound;
});

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
    // Clear old vendor overrides first
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
    }

    document.documentElement.style.setProperty('--standings-color', '#000');

    if (game === 'mtg') {
        document.documentElement.style.setProperty('--standings-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--standings-font-weight', '700');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '400');
    } else if (game === 'starwars') {
        document.documentElement.style.setProperty('--standings-font', 'Barlow');
        document.documentElement.style.setProperty('--standings-font-weight', '600');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '600');
        document.documentElement.style.setProperty('--standings-color', '#fff');
    } else {
        document.documentElement.style.setProperty('--standings-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--standings-font-weight', 'bold');
        document.documentElement.style.setProperty('--archetype-font-style', 'italic');
        document.documentElement.style.setProperty('--archetype-font-weight', 'bold');
    }

    // Apply new vendor overrides (can override game defaults)
    if (vc) {
        const overrides = vc.getOverrides(game, vendor, playerCount);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }

    // Update standings frame image dynamically
    if (vc) {
        const framePath = vc.getAssetPath(
            `/assets/images/${game}/standings/${game}-standings-frame.png`,
            vendor, playerCount
        );
        document.querySelectorAll('.round-standings-container').forEach(el => {
            el.style.backgroundImage = `url("${framePath}")`;
        });

        // Update standings background image (hide if file doesn't exist)
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

        // Optional character layer — sits above bg, below data rows.
        // Same HEAD-probe pattern as the bg above. Hidden via empty src
        // when the file doesn't exist (CSS rule
        // `#standings-character[src=""] { display: none }` covers the
        // empty-string case). Multi-page combined view also has a
        // .standings-character-img class for any extra instances; we
        // update both via querySelectorAll so they stay in sync.
        const charPath = vc.getAssetPath(
            `/assets/images/${game}/standings/${game}-standings-char.png`,
            vendor, playerCount
        );
        const charEls = document.querySelectorAll('#standings-character, .standings-character-img');
        if (charEls.length) {
            const img = new Image();
            img.onload = () => { charEls.forEach(el => { el.src = charPath; }); };
            img.onerror = () => { charEls.forEach(el => { el.src = ''; }); };
            img.src = charPath;
        }

        // Event-wide video background (optional — drops on top of PNG bg
        // when the file exists for current game/vendor/playerCount).
        // Pattern: /assets/animations/{game}/shared/{game}-event-bg-{vendor}-{playerCount}.mp4
        const videoPath = vc.getAssetPath(
            `/assets/animations/${game}/shared/${game}-event-bg.mp4`,
            vendor, playerCount
        );
        const videoEl = document.getElementById('standings-bg-video');
        if (videoEl) {
            fetch(videoPath, { method: 'HEAD' })
                .then(r => {
                    if (r.ok) {
                        videoEl.src = videoPath;
                        videoEl.load();
                        videoEl.play().catch(() => {});
                    } else {
                        videoEl.removeAttribute('src');
                        videoEl.load();
                    }
                })
                .catch(() => {
                    videoEl.removeAttribute('src');
                    videoEl.load();
                });
        }
    }
}

// Listen for standings data to display
socket.on('broadcast-round-standings-data', (incoming) => {
    console.log('standings data', incoming);
    // Support both old format (plain object) and new format ({ standings, roundId })
    const data = incoming.standings || incoming;
    standingsData = data;


    // Update all 16 rows
    for (let i = 1; i <= TOTAL_STANDINGS; i++) {
        const dataRank = START_RANK + i - 1;
        const rowData = data[dataRank];
        const rankEl = document.getElementById(`standings-rank-${i}`);
        const nameEl = document.getElementById(`standings-name-${i}`);
        const archetypeEl = document.getElementById(`standings-archetype-${i}`);
        const recordEl = document.getElementById(`standings-record-${i}`);
        const portraitEl = document.getElementById(`standings-portrait-${i}`);
        const rowEl = document.getElementById(`standings-row-${i}`);

        if (rowData) {
            rankEl.innerHTML = rowData['rank'] || '';
            nameEl.innerHTML = rowData['name'] || '';
            archetypeEl.innerHTML = rowData['archetype'] || '';
            recordEl.innerHTML = rowData['record'] || '';
            rowEl.style.display = 'flex';

            // Set legend portrait if available
            const legendName = rowData['archetype'] || '';
            const legendData = RIFTBOUND_LEGENDS[legendName];
            if (portraitEl) {
                portraitEl.src = legendData?.left || '';
            }

            // Hide archetype row when empty
            const archetype = rowData['archetype'] || '';
            if (archetype.trim() === '') {
                archetypeEl.style.display = 'none';
            } else {
                archetypeEl.style.display = 'block';
            }
        } else {
            // Hide empty rows
            rankEl.innerHTML = '';
            nameEl.innerHTML = '';
            archetypeEl.innerHTML = '';
            recordEl.innerHTML = '';
            if (portraitEl) portraitEl.src = '';
            rowEl.style.display = 'none';
        }
    }

    // Auto-size each player's name and archetype independently
    document.fonts.ready.then(() => {
        const rootStyle = getComputedStyle(document.documentElement);
        const maxNameSize = parseInt(rootStyle.getPropertyValue('--standings-name-font-size')) || 36;
        const maxArchetypeSize = parseInt(rootStyle.getPropertyValue('--standings-archetype-font-size')) || 24;
        const textWidth = parseInt(rootStyle.getPropertyValue('--standings-text-width')) || 428;

        document.querySelectorAll('.standings-name').forEach(el => {
            if (el.innerText) {
                el.style.fontSize = calculateFontSize(el, maxNameSize, 16, textWidth) + 'px';
            }
        });

        // Riftbound legends sit in a fixed-width gold pill (.standings-archetype),
        // not the wider name column — size to the pill so long names like
        // "AZIR, EMPEROR OF THE SANDS" don't overrun it (mirrors the fix in
        // broadcast-round-standings-combined.js). Other games keep textWidth.
        document.querySelectorAll('.standings-archetype').forEach(el => {
            if (el.innerText) {
                let legendMaxWidth = textWidth;
                if (currentGame === 'riftbound') {
                    const acs = getComputedStyle(el);
                    const padX = (parseFloat(acs.paddingLeft) || 0) + (parseFloat(acs.paddingRight) || 0);
                    const cw = el.clientWidth;
                    if (cw) legendMaxWidth = cw - padX;
                }
                el.style.fontSize = calculateFontSize(el, maxArchetypeSize, 10, legendMaxWidth) + 'px';
            }
        });
    });
});

