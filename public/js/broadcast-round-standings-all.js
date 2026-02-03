const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let standingsData = {};
let selectedGame = '';

const standingsWrapper = document.getElementById('standings-wrapper');
const TOTAL_STANDINGS = 16;

// Auto-scale text to fit within a max width, also adjusts line-height
function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    // Create a temporary span to measure text width accurately
    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerHTML = element.innerHTML;
    document.body.appendChild(temp);

    // Reduce font size until text fits
    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';
    // Scale height: 36px at font 36, 32px at font 28 (linear interpolation)
    const heightAtMax = 36;
    const heightAtMin = 32;
    const ratio = (currentSize - minFontSize) / (maxFontSize - minFontSize);
    const dynamicHeight = heightAtMin + ratio * (heightAtMax - heightAtMin);
    element.style.height = dynamicHeight + 'px';
    element.style.lineHeight = dynamicHeight + 'px';
    document.body.removeChild(temp);
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
socket.emit('get-broadcast-standings');

socket.on('server-current-game-selection', ({gameSelection}) => {
    selectedGame = gameSelection?.toLowerCase() || '';
    updateFontForGame(selectedGame);
});

socket.on('game-selection-updated', ({gameSelection}) => {
    selectedGame = gameSelection?.toLowerCase() || '';
    updateFontForGame(selectedGame);
});

function updateFontForGame(game) {
    if (game === 'mtg') {
        document.documentElement.style.setProperty('--dynamic-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--dynamic-font-weight', '700');
    } else {
        document.documentElement.style.setProperty('--dynamic-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--dynamic-font-weight', 'bold');
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
            // Auto-scale player name to fit within container (max 36px, min 28px, 370px width)
            autoScaleText(nameEl, 36, 28, 370);
        } else {
            // Hide empty rows
            rankEl.innerHTML = '';
            nameEl.innerHTML = '';
            archetypeEl.innerHTML = '';
            recordEl.innerHTML = '';
            rowEl.style.display = 'none';
        }
    }
});
