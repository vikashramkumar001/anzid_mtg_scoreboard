const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let standingsData = {};
let selectedGame = '';
let rankText = document.getElementById('standings-rank');
let nameText = document.getElementById('standings-name');
let archetypeText = document.getElementById('standings-archetype');
let recordText = document.getElementById('standings-record');

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const rank_id = pathSegments[4];

console.log('standings for rank', rank_id);

// Get game selection on load
socket.emit('get-game-selection');

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

// Listen for deck data to display
socket.on('broadcast-round-standings-data', (data) => {
    // {{"rank": 1, "name": "Barber, Jon", "archetype": "Mystic Forge Combo", "record": "10-1-0"}....}
    console.log('data', data);

    // Save to local object
    standingsData = data[rank_id];

    // display
    rankText.innerHTML = standingsData['rank'] || '';
    nameText.innerHTML = standingsData['name'] || '';
    archetypeText.innerHTML = standingsData['archetype'] || '';
    recordText.innerHTML = standingsData['record'] || '';

    // Center name vertically when archetype is empty
    const archetype = standingsData['archetype'] || '';
    if (archetype.trim() === '') {
        archetypeText.style.display = 'none';
        nameText.style.height = '84px';
        nameText.style.lineHeight = '84px';
    } else {
        archetypeText.style.display = 'block';
        nameText.style.height = '51px';
        nameText.style.lineHeight = '67.5px';
    }

});