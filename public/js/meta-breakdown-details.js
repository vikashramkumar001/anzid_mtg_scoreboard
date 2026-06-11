const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let metaBreakdownData = {};
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const detail_id = pathSegments[4];

const FALLBACK_IMAGES = {
    mtg: '/assets/images/mtg/cards/magic-card-back.jpg',
    riftbound: '/assets/images/riftbound/cards/riftbound-card-back.png',
    vibes: '/assets/images/vibes/cards/vibes-card-back.jpg',
};

console.log('detail', detail_id);

const metaBreakdownDetail = document.getElementById('meta-breakdown-detail');

// Listen for meta breakdown data
socket.on('receive-meta-breakdown-data', (data) => {
    console.log('meta breakdown data', data);

    if (data._gameType) {
        currentGame = data._gameType;
    }

    metaBreakdownData = data;
    if (metaBreakdownData[detail_id]) {
        renderDetails(metaBreakdownData);
    }
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

        const overrides = vc.getOverrides(game, vendor, playerCount);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }
}

// Function to render the card on the page
function renderCard(data) {
    const fallbackUrl = FALLBACK_IMAGES[currentGame] || FALLBACK_IMAGES.mtg;
    const mainCardViewContainer = document.getElementById('card-view-container');
    mainCardViewContainer.innerHTML = '';

    const cardElement = document.createElement('div');
    cardElement.className = 'main-card-display';

    const img = document.createElement('img');
    img.className = 'card-src';
    img.src = data.url || fallbackUrl;

    img.onerror = () => {
        console.warn('Image failed to load:', data.url);
        img.src = fallbackUrl;
    };

    cardElement.appendChild(img);
    mainCardViewContainer.appendChild(cardElement);
}

// Function to render the round details on the page
function renderDetails(data) {
    if (detail_id.includes('meta-breakdown-key-card')) {
        renderCard(data[detail_id]);
    } else {
        metaBreakdownDetail.innerHTML = `${metaBreakdownData[detail_id]}`;
    }
}

// on start - render fallback image if card
if (detail_id.includes('meta-breakdown-key-card')) {
    renderCard({url: ''});
}
