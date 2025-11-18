const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let roundData = {};
let deckData = {};
let selectedGame = '';  // global game type, e.g., 'mtg' or 'riftbound'
let pendingSideDeckData = null;  // Store side deck data until game selection is known

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

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

// Riftbound Battlefields Dictionary
// Maps battlefield names to their left and right side image URLs
// Files with "180" are for left side, files without "180" are for right side
// Default image is used as fallback when a battlefield is not found or empty
const RIFTBOUND_BATTLEFIELDS_DEFAULT = {
    left: '/assets/images/riftbound/scoreboard/battlefields/_0000_Default.png',
    right: '/assets/images/riftbound/scoreboard/battlefields/_0000_Default.png'
};

const RIFTBOUND_BATTLEFIELDS = {
    'default': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0000_Default180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0000_Default.png'
    },
    'Altar to Unity': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0000_Altar-to-Unity180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0024_Altar-to-Unity.png'
    },
    'Aspirant\'s Climb': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0001_Aspirant_s-Climb180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0025_Aspirant_s-Climb.png'
    },
    'Back Alley Bar': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0002_Back-Alley-Bar180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0026_Back-Alley-Bar.png'
    },
    'Bandle Tree': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0003_Bandle-Tree180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0027_Bandle-Tree.png'
    },
    'Fortified Position': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0004_Fortified-Position180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0028_Fortified-Position.png'
    },
    'Grove of the God Willow': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0005_Grove-of-the-God-Willow180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0029_Grove-of-the-God-Willow.png'
    },
    'Hallowed Tomb': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0006_Hallowed-Tomb180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0030_Hallowed-Tomb.png'
    },
    'Monastery of Hirana': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0007_Monastery-of-Hirana180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0031_Monastery-of-Hirana.png'
    },
    'Navori Fighting Pit': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0008_Navori-Fighting-Pit180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0032_Navori-Fighting-Pit.png'
    },
    'Obelisk of Power': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0009_Obelisk-of-Power180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0033_Obelisk-of-Power.png'
    },
    'Reaver\'s Row': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0010_Reaver_s-Row180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0034_Reaver_s-Row.png'
    },
    'Reckoner\'s Arena': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0011_Reckoner_s-Arena180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0035_Reckoner_s-Arena.png'
    },
    'Sigil of the Storm': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0012_Sigil-of-the-Storm180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0036_Sigil-of-the-Storm.png'
    },
    'Startipped Peak': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0013_Startipped-Peak180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0037_Startipped-Peak.png'
    },
    'Targon\'s Peak': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0014_Targon_s-Peak180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0038_Targon_s-Peak.png'
    },
    'The Arena\'s Greatest': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0015_The-Arena_s-Greatest180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0039_The-Arena_s-Greatest.png'
    },
    'The Dreaming Tree': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0016_The-Dreaming-Tree180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0040_The-Dreaming-Tree.png'
    },
    'The Grand Plaza': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0017_The-Grand-Plaza180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0041_The-Grand-Plaza.png'
    },
    'Trifarian War Camp': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0018_Trifarian-War-Camp180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0042_Trifarian-War-Camp.png'
    },
    'Vilemaw\'s Lair': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0019_Vilemaw_s-Lair180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0043_Vilemaw_s-Lair.png'
    },
    'Void Gate': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0020_Void-Gate180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0044_Void-Gate.png'
    },
    'Windswept Hillock': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0021_Windswept-Hillock180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0045_Windswept-Hillock.png'
    },
    'Zaun Warrens': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0022_Zaun-Warrens180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0046_Zaun-Warrens.png'
    },
    'The Candlelit Sanctum': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0023_The-Candlelit-Sanctum180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0047_The-Candlelit-Sanctum.png'
    }
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

    // Also check for side deck data
    if (data[match_id] && data[match_id][`player-side-deck-${side_id}`]) {
        // Store side deck data for later transformation when game selection is known
        pendingSideDeckData = data[match_id][`player-side-deck-${side_id}`] || [];
        
        // Request transformation if game selection is already known
        if (selectedGame) {
            requestSideDeckTransformation();
        }
    }
});

