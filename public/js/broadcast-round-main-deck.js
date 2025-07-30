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

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

// send request for card list data from server
socket.emit('riftbound-get-card-list-data');

// handle receiving card list data from server
socket.on('riftbound-card-list-data', ({cardListData: cardListDataFromServer}) => {
    // console.log('got card list data from server', cardListDataFromServer);
    // save card list data
    riftboundCards = cardListDataFromServer;
})

// send request for card list data from server
socket.emit('mtg-get-card-list-data');

// handle receiving card list data from server
socket.on('mtg-card-list-data', ({cardListData: cardListDataFromServer}) => {
    // console.log('got card list data from server', cardListDataFromServer);
    // save card list data
    mtgCards = cardListDataFromServer;
})

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
            archetype: data[match_id][`player-archetype-${side_id}`] || 'Unknown Archetype',
            manaSymbols: data[match_id][`player-mana-symbols-${side_id}`] || ''
        };
        console.log('deck data', deckData);
        // Call a function to render the decks
        renderDecks();
    } else {
        console.log('deck data not found for url parameters', match_id, side_id);
    }
});

// ask for global match data to get font family
socket.emit('get-match-global-data');

// Listen for global data update
socket.on('update-match-global-data', (data) => {
    console.log('global data', data);
    // specifically checking for font family change
    checkFontFamily(data['globalData']['global-font-family']);
})

// Function to check if font family needs updating
function checkFontFamily(globalFont) {
    if (globalFont) {
        document.documentElement.style.setProperty('--dynamic-font', globalFont);
    }
}

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

    if (selectedGame === 'mtg') {
        return cardsList[cleaned];
    } else {
        return cardsList[cleaned]?.imageUrl;
    }
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
    document.getElementById('main-deck-container').innerHTML = '';

    // Render main deck
    const mainDeckContainer = document.getElementById('main-deck-container');
    const totalCards = deckData.mainDeck.length;

    // No overlap, display cards normally
    // 3 x 10 rows
    if (totalCards <= 30) {
        deckData.mainDeck.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'main-deck-card';
            // cardElement.innerHTML = `<div class="card-name">${card['card-name']}</div>`;
            cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
            mainDeckContainer.appendChild(cardElement);
        });
    } else {
        // number of cards per row to maintain 3 rows -> total cards / 3 -> ceil
        const numberCardsPerRow = Math.ceil(totalCards / 3);
        // 5px each side on padding on main container -> 10px
        // 5px each side of card -> 10px
        const scalingCardWidth = ((1920 - 10) / numberCardsPerRow) - 10;
        deckData.mainDeck.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'main-deck-card';
            // cardElement.innerHTML = `<div class="card-name">${card['card-name']}</div>`;
            cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
            cardElement.style.width = `${scalingCardWidth}px`;
            mainDeckContainer.appendChild(cardElement);
        });
    }

    // Optionally, display player name and archetype
    const detailsElement = document.getElementById('deck-display-details');
    detailsElement.innerHTML = `
        <h1 class="player-name">${deckData.playerName}</h1>
        <h5 class="archetype-name">
            <span id="player-mana-symbols" class="mana-symbols-container"></span> ${deckData.archetype}
        </h5>
    `;

    // display mana symbols
    if (selectedGame === 'mtg') {
        renderManaSymbols(deckData.manaSymbols || '', 'player-mana-symbols');
    } else {
        renderManaSymbols('', 'player-mana-symbols');
    }
}

// MANA SYMBOLS

function renderManaSymbols(inputStr, containerId, scenario = {}) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear existing symbols

    const presentSymbols = new Set(
        inputStr.toUpperCase().split('').filter(char => MANA_SYMBOLS[char])
    );

    // If there are no valid symbols, hide the container and exit early
    // console.log(inputStr)
    // console.log(presentSymbols.size)
    if (presentSymbols.size === 0) {
        container.style.display = 'none';
        return;
    }

    // Otherwise, make sure it's visible
    container.style.display = 'inline-block';

    let symbolsToRender = MANA_ORDER.filter(symbol => presentSymbols.has(symbol));
    if (scenario.reverse === true) {
        symbolsToRender.reverse();
    }

    symbolsToRender.forEach(symbol => {
        const img = document.createElement('img');
        img.className = 'mana-symbols';
        img.src = MANA_SYMBOLS[symbol].src;
        img.alt = MANA_SYMBOLS[symbol].alt;
        container.appendChild(img);
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