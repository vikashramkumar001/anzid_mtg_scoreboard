const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let standingsData = {};
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';
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