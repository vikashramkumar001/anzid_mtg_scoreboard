const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let bracketData = {};
let win = '0';

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const bracket_id = pathSegments[4];

console.log('bracket detail', bracket_id);

const playerRank = document.getElementById('player-rank');
const playerName = document.getElementById('player-name');
const playerArchetype = document.getElementById('player-archetype');
const playerPoints = document.getElementById('player-points');
const bracketContainer = document.getElementById('bracket-details-container');

// ask for global match data to get game selection
socket.emit('get-match-global-data');
socket.emit('get-game-selection');

// Listen for deck data to display
socket.on('bracket-data', (data) => {
    // {"bracket-quarterfinal-1-name": "", "bracket-quarterfinal-1-archetype": "", "bracket-quarterfinal-1-rank": "",...}
    console.log('data', data['bracketData']);

    // Save to local object
    bracketData = data['bracketData'];
    // Call a function to render the round details
    renderDetails();
});

// Listen for game selection updates
socket.on('server-current-game-selection', ({gameSelection}) => {
    updateFontForGame(gameSelection);
});

socket.on('game-selection-updated', ({gameSelection}) => {
    updateFontForGame(gameSelection);
});

// Update font based on game selection
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

// Auto-scale font size to fit within visible clip-path area
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

// Function to render the round details on the page
function renderDetails() {
    const rank_key = `${bracket_id}-rank`;
    const name_key = `${bracket_id}-name`;
    const archetype_key = `${bracket_id}-archetype`;
    const points_key = `${bracket_id}-points`;
    const win_key = `${bracket_id}-win`;
    if (rank_key in bracketData) {
        playerRank.innerText = bracketData[rank_key];
    }
    if (name_key in bracketData) {
        playerName.innerText = bracketData[name_key];
    }
    if (archetype_key in bracketData) {
        playerArchetype.innerText = bracketData[archetype_key];
        playerArchetype.style.display = bracketData[archetype_key] ? 'block' : 'none';
        playerName.style.lineHeight = bracketData[archetype_key] ? '39px' : '33px';
    }
    if (points_key in bracketData) {
        playerPoints.innerText = bracketData[points_key];
    }
    if (win_key in bracketData) {
        win = bracketData[win_key];
    }
    // default is no opacity
    playerRank.style.color = 'rgba(0,0,0, 1)';
    playerName.style.color = 'rgba(0,0,0, 1)';
    playerArchetype.style.color = 'rgba(0,0,0, 1)';
    playerPoints.style.color = 'rgba(0,0,0, 1)';
    // opacity on color if win is false
    if (win === '0') {
        playerRank.style.color = 'rgba(0,0,0, 0.5)';
        playerName.style.color = 'rgba(0,0,0, 0.5)';
        playerArchetype.style.color = 'rgba(0,0,0, 0.5)';
        playerPoints.style.color = 'rgba(0,0,0, 0.5)';
    }
    // change points background color based on number of points
    if (bracketData[points_key] === '2') {
        playerPoints.style.backgroundColor = '#E9CE89';
    } else {
        playerPoints.style.backgroundColor = '#fff';
    }

    // Auto-scale text after fonts load
    // Clip-path visible widths: name ~312px (73% of 428), archetype ~276px (64.5% of 428)
    document.fonts.ready.then(() => {
        autoScaleText(playerName, 28, 16, 280);
        autoScaleText(playerArchetype, 16, 10, 265);
    });
}