const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let roundData = {};
let deckData = {};
let selectedGame = '';  // global game type, e.g., 'mtg' or 'riftbound'
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
let orientation, match_id, side_id;

// Handle both URL patterns: /orientation/matchID/sideID and /matchID/sideID
if (pathSegments[4] === 'horizontal' || pathSegments[4] === 'vertical') {
    orientation = pathSegments[4];
    match_id = pathSegments[5];
    side_id = pathSegments[6];
} else {
    orientation = 'horizontal'; // Default to horizontal
    match_id = pathSegments[4];
    side_id = pathSegments[5];
}

// Add orientation class to body for CSS targeting
document.body.classList.add(orientation);

// Listen for deck data to display
socket.on('broadcast-round-data', (data) => {
    // {match1:{}, match2:{},...}}
    console.log('data', data);

    roundData = data;

    if (data[match_id] && data[match_id][`player-side-deck-${side_id}`]) {
        // ask server to transform main deck data
        socket.emit('transform-side-deck-data', ({
            deckData: data[match_id][`player-side-deck-${side_id}`] || [],
            gameType: selectedGame,
            sideID: side_id,
            matchID: match_id
        }));
    } else {
        console.log('deck data not found for url parameters', match_id, side_id);
    }
});

// listen for transformed deck to display
socket.on('transformed-side-deck-data', (data) => {
    console.log('transformed side deck data from server', data);
    if (data.sideID === side_id && data.gameType === selectedGame && data.matchID === match_id) {
        deckData = {
            mainDeck: [],
            sideDeck: data.deckData,
            playerName: roundData[match_id][`player-name-${side_id}`] || 'Unknown Player',
            archetype: roundData[match_id][`player-archetype-${side_id}`] || 'Unknown Archetype',
            manaSymbols: roundData[match_id][`player-mana-symbols-${side_id}`] || ''
        };
        console.log('deck data', deckData);
        // Call a function to render the decks
        renderDecks();
    } else {
        console.log('transformed deck data - not the correct side or game type or match id')
    }
})

// Function to render the decks on the page
function renderDecks() {
    // Clear previous deck displays
    document.getElementById('side-deck-container').innerHTML = '';

    // Render side deck based on orientation
    if (orientation === 'vertical') {
        renderVerticalSideDeck();
    } else {
        renderHorizontalSideDeck();
    }
}

// Function to render horizontal side deck
function renderHorizontalSideDeck() {
    const sideDeckContainer = document.getElementById('side-deck-container');
    const cards = deckData.sideDeck || [];
    if (cards.length === 0) return;

    if (selectedGame === 'starwars') {
        renderStarWarsSideDeck(sideDeckContainer, cards);
    } else {
        // Default layout: cards in a single centered row
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'side-deck-card';
            cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
            sideDeckContainer.appendChild(cardElement);
        });
    }
}

// Star Wars sideboard: cards evenly spaced in the bottom dark band
function renderStarWarsSideDeck(container, cards) {
    container.classList.add('starwars-sideboard');

    const totalCards = cards.length;
    // Available width for cards (with margins on each side)
    const containerWidth = 1920;
    const sideMargin = 40;
    const availableWidth = containerWidth - (2 * sideMargin);

    // Calculate card width to evenly fill the space with gaps
    const cardGap = 10;
    const maxCardHeight = 216; // 1080 - 804 (dark band top) - 30 (top gap) - 30 (bottom gap)
    const maxCardWidthFromHeight = Math.floor(maxCardHeight / 1.4); // ~154px, portrait aspect ratio
    const maxCardWidthFromSpace = (availableWidth - (totalCards - 1) * cardGap) / totalCards;
    const cardWidth = Math.min(maxCardWidthFromHeight, maxCardWidthFromSpace);

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'side-deck-card starwars-sideboard-card';
        cardElement.style.width = `${cardWidth}px`;
        cardElement.innerHTML = `
            <img src="${card['card-url']}" class="card-src">
            <div class="card-count">${card['card-count']}</div>
        `;
        container.appendChild(cardElement);
    });
}

// Function to render vertical side deck
function renderVerticalSideDeck() {
    const sideDeckContainer = document.getElementById('side-deck-container');
    sideDeckContainer.className = 'vertical-side-deck-container';

    // Create single cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'side-deck-single-column-cards-container';

    const totalCards = deckData.sideDeck.length;

    // Use dynamic card height based on total card count (simpler than main deck since side deck has fewer cards)
    let cardHeight, fontScaleFactor;
    if (totalCards > 15) {
        cardHeight = 35;
        fontScaleFactor = 1;
    } else if (totalCards > 10) {
        cardHeight = 45;
        fontScaleFactor = 1;
    } else {
        cardHeight = 55;
        fontScaleFactor = 1;
    }

    // Render all cards with conditional sizing
    deckData.sideDeck.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'vertical-side-deck-card';
        cardElement.style.height = `${cardHeight}px`;

        if (selectedGame === 'mtg') {
            cardElement.innerHTML = `
                <div class="vertical-side-deck-card-number" style="font-size: ${20 * fontScaleFactor}px;">${card['card-count']}</div>
                <div class="vertical-side-deck-card-name" style="font-size: ${20 * fontScaleFactor}px;">${card['card-name']}</div>
                <div class="vertical-side-deck-card-background" style="background-image: url('${card['card-url']}');background-position: 40px -105px;background-size: cover;"></div>
            `;
        } else if (selectedGame === 'riftbound') {
            cardElement.innerHTML = `
                <div class="vertical-side-deck-card-number" style="font-size: ${20 * fontScaleFactor}px;">${card['card-count']}</div>
                <div class="vertical-side-deck-card-name" style="font-size: ${20 * fontScaleFactor}px;">${card['card-name']}</div>
                <div class="vertical-side-deck-card-background" style="background-image: url('${card['card-url']}');background-position: 20px -100px;background-size: 120% auto;"></div>
            `;
        }

        cardsContainer.appendChild(cardElement);
    });

    sideDeckContainer.appendChild(cardsContainer);
}

// game selection logic
function updateTheme(game, vendor, playerCount) {
    const gameSelection = game;
    const normalized = gameSelection?.toLowerCase();
    if (!normalized) return;

    // --- Game switch (only when game actually changes) ---
    if (normalized !== selectedGame) {
        // Remove previous game class if it exists
        if (selectedGame) {
            document.body.classList.remove(selectedGame);
        }

        selectedGame = normalized;
        console.log('Game selection updated:', selectedGame);

        // Add game type class to body
        document.body.classList.add(selectedGame);
    }

    // --- Update background image (always run for vendor/playerCount changes) ---
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        // Clear vendor overrides
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });

        // Update sideboard background image: {game}-sideboard-bg-{vendor}-{playercount}.png
        const bgEl = document.getElementById('sideboard-bg-image');
        if (bgEl) {
            const basePath = `/assets/images/${normalized}/decklist/${normalized}-sideboard-bg.png`;
            const bgPath = vc.getAssetPath(basePath, vendor, playerCount);
            bgEl.style.backgroundImage = `url("${bgPath}")`;
        }
    }
}

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

// end game selection logic