// listen for transformed deck to display
socket.on('transformed-main-deck-data', (data) => {
    console.log('transformed main deck data from server', data);
    if (data.sideID === side_id && data.gameType === selectedGame && data.matchID === match_id) {
        // Update or initialize deckData
        if (!deckData || Object.keys(deckData).length === 0) {
            deckData = {
                mainDeck: data.deckData,
                sideDeck: [],
                playerName: roundData[match_id][`player-name-${side_id}`] || 'Unknown Player',
                archetype: roundData[match_id][`player-archetype-${side_id}`] || 'Unknown Archetype',
                manaSymbols: roundData[match_id][`player-mana-symbols-${side_id}`] || ''
            };
        } else {
            deckData.mainDeck = data.deckData;
            // Preserve existing sideDeck if it exists
            if (!deckData.sideDeck) {
                deckData.sideDeck = [];
            }
        }
        console.log('deck data', deckData);
        // Call a function to render the decks
        renderDecks();
    } else {
        console.log('transformed deck data - not the correct side or game type or match id')
    }
})

// listen for transformed side deck to display
socket.on('transformed-side-deck-data', (data) => {
    // Check if this is for the current match/side/game
    const isMatch = data.sideID === side_id && data.gameType === selectedGame && data.matchID === match_id;
    
    if (isMatch) {
        // Update deckData with side deck
        if (!deckData || Object.keys(deckData).length === 0) {
            deckData = {
                mainDeck: {},
                sideDeck: data.deckData,
                playerName: roundData[match_id] ? roundData[match_id][`player-name-${side_id}`] || 'Unknown Player' : 'Unknown Player',
                archetype: roundData[match_id] ? roundData[match_id][`player-archetype-${side_id}`] || 'Unknown Archetype' : 'Unknown Archetype',
                manaSymbols: roundData[match_id] ? roundData[match_id][`player-mana-symbols-${side_id}`] || '' : ''
            };
        } else {
            deckData.sideDeck = data.deckData;
        }
        // Call a function to render the decks
        renderDecks();
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

// Function to create the player name section dynamically
function createPlayerNameSection(playerName, legend) {
    const riftboundSection = document.getElementById('deck-display-riftbound');
    if (!riftboundSection) return;
    
    // Remove existing player name section if it exists
    const existingSection = riftboundSection.querySelector('#player-name-section');
    if (existingSection) {
        existingSection.remove();
    }

    // Create the player name section
    const playerNameSection = document.createElement('div');
    playerNameSection.id = 'player-name-section';

    // Create parent div for player name display
    const playerNameDisplayWrapper = document.createElement('div');
    playerNameDisplayWrapper.className = 'player-name-display-wrapper';
    
    // Create the player name display
    const playerNameDisplay = document.createElement('div');
    playerNameDisplay.className = 'player-name-display';
    playerNameDisplay.textContent = playerName;
    
    // Append player name display to its wrapper
    playerNameDisplayWrapper.appendChild(playerNameDisplay);

    // Create parent div for legend display
    const legendDisplayWrapper = document.createElement('div');
    legendDisplayWrapper.className = 'player-legend-display-wrapper';
    
    // Create the legend display
    const legendDisplay = document.createElement('div');
    legendDisplay.className = 'player-legend-display';
    legendDisplay.textContent = legend ? `Playing ${legend}` : '';
    // Set color based on side_id: #19c8ff for left, #1ae930 for right
    legendDisplay.style.color = side_id === 'left' ? '#19c8ff' : '#1ae930';
    
    // Append legend display to its wrapper
    legendDisplayWrapper.appendChild(legendDisplay);

    // Append elements to the section
    playerNameSection.appendChild(playerNameDisplayWrapper);
    playerNameSection.appendChild(legendDisplayWrapper);

    // Append the section to the riftbound-main-deck-container
    const mainDeckContainer = riftboundSection.querySelector('#riftbound-main-deck-container');
    if (mainDeckContainer) {
        mainDeckContainer.appendChild(playerNameSection);
    }
}

// Function to render the decks on the page
function renderDecks() {
    // try to render - clear view regardless
    if (selectedGame === 'riftbound') {
        const riftboundSection = document.getElementById('deck-display-riftbound');
        if (!riftboundSection) return;
        
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
            const container = riftboundSection.querySelector('#riftbound-main-deck-container');
            if (container) container.innerHTML = '';
        }
    }
    if (selectedGame === 'mtg') {
        const mtgSection = document.getElementById('deck-display-mtg');
        if (!mtgSection) return;
        
        if (Array.isArray(deckData.mainDeck) && deckData.mainDeck.length !== 0) {
            // existing MTG layout
            const deckDisplayDetails = mtgSection.querySelector('#deck-display-details');
            // Clear previous deck displays
            const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
            if (mainDeckContainer) mainDeckContainer.innerHTML = '';

            if (orientation === 'vertical') {
                if (deckDisplayDetails) deckDisplayDetails.style.display = 'none';
                renderMTGVerticalDeck();
            } else {
                if (deckDisplayDetails) deckDisplayDetails.style.display = 'flex';
                // Render main deck horizontally
                if (mainDeckContainer) {
                    const totalCards = deckData.mainDeck.length;

                    // No overlap, display cards normally
                    // 3 x 10 rows
                    if (totalCards <= 30) {
                        deckData.mainDeck.forEach((card, index) => {
                            const cardElement = document.createElement('div');
                            cardElement.className = 'main-deck-card';
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
                            cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
                            cardElement.style.width = `${scalingCardWidth}px`;
                            mainDeckContainer.appendChild(cardElement);
                        });
                    }
                }
            }

            // Optionally, display player name and archetype
            if (deckDisplayDetails) {
                deckDisplayDetails.innerHTML = `
                    <h1 class="player-name">${deckData.playerName}</h1>
                    <h5 class="archetype-name">
                        <span id="player-mana-symbols" class="mana-symbols-container"></span> ${deckData.archetype}
                    </h5>
                `;

                // display mana symbols
                renderManaSymbols(deckData.manaSymbols || '', 'player-mana-symbols');
            }
        } else {
            console.log('mtg selected but not correct deckData type - clearing');
            // Clear previous deck displays
            const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
            if (mainDeckContainer) mainDeckContainer.innerHTML = '';
        }
    }
}

// Function to render battlefields using scoreboard-style implementation
function renderBattlefields(battlefields, container) {
    if (!container) return;
    
    // Determine if this is left or right player
    const isLeft = side_id === '1' || side_id?.toLowerCase() === 'left';
    const side = isLeft ? 'left' : 'right';
    
    // Create battlefields section wrapper
    const sectionWrapper = document.createElement('div');
    sectionWrapper.className = 'deck-section-wrapper battlefields-section';
    
    // Render up to 3 battlefields
    for (let i = 0; i < 3; i++) {
        const battlefieldIndex = i + 1;
        
        // Create background div
        const backgroundDiv = document.createElement('div');
        backgroundDiv.className = `riftbound-battlefield-background riftbound-battlefield-background-${battlefieldIndex}`;
        
        // Create wrapper for name
        const nameWrapper = document.createElement('div');
        nameWrapper.className = `riftbound-battlefield-wrapper riftbound-battlefield-wrapper-${battlefieldIndex}`;
        
        // Create name div
        const nameDiv = document.createElement('div');
        nameDiv.id = `riftbound-battlefield-${battlefieldIndex}`;
        nameDiv.className = 'riftbound-battlefield-name';
        
        nameWrapper.appendChild(nameDiv);
        
        if (i < battlefields.length && battlefields[i]) {
            const battlefield = battlefields[i];
            const battlefieldName = battlefield['card-name'] ? battlefield['card-name'].trim() : '';
            
            // Set battlefield name
            nameDiv.textContent = battlefieldName;
            nameDiv.style.display = 'block';
            
            // Set battlefield background image
            let battlefieldData = null;
            
            if (battlefieldName) {
                // Try exact match first
                battlefieldData = RIFTBOUND_BATTLEFIELDS[battlefieldName];
                
                // If no exact match, try case-insensitive match
                if (!battlefieldData) {
                    const battlefieldNameLower = battlefieldName.toLowerCase();
                    for (const key in RIFTBOUND_BATTLEFIELDS) {
                        if (key.toLowerCase() === battlefieldNameLower) {
                            battlefieldData = RIFTBOUND_BATTLEFIELDS[key];
                            break;
                        }
                    }
                }
            }
            
            let imageUrl;
            if (battlefieldData && battlefieldData[side]) {
                imageUrl = battlefieldData[side];
            } else {
                // Use default image if battlefield name doesn't match
                imageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT[side];
            }
            
            const encodedUrl = encodeURI(imageUrl);
            const cacheBuster = new Date().getTime();
            const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
            backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
            backgroundDiv.style.backgroundSize = 'cover';
            backgroundDiv.style.backgroundPosition = 'center';
            backgroundDiv.style.backgroundRepeat = 'no-repeat';
            backgroundDiv.style.display = 'block';
        } else {
            // Show default image for missing battlefield slots
            nameDiv.textContent = '';
            nameDiv.style.display = 'none';
            
            // Use default image for missing battlefields
            const defaultImageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT[side];
            const encodedUrl = encodeURI(defaultImageUrl);
            const cacheBuster = new Date().getTime();
            const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
            backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
            backgroundDiv.style.backgroundSize = 'cover';
            backgroundDiv.style.backgroundPosition = 'center';
            backgroundDiv.style.backgroundRepeat = 'no-repeat';
            backgroundDiv.style.display = 'block';
        }
        
        sectionWrapper.appendChild(backgroundDiv);
        sectionWrapper.appendChild(nameWrapper);
    }
    
    container.appendChild(sectionWrapper);
}

// RIFTBOUND RENDERING
function renderRiftboundDeckSections(deckObj) {
    const riftboundSection = document.getElementById('deck-display-riftbound');
    if (!riftboundSection) return;
    
    const deckDisplayDetails = riftboundSection.querySelector('#riftbound-deck-display-details');
    if (deckDisplayDetails) deckDisplayDetails.style.display = 'none';
    
    const container = riftboundSection.querySelector('#riftbound-main-deck-container');
    if (!container) return;
    
    container.innerHTML = ''; // Clear previous

    // Create and populate the player name section dynamically for Riftbound
    const legend = roundData[match_id] ? roundData[match_id][`player-legend-${side_id}`] || '' : '';
    createPlayerNameSection(deckData.playerName, legend);

    // Handle battlefields separately using scoreboard-style implementation
    if (deckObj.battlefields && deckObj.battlefields.length > 0) {
        const battlefields = deckObj.battlefields.slice(0, 3); // Max 3
        renderBattlefields(battlefields, container);
    } else {
        // Show default battlefields if none exist
        renderBattlefields([], container);
    }

    const sections = ['runes', 'other'];
    const sectionTitles = {
        runes: 'Runes',
        other: 'Main Deck'
    };

    sections.forEach(key => {
        let cards = deckObj[key];
        if (!cards || cards.length === 0) return;

        // Apply visual logic per section
        if (key === 'runes') {
            cards = cards.slice(0, 2); // Max 2
        } else if (key === 'other') {
            cards = cards.slice(0, 18); // Max 18
        }

        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = `deck-section-wrapper ${key}-section`;

        cards.forEach(card => {
            if (card['card-url']) {
                const cardEl = document.createElement('div');
                cardEl.className = 'main-deck-card';
                if (key === 'runes') {
                    cardEl.innerHTML = `
                        <div class="runes-card">
                            <div class="runes-background" style="--bg-image: url('${card['card-url']}');"></div>
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

    // Handle side deck separately
    if (deckData.sideDeck && Array.isArray(deckData.sideDeck) && deckData.sideDeck.length > 0) {
        const sideDeckCards = deckData.sideDeck.slice(0, 8); // Max 8 cards
        
        const sideDeckWrapper = document.createElement('div');
        sideDeckWrapper.className = 'deck-section-wrapper side-deck-section';

        sideDeckCards.forEach(card => {
            if (card['card-url']) {
                const cardEl = document.createElement('div');
                cardEl.className = 'main-deck-card';
                cardEl.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
                sideDeckWrapper.appendChild(cardEl);
            }
        });

        container.appendChild(sideDeckWrapper);
    }
}

// VERTICAL RENDERING FUNCTIONS
function renderMTGVerticalDeck() {
    const mtgSection = document.getElementById('deck-display-mtg');
    if (!mtgSection) return;
    
    const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
    if (!mainDeckContainer) return;
    
    mainDeckContainer.className = 'vertical-deck-container';
    
    // Clear previous deck displays
    mainDeckContainer.innerHTML = '';
    
    // Create single cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'mtg-single-column-cards-container';
    
    const totalCards = deckData.mainDeck.length;
    
    // Use dynamic card height based on total card count
    let cardHeight, fontScaleFactor;
    if (totalCards > 35) {
        cardHeight = 25;
        fontScaleFactor = 1;
    } else if (totalCards > 26) {
        cardHeight = 30;
        fontScaleFactor = 1;
    } else if (totalCards > 21) {
        cardHeight = 41;
        fontScaleFactor = 1;
    } else {
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
            <div class="vertical-card-background" style="background-image: url('${card['card-url']}');background-position: 40px -105px;background-size: cover;"></div>
        `;
        cardsContainer.appendChild(cardElement);
    });
    
    mainDeckContainer.appendChild(cardsContainer);
}

function renderRiftboundVerticalDeck(deckObj) {
    const riftboundSection = document.getElementById('deck-display-riftbound');
    if (!riftboundSection) return;
    
    const deckDisplayDetails = riftboundSection.querySelector('#riftbound-deck-display-details');
    if (deckDisplayDetails) deckDisplayDetails.style.display = 'none';
    
    const mainDeckContainer = riftboundSection.querySelector('#riftbound-main-deck-container');
    if (!mainDeckContainer) return;
    
    mainDeckContainer.className = 'riftbound-vertical-single-column-container';
    
    // Clear previous deck displays
    mainDeckContainer.innerHTML = '';
    
    // Define sections in the required order: battlefields, other cards, then runes
    const sections = [
        { key: 'battlefields', title: 'Battlefields' },
        { key: 'other', title: 'Main Deck' },
        { key: 'runes', title: 'Runes' }
    ];
    
    // Create single cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'riftbound-single-column-cards-container';
    
    // Count total cards first to determine card height
    let totalCards = 0;
    sections.forEach(section => {
        const cards = deckObj[section.key];
        if (cards && cards.length > 0) {
            totalCards += cards.length; // Count all cards in each section
        }
    });
    
    // Use dynamic card height based on total card count
    const cardHeight = totalCards > 21 ? 41 : 50;
    const fontScaleFactor = totalCards > 21 ? 1 : 1;
    
    // Process each section in order and add cards to the single container
    sections.forEach(section => {
        const cards = deckObj[section.key];
        if (!cards || cards.length === 0) return; // Skip empty sections
        
        // Render cards for this section
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'riftbound-vertical-card';
            cardElement.style.height = `${cardHeight}px`;
            
            // Use different styling based on section type
            if (section.key === 'battlefields') {
                cardElement.innerHTML = `
                    <div class="riftbound-battlefield-card">
                        <div class="riftbound-battlefield-icon"></div>
                        <div class="riftbound-battlefield-name">${card['card-name']}</div>
                        <div class="riftbound-battlefield-background" style="--bg-image: url('${card['card-url']}');"></div>
                    </div>
                `;
            } else if (section.key === 'runes') {
                // Runes show card counts and card names like main deck cards
                cardElement.innerHTML = `
                    <div class="riftbound-card-number" style="font-size: ${20 * fontScaleFactor}px;">${card['card-count']}</div>
                    <div class="riftbound-card-name" style="font-size: ${20 * fontScaleFactor}px;">${card['card-name']}</div>
                    <div class="riftbound-runes-background" style="background-image: url('${card['card-url']}');background-position:-40px -172px;background-size: 120% auto;"></div>
                `;
            } else {
                // Main deck shows card counts
                cardElement.innerHTML = `
                    <div class="riftbound-card-number" style="font-size: ${20 * fontScaleFactor}px;">${card['card-count']}</div>
                    <div class="riftbound-card-name" style="font-size: ${20 * fontScaleFactor}px;">${card['card-name']}</div>
                    <div class="riftbound-card-background" style="background-image: url('${card['card-url']}');background-position: 20px -100px;background-size: 120% auto;"></div>
                `;
            }
            cardsContainer.appendChild(cardElement);
        });
    });
    
    mainDeckContainer.appendChild(cardsContainer);
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

// Helper function to request side deck transformation
function requestSideDeckTransformation() {
    if (pendingSideDeckData && selectedGame) {
        socket.emit('transform-side-deck-data', ({
            deckData: pendingSideDeckData,
            gameType: selectedGame,
            sideID: side_id,
            matchID: match_id
        }));
    }
}

// game selection logic
function handleGameSelectionUpdate(gameSelection) {
    const normalized = gameSelection?.toLowerCase();
    if (!normalized || normalized === selectedGame) return;

    // Remove previous game class if it exists
    if (selectedGame) {
        document.body.classList.remove(selectedGame);
    }

    selectedGame = normalized;
    console.log('Game selection updated:', selectedGame);

    // Add game type class to body
    document.body.classList.add(selectedGame);

    // Show/hide appropriate sections
    const mtgSection = document.getElementById('deck-display-mtg');
    const riftboundSection = document.getElementById('deck-display-riftbound');

    if (selectedGame === 'mtg') {
        console.log('Switching to MTG mode...');
        if (mtgSection) mtgSection.style.display = 'block';
        if (riftboundSection) riftboundSection.style.display = 'none';
    } else if (selectedGame === 'riftbound') {
        console.log('Switching to Riftbound mode...');
        if (mtgSection) mtgSection.style.display = 'none';
        if (riftboundSection) riftboundSection.style.display = 'block';
        setRiftboundBackground();
    } else {
        // Default: hide both if unknown game type
        if (mtgSection) mtgSection.style.display = 'none';
        if (riftboundSection) riftboundSection.style.display = 'none';
    }

    // Request side deck transformation now that game selection is known
    requestSideDeckTransformation();
}

// Function to set the riftbound background based on side_id
function setRiftboundBackground() {
    const riftboundSection = document.getElementById('deck-display-riftbound');
    if (!riftboundSection) return;
    
    const backgroundParent = riftboundSection.querySelector('#riftbound-background-parent');
    if (!backgroundParent) return;
    
    // Determine if this is left or right player
    // side_id can be '1' or '2', or potentially 'left' or 'right'
    const isLeft = side_id === '1' || side_id?.toLowerCase() === 'left';
    const isRight = side_id === '2' || side_id?.toLowerCase() === 'right';
    
    let backgroundImage;
    if (isLeft) {
        backgroundImage = '/assets/images/riftbound/deckview/Decklist-New-v4-Blue_Prepped.png';
    } else if (isRight) {
        backgroundImage = '/assets/images/riftbound/deckview/Decklist-New-v4-Green_Prepped.png';
    } else {
        // Default to blue if side_id is not recognized
        console.log('Unknown side_id, defaulting to blue background');
        backgroundImage = '/assets/images/riftbound/deckview/Decklist-New-v4-Blue_Prepped.png';
    }
    
    // Set the background image with cache buster
    const cacheBuster = new Date().getTime();
    const finalUrl = `${backgroundImage}?v=${cacheBuster}`;
    backgroundParent.style.backgroundImage = `url("${finalUrl}")`;
    console.log(`Riftbound background set to: ${finalUrl} for side_id: ${side_id}`);
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