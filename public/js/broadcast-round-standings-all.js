const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let standingsData = {};
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

const standingsWrapper = document.getElementById('standings-wrapper');
const TOTAL_STANDINGS = 16;

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
    // Clear old vendor overrides first
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

    // Apply new vendor overrides (can override game defaults)
    if (vc) {
        const overrides = vc.getOverrides(game, vendor);
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
    }
}

// Listen for standings data to display
socket.on('broadcast-round-standings-data', (data) => {
    console.log('standings data', data);
    standingsData = data;

    // Update all 16 rows
    for (let i = 1; i <= TOTAL_STANDINGS; i++) {
        const rowData = data[i];
        const rankEl = document.getElementById(`standings-rank-${i}`);
        const nameEl = document.getElementById(`standings-name-${i}`);
        const archetypeEl = document.getElementById(`standings-archetype-${i}`);
        const recordEl = document.getElementById(`standings-record-${i}`);
        const rowEl = document.getElementById(`standings-row-${i}`);

        if (rowData) {
            rankEl.innerHTML = rowData['rank'] || '';
            nameEl.innerHTML = rowData['name'] || '';
            archetypeEl.innerHTML = rowData['archetype'] || '';
            recordEl.innerHTML = rowData['record'] || '';
            rowEl.style.display = 'flex';

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
            rowEl.style.display = 'none';
        }
    }

    // Unify font sizes: use the smallest size across all rows
    document.fonts.ready.then(() => {
        const nameEls = document.querySelectorAll('.standings-name');
        const archetypeEls = document.querySelectorAll('.standings-archetype');

        let minNameSize = 36;
        let minArchetypeSize = 24;

        nameEls.forEach(el => {
            if (el.innerText) {
                const size = calculateFontSize(el, 36, 16, 370);
                if (size < minNameSize) minNameSize = size;
            }
        });

        archetypeEls.forEach(el => {
            if (el.innerText) {
                const size = calculateFontSize(el, 24, 10, 370);
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
});
