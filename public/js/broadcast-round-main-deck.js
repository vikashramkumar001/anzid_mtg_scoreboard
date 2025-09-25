const socket = io();
let roundData = {};
let deckData = {};
let selectedGame = '';  // global game type, e.g., 'mtg' or 'riftbound'

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

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

// Listen for deck data to display
socket.on('broadcast-round-data', (data) => {
    // {match1:{}, match2:{},...}}
    console.log('data', data);

    roundData = data;

    if (data[match_id] && data[match_id][`player-main-deck-${side_id}`]) {
        // ask server to transform main deck data
        socket.emit('transform-main-deck-data', ({
            deckData: data[match_id][`player-main-deck-${side_id}`] || [],
            gameType: selectedGame,
            sideID: side_id,
            matchID: match_id
        }));
    } else {
        console.log('deck data not found for url parameters', match_id, side_id);
    }
});

// listen for transformed deck to display
socket.on('transformed-main-deck-data', (data) => {
    console.log('transformed main deck data from server', data);
    if (data.sideID === side_id && data.gameType === selectedGame && data.matchID === match_id) {
        deckData = {
            mainDeck: data.deckData,
            sideDeck: [],
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

// Function to render the decks on the page
function renderDecks() {
    // try to render - clear view regardless
    if (selectedGame === 'riftbound') {
        // check that deckData if right type
        if (typeof deckData.mainDeck === 'object' && Object.keys(deckData.mainDeck).length !== 0) {
            if (orientation === 'vertical') {
                renderRiftboundVerticalDeck(deckData.mainDeck);
            } else {
                renderRiftboundDeckSections(deckData.mainDeck);
            }
            renderManaSymbols('', 'player-mana-symbols');
        } else {
            console.log('riftbound selected but not correct deckData type - clearing');
            // Clear previous deck displays
            document.getElementById('main-deck-container').innerHTML = '';
        }
    }
    if (selectedGame === 'mtg') {
        if (Array.isArray(deckData.mainDeck) && deckData.mainDeck.length !== 0) {
            // existing MTG layout
            const deckDisplayDetails = document.getElementById('deck-display-details');
            deckDisplayDetails.style.display = 'flex';
            // Clear previous deck displays
            document.getElementById('main-deck-container').innerHTML = '';

            if (orientation === 'vertical') {
                renderMTGVerticalDeck();
            } else {
                // Render main deck horizontally
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
            renderManaSymbols(deckData.manaSymbols || '', 'player-mana-symbols');
        } else {
            console.log('mtg selected but not correct deckData type - clearing');
            // Clear previous deck displays
            document.getElementById('main-deck-container').innerHTML = '';
        }
    }
}

// RIFTBOUND RENDERING
function renderRiftboundDeckSections(deckObj) {
    const deckDisplayDetails = document.getElementById('deck-display-details');
    deckDisplayDetails.style.display = 'none';
    const container = document.getElementById('main-deck-container');
    container.innerHTML = ''; // Clear previous

    const sections = ['legend', 'runes', 'battlefields', 'other'];
    const sectionTitles = {
        legend: 'Legend',
        runes: 'Runes',
        battlefields: 'Battlefields',
        other: 'Main Deck'
    };

    sections.forEach(key => {
        let cards = deckObj[key];
        if (!cards || cards.length === 0) return;

        // Apply visual logic per section
        if (key === 'legend') {
            cards = [cards[0]]; // Only first legend
        } else if (key === 'battlefields') {
            cards = cards.slice(0, 3); // Max 3
        } else if (key === 'other') {
            cards = cards.slice(0, 18); // Max 18
        }

        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = `deck-section-wrapper ${key}-section`;

        cards.forEach(card => {
            if (card['card-url']) {
                const cardEl = document.createElement('div');
                cardEl.className = 'main-deck-card';
                if (key === 'battlefields') {
                    cardEl.innerHTML = `
                  <div class="card-rotated-wrapper">
                    <img src="${card['card-url']}" class="card-src rotated">
                  </div>
                  <div class="card-count">${card['card-count']}</div>
                `;
                } else {
                    cardEl.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
                }
                sectionWrapper.appendChild(cardEl);
            }
        });

        container.appendChild(sectionWrapper);
    });
}

// VERTICAL RENDERING FUNCTIONS
function renderMTGVerticalDeck() {
    const mainDeckContainer = document.getElementById('main-deck-container');
    mainDeckContainer.className = 'vertical-deck-container';
    
    const totalCards = deckData.mainDeck.length;
    const availableHeight = 1080 - 130 - 40; // Available height for cards
    const cardSpacing = 10;
    
    let cardHeight, fontScaleFactor;
    
    // Only scale if more than 18 cards
    if (totalCards > 15) {
        const totalSpacing = (totalCards - 1) * cardSpacing;
        const availableForCards = availableHeight - totalSpacing;
        cardHeight = Math.max(20, availableForCards / totalCards); // Minimum 20px height
        fontScaleFactor = Math.max(0.4, cardHeight / 50);
    } else {
        // Use original sizing for 18 or fewer cards
        cardHeight = 50;
        fontScaleFactor = 1;
    }
    
    // Render all cards with conditional sizing
    deckData.mainDeck.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'vertical-card';
        cardElement.style.height = `${cardHeight}px`;
        cardElement.innerHTML = `
            <div class="vertical-card-number" style="font-size: ${20 * fontScaleFactor}px;">${card['card-count']}</div>
            <div class="vertical-card-name" style="font-size: ${20 * fontScaleFactor}px;">${card['card-name']}</div>
            <div class="vertical-card-background" style="background-image: url('${card['card-url']}');background-position: 20px -60px;background-size: cover;"></div>
        `;
        mainDeckContainer.appendChild(cardElement);
    });
}

function renderRiftboundVerticalDeck(deckObj) {
    const mainDeckContainer = document.getElementById('main-deck-container');
    mainDeckContainer.className = 'vertical-deck-container';
    
    // Flatten all cards from different sections
    const allCards = [];
    const sections = ['legend', 'runes', 'battlefields', 'other'];
    
    sections.forEach(section => {
        if (deckObj[section] && Array.isArray(deckObj[section])) {
            deckObj[section].forEach(card => {
                allCards.push(card);
            });
        }
    });
    
    const totalCards = allCards.length;
    const availableHeight = 1080 - 130 - 40; // Available height for cards
    const cardSpacing = 10;
    
    let cardHeight, fontScaleFactor;
    
    // Only scale if more than 18 cards
    if (totalCards > 15) {
        console.log('scaling cards');
        const totalSpacing = (totalCards - 1) * cardSpacing;
        const availableForCards = availableHeight - totalSpacing;
        cardHeight = Math.max(20, availableForCards / totalCards); // Minimum 20px height
        fontScaleFactor = Math.max(0.4, cardHeight / 50);
    } else {
        // Use original sizing for 18 or fewer cards
        cardHeight = 50;
        fontScaleFactor = 1;
    }
    
    // Render all cards with conditional sizing
    allCards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'vertical-card';
        cardElement.style.height = `${cardHeight}px`;
        cardElement.innerHTML = `
            <div class="vertical-card-number" style="font-size: ${20 * fontScaleFactor}px;">${card['card-count']}</div>
            <div class="vertical-card-name" style="font-size: ${20 * fontScaleFactor}px;">${card['card-name']}</div>
            <div class="vertical-card-background" style="background-image: url('${card['card-url']}');background-position: 20px -60px;background-size: cover;"></div>
        `;
        mainDeckContainer.appendChild(cardElement);
    });
}


// MANA SYMBOLS

function renderManaSymbols(inputStr, containerId, scenario = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
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