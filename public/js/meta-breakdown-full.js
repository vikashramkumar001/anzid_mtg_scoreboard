const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let metaBreakdownData = {};
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const meta_id = pathSegments[4];

const FALLBACK_IMAGES = {
    mtg: '/assets/images/mtg/cards/magic-card-back.jpg',
    riftbound: '/assets/images/riftbound/cards/riftbound-card-back.png',
    vibes: '/assets/images/vibes/cards/vibes-card-back.jpg',
};

console.log('meta id', meta_id);

const metaBreakdownDetail = document.getElementById('meta-breakdown-detail');

// Listen for meta breakdown data
socket.on('receive-meta-breakdown-data', (data) => {
    console.log('meta breakdown data', data);

    // Update game from data if provided
    if (data._gameType) {
        currentGame = data._gameType;
    }

    metaBreakdownData = data;
    displayDetails(metaBreakdownData);
});

// ── Game/Vendor Selection ────────────────────────────────────────────────────
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');

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

        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }

    // Set game-specific defaults
    if (game === 'mtg') {
        document.documentElement.style.setProperty('--dynamic-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--dynamic-font-weight', '700');
    } else if (game === 'riftbound') {
        document.documentElement.style.setProperty('--dynamic-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--dynamic-font-weight', 'bold');
    } else {
        document.documentElement.style.setProperty('--dynamic-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--dynamic-font-weight', 'bold');
    }

    // Re-apply vendor overrides (they take priority over game defaults)
    if (vc) {
        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }
}

function displayDetails(data) {
    const archetype = data[`meta-breakdown-archetype-${meta_id}`];
    const day1Count = data[`meta-breakdown-day-1-count-${meta_id}`];
    const day1Percent = data[`meta-breakdown-day-1-percent-${meta_id}`];
    const day2Count = data[`meta-breakdown-day-2-count-${meta_id}`];
    const day2Percent = data[`meta-breakdown-day-2-percent-${meta_id}`];

    const keyCard1 = data[`meta-breakdown-key-card-1-${meta_id}`];
    const keyCard2 = data[`meta-breakdown-key-card-2-${meta_id}`];
    const fallbackUrl = FALLBACK_IMAGES[currentGame] || FALLBACK_IMAGES.mtg;

    // Only render if archetype exists
    if (archetype && archetype.trim() !== "") {
        document.getElementById('meta-breakdown-archetype').innerHTML = `${archetype}`;
        document.getElementById('meta-breakdown-day1').textContent = day1Count || '';
        document.getElementById('meta-breakdown-day1-%').textContent = day1Percent ? `${day1Percent}%` : '';
        document.getElementById('meta-breakdown-day2').textContent = day2Count || '';
        document.getElementById('meta-breakdown-day2-%').textContent = day2Percent ? `${day2Percent}%` : '';

        const keyCardsContainer = document.getElementById('meta-breakdown-key-cards');
        keyCardsContainer.innerHTML = '';

        [keyCard1, keyCard2].forEach(card => {
            if (card && card.name && card.name.trim() !== '') {
                const img = document.createElement('img');
                img.src = card.url || fallbackUrl;
                img.alt = card.name;
                img.className = 'key-card-img';
                keyCardsContainer.appendChild(img);
            }
        });
    }
}
