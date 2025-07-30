const socket = io();
let roundData = {};
let deckData = {};
let selectedGame = '';  // global game type, e.g., 'mtg' or 'rift'
let mtgCards = {};
let riftboundCards = {};

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const match_id = pathSegments[4];
const side_id = pathSegments[5];

// send request for card list data from server
socket.emit('riftbound-get-card-list-data');

// handle receiving card list data from server
socket.on('riftbound-card-list-data', ({cardListData: cardListDataFromServer}) => {
    // console.log('got card list data from server', cardListDataFromServer);
    // save card list data
    riftboundCards = cardListDataFromServer;
});

// send request for card list data from server
socket.emit('mtg-get-card-list-data');

// handle receiving card list data from server
socket.on('mtg-card-list-data', ({cardListData: cardListDataFromServer}) => {
    // console.log('got card list data from server', cardListDataFromServer);
    // save card list data
    mtgCards = cardListDataFromServer;
});

// Listen for deck data to display
socket.on('broadcast-round-data', (data) => {
    // {match1:{}, match2:{},...}}
    console.log('data', data);

    roundData = data;

    if (data[match_id] && data[match_id][`player-main-deck-${side_id}`]) {
        deckData = {
            mainDeck: transformDeck(data[match_id][`player-main-deck-${side_id}`] || []),
            sideDeck: transformDeck(data[match_id][`player-side-deck-${side_id}`] || []),
            playerName: data[match_id][`player-name-${side_id}`] || 'Unknown Player',
            archetype: data[match_id][`player-archetype-${side_id}`] || 'Unknown Archetype'
        };
        console.log('deck data', deckData);
        // Call a function to render the decks
        renderDecks();
    } else {
        console.log('deck data not found for url parameters', match_id, side_id);
    }
});

function createCleanedCardMap(cardsList) {
    const cleanedMap = {};

    for (const originalName in cardsList) {
        const cleaned = originalName
            .replace(/\s*\(.*?\)$/, '') // remove trailing (set info)
            .replace(/^"+|"+$/g, '')    // remove quotes
            .replace(/&/g, 'and')       // replace &
            .trim();

        // Only store the first match for a cleaned name
        if (!cleanedMap[cleaned]) {
            cleanedMap[cleaned] = cardsList[originalName];
        }
    }

    return cleanedMap;
}

function getURLFromCardName(cardName, cardsList) {
    let cleaned = cardName.includes('//')
        ? cardName.split('//')[0].trim()
        : cardName.trim();

    cleaned = cleaned.replace(/^"+|"+$/g, '').replace(/&/g, 'and').replace(/\s*\(.*?\)$/, '').trim();

    return cardsList[cleaned];
}

// Function to transform deck data into an object with counts
function transformDeck(deckArray) {
    const deckObject = [];
    let cleanedCardsMap = {};
    if (selectedGame === 'mtg') {
        cleanedCardsMap = createCleanedCardMap(mtgCards);
    }
    if (selectedGame === 'riftbound') {
        cleanedCardsMap = createCleanedCardMap(riftboundCards);
    }
    console.log(cleanedCardsMap)
    deckArray.forEach(card => {
        // Split the card string into count and name
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card]; // Default count to 1 if no number is found
        const count = parseInt(parts[1], 10); // Get the count
        const name = parts[2]; // Get the card name
        let url = '';
        url = getURLFromCardName(name, cleanedCardsMap);
        deckObject.push({
            'card-name': name,
            'card-count': count,
            'card-url': url
        });
    });
    return deckObject;
}

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
    } else if (selectedGame === 'rift') {
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