const socket = io();
let roundData = {};
let deckData = {};
let selectedGame = '';  // global game type, e.g., 'mtg' or 'riftbound'

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const match_id = pathSegments[4];
const side_id = pathSegments[5];

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

    // Render side deck
    const sideDeckContainer = document.getElementById('side-deck-container');

    // spread side deck horizontally in 1 row centered. max 15. scale card size accordingly for no overlap
    deckData.sideDeck.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'side-deck-card';
        cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
        sideDeckContainer.appendChild(cardElement);
    });
}

// game selection logic
function handleGameSelectionUpdate(gameSelection) {
    const normalized = gameSelection?.toLowerCase();
    if (!normalized || normalized === selectedGame) return;

    selectedGame = normalized;
    console.log('Game selection updated:', selectedGame);

    // Perform actions based on game type
    if (selectedGame === 'mtg') {
        console.log('Switching to MTG mode...');
    } else if (selectedGame === 'riftbound') {
        console.log('Switching to Riftbound mode...');
    }
}

socket.emit('get-game-selection');

socket.on('game-selection-updated', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
});

// If this is the first time receiving it (like on initial load):
socket.on('server-current-game-selection', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
});

// end game selection logic