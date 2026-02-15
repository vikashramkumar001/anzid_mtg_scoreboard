const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let roundData = {};
let deckData = {};
let selectedGame = '';  // global game type, e.g., 'mtg' or 'riftbound'
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';
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

// Add side class to body for left/right alignment (normalize to 'left' or 'right')
const sideClass = (side_id === '1' || side_id?.toLowerCase() === 'left') ? 'left' : 'right';
document.body.classList.add(sideClass);

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

// Transform Scryfall URL from full card (png) to art_crop for vertical decklists
function getArtCropUrl(cardUrl) {
    if (!cardUrl) return '';
    // Scryfall art_crop uses .jpg extension instead of .png
    return cardUrl.replace('/png/', '/art_crop/').replace('.png', '.jpg');
}

// Parse mana cost string into array of symbols
// e.g., "{2}{W}{U}" -> ["2", "W", "U"]
function parseManaCost(manaCost) {
    if (!manaCost) return [];
    const matches = manaCost.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return matches.map(s => s.slice(1, -1)); // Remove { and }
}

// Generate HTML for card row mana symbols
function renderCardManaSymbols(manaCost, symbolSize = 16) {
    const symbols = parseManaCost(manaCost);
    if (symbols.length === 0) return '';

    const symbolsHtml = symbols.map(symbol => {
        // Scryfall SVG symbol URL format:
        // - Basic: W, U, B, R, G, C, 1, 2, etc.
        // - Hybrid mana uses slash: W/U -> WU (remove slash)
        // - Phyrexian: W/P -> WP
        const cleanSymbol = symbol.replace(/\//g, '');
        const src = `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(cleanSymbol)}.svg`;
        return `<img src="${src}" alt="${symbol}" class="mana-symbol" style="width: ${symbolSize}px; height: ${symbolSize}px;">`;
    }).join('');

    return `<div class="vertical-card-mana">${symbolsHtml}</div>`;
}

// Riftbound Battlefields Dictionary
// Maps battlefield names to their left and right side image URLs
// Files with "180" are for left side, files without "180" are for right side
// Default image is used as fallback when a battlefield is not found or empty
const RIFTBOUND_BATTLEFIELDS_DEFAULT = {
    left: '/assets/images/riftbound/battlefields/_0000_Default.png',
    right: '/assets/images/riftbound/battlefields/_0000_Default.png'
};

// Riftbound Runes Dictionary
// Maps rune letters to their icon image URLs
const RIFTBOUND_RUNES = {
    'r': '/assets/images/riftbound/icons/runes-outlined/Fury-outlined.png',
	'g': '/assets/images/riftbound/icons/runes-outlined/Calm-outlined.png',
    'b': '/assets/images/riftbound/icons/runes-outlined/Mind-outlined.png',
    'o': '/assets/images/riftbound/icons/runes-outlined/Body-outlined.png',
	'p': '/assets/images/riftbound/icons/runes-outlined/Chaos-outlined.png',
	'y': '/assets/images/riftbound/icons/runes-outlined/Order-outlined.png'
};

const RIFTBOUND_BATTLEFIELDS = {
    'default': {
        left: '/assets/images/riftbound/battlefields/_0000_Default180.png',
        right: '/assets/images/riftbound/battlefields/_0000_Default.png'
    },
    'Altar to Unity': {
        left: '/assets/images/riftbound/battlefields/_0000_Altar-to-Unity180.png',
        right: '/assets/images/riftbound/battlefields/_0024_Altar-to-Unity.png'
    },
    'Aspirant\'s Climb': {
        left: '/assets/images/riftbound/battlefields/_0001_Aspirant_s-Climb180.png',
        right: '/assets/images/riftbound/battlefields/_0025_Aspirant_s-Climb.png'
    },
    'Back Alley Bar': {
        left: '/assets/images/riftbound/battlefields/_0002_Back-Alley-Bar180.png',
        right: '/assets/images/riftbound/battlefields/_0026_Back-Alley-Bar.png'
    },
    'Bandle Tree': {
        left: '/assets/images/riftbound/battlefields/_0003_Bandle-Tree180.png',
        right: '/assets/images/riftbound/battlefields/_0027_Bandle-Tree.png'
    },
    'Fortified Position': {
        left: '/assets/images/riftbound/battlefields/_0004_Fortified-Position180.png',
        right: '/assets/images/riftbound/battlefields/_0028_Fortified-Position.png'
    },
    'Grove of the God Willow': {
        left: '/assets/images/riftbound/battlefields/_0005_Grove-of-the-God-Willow180.png',
        right: '/assets/images/riftbound/battlefields/_0029_Grove-of-the-God-Willow.png'
    },
    'Hallowed Tomb': {
        left: '/assets/images/riftbound/battlefields/_0006_Hallowed-Tomb180.png',
        right: '/assets/images/riftbound/battlefields/_0030_Hallowed-Tomb.png'
    },
    'Monastery of Hirana': {
        left: '/assets/images/riftbound/battlefields/_0007_Monastery-of-Hirana180.png',
        right: '/assets/images/riftbound/battlefields/_0031_Monastery-of-Hirana.png'
    },
    'Navori Fighting Pit': {
        left: '/assets/images/riftbound/battlefields/_0008_Navori-Fighting-Pit180.png',
        right: '/assets/images/riftbound/battlefields/_0032_Navori-Fighting-Pit.png'
    },
    'Obelisk of Power': {
        left: '/assets/images/riftbound/battlefields/_0009_Obelisk-of-Power180.png',
        right: '/assets/images/riftbound/battlefields/_0033_Obelisk-of-Power.png'
    },
    'Reaver\'s Row': {
        left: '/assets/images/riftbound/battlefields/_0010_Reaver_s-Row180.png',
        right: '/assets/images/riftbound/battlefields/_0034_Reaver_s-Row.png'
    },
    'Reckoner\'s Arena': {
        left: '/assets/images/riftbound/battlefields/_0011_Reckoner_s-Arena180.png',
        right: '/assets/images/riftbound/battlefields/_0035_Reckoner_s-Arena.png'
    },
    'Sigil of the Storm': {
        left: '/assets/images/riftbound/battlefields/_0012_Sigil-of-the-Storm180.png',
        right: '/assets/images/riftbound/battlefields/_0036_Sigil-of-the-Storm.png'
    },
    'Startipped Peak': {
        left: '/assets/images/riftbound/battlefields/_0013_Startipped-Peak180.png',
        right: '/assets/images/riftbound/battlefields/_0037_Startipped-Peak.png'
    },
    'Targon\'s Peak': {
        left: '/assets/images/riftbound/battlefields/_0014_Targon_s-Peak180.png',
        right: '/assets/images/riftbound/battlefields/_0038_Targon_s-Peak.png'
    },
    'The Arena\'s Greatest': {
        left: '/assets/images/riftbound/battlefields/_0015_The-Arena_s-Greatest180.png',
        right: '/assets/images/riftbound/battlefields/_0039_The-Arena_s-Greatest.png'
    },
    'The Dreaming Tree': {
        left: '/assets/images/riftbound/battlefields/_0016_The-Dreaming-Tree180.png',
        right: '/assets/images/riftbound/battlefields/_0040_The-Dreaming-Tree.png'
    },
    'The Grand Plaza': {
        left: '/assets/images/riftbound/battlefields/_0017_The-Grand-Plaza180.png',
        right: '/assets/images/riftbound/battlefields/_0041_The-Grand-Plaza.png'
    },
    'Trifarian War Camp': {
        left: '/assets/images/riftbound/battlefields/_0018_Trifarian-War-Camp180.png',
        right: '/assets/images/riftbound/battlefields/_0042_Trifarian-War-Camp.png'
    },
    'Vilemaw\'s Lair': {
        left: '/assets/images/riftbound/battlefields/_0019_Vilemaw_s-Lair180.png',
        right: '/assets/images/riftbound/battlefields/_0043_Vilemaw_s-Lair.png'
    },
    'Void Gate': {
        left: '/assets/images/riftbound/battlefields/_0020_Void-Gate180.png',
        right: '/assets/images/riftbound/battlefields/_0044_Void-Gate.png'
    },
    'Windswept Hillock': {
        left: '/assets/images/riftbound/battlefields/_0021_Windswept-Hillock180.png',
        right: '/assets/images/riftbound/battlefields/_0045_Windswept-Hillock.png'
    },
    'Zaun Warrens': {
        left: '/assets/images/riftbound/battlefields/_0022_Zaun-Warrens180.png',
        right: '/assets/images/riftbound/battlefields/_0046_Zaun-Warrens.png'
    },
    'The Candlelit Sanctum': {
        left: '/assets/images/riftbound/battlefields/_0023_The-Candlelit-Sanctum180.png',
        right: '/assets/images/riftbound/battlefields/_0047_The-Candlelit-Sanctum.png'
    },
	'Emperor\'s Dais': {
	    left: '/assets/images/riftbound/battlefields/_0048_Emperor_s-Dais180.png',
	    right: '/assets/images/riftbound/battlefields/_0072_Emperor_s-Dais.png'
	},
	'Forge of the Fluft': {
	    left: '/assets/images/riftbound/battlefields/_0049_Forge-of-the-Fluft180.png',
	    right: '/assets/images/riftbound/battlefields/_0073_Forge-of-the-Fluft.png'
	},
	'Forgotten Monument': {
	    left: '/assets/images/riftbound/battlefields/_0050_Forgotten-Monument180.png',
	    right: '/assets/images/riftbound/battlefields/_0074_Forgotten-Monument.png'
	},
	'Hall of Legends': {
	    left: '/assets/images/riftbound/battlefields/_0051_Hall-of-Legends180.png',
	    right: '/assets/images/riftbound/battlefields/_0075_Hall-of-Legends.png'
	},
	'Marai Spire': {
	    left: '/assets/images/riftbound/battlefields/_0052_Marai-Spire180.png',
	    right: '/assets/images/riftbound/battlefields/_0076_Marai-Spire.png'
	},
	'Minefield': {
	    left: '/assets/images/riftbound/battlefields/_0053_Minefield180.png',
	    right: '/assets/images/riftbound/battlefields/_0077_Minefield.png'
	},
	'Ornn\'s Forge': {
	    left: '/assets/images/riftbound/battlefields/_0054_Ornn_s-Forge180.png',
	    right: '/assets/images/riftbound/battlefields/_0078_Ornn_s-Forge.png'
	},
	'Power Nexus': {
	    left: '/assets/images/riftbound/battlefields/_0055_Power-Nexus180.png',
	    right: '/assets/images/riftbound/battlefields/_0079_Power-Nexus.png'
	},
	'Ravenbloom Conservatory': {
	    left: '/assets/images/riftbound/battlefields/_0056_Ravenbloom-Conservatory180.png',
	    right: '/assets/images/riftbound/battlefields/_0080_Ravenbloom-Conservatory.png'
	},
	'Rockfall Path': {
	    left: '/assets/images/riftbound/battlefields/_0057_Rockfall-Path180.png',
	    right: '/assets/images/riftbound/battlefields/_0081_Rockfall-Path.png'
	},
	'Seat of Power': {
	    left: '/assets/images/riftbound/battlefields/_0058_Seat-of-Power180.png',
	    right: '/assets/images/riftbound/battlefields/_0082_Seat-of-Power.png'
	},
	'Sunken Temple': {
	    left: '/assets/images/riftbound/battlefields/_0059_Sunken-Temple180.png',
	    right: '/assets/images/riftbound/battlefields/_0083_Sunken-Temple.png'
	},
	'The Papertree': {
	    left: '/assets/images/riftbound/battlefields/_0060_The-Papertree180.png',
	    right: '/assets/images/riftbound/battlefields/_0084_The-Papertree.png'
	},
	'Treasure Hoard': {
	    left: '/assets/images/riftbound/battlefields/_0061_Treasure-Hoard180.png',
	    right: '/assets/images/riftbound/battlefields/_0085_Treasure-Hoard.png'
	},
	'Veiled Temple': {
	    left: '/assets/images/riftbound/battlefields/_0062_Veiled-Temple180.png',
	    right: '/assets/images/riftbound/battlefields/_0086_Veiled-Temple.png'
	}
};

// Riftbound Legends Descriptions Dictionary
// Maps legend names to their legend ability image URLs
const RIFTBOUND_LEGENDS_DESCRIPTIONS = {
    'default': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0000_default.png',
    'Kai\'sa': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0001_Kaisa, Daughter of the Void.png',
    'Volibear': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0002_Volibear, Relentless Storm.png',
    'Sett': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0003_Sett, The Boss.png',
    'Viktor': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0004_Viktor, Herald of the Arcane.png',
    'Teemo': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0005_Teemo, Swift Scout.png',
    'Leona': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0006_Leona, Radiant Dawn.png',
    'Yasuo': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0007_Yasuo, Unforgiven.png',
    'Yas': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0007_Yasuo, Unforgiven.png',
    'Lee Sin': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0008_Lee Sin, Blind Monk.png',
    'Ahri': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0009_Ahri, Nine-Tailed Fox.png',
    'Darius': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0010_Darius, Hand of Noxus.png',
    'Jinx': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0011_Jinx, Loose Cannon.png',
    'Miss Fortune': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0012_Miss Fortune, Bounty Hunter.png',
    'Garen': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0013_Garen, Might of Demacia.png',
    'Lux': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0014_Lux, Lady of Luminosity.png',
    'Annie': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0015_Annie, Dark Child.png',
    'Master Yi': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0016_Master Yi, Wuju Bladesman.png',
	'Rumble': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0017_Rumble, Mechanized Menace.png',
	'Lucian': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0018_Lucian, Purifier.png',
	'Draven': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0019_Draven, Glorious Executioner.png',
	'Rek\'Sai': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0020_Reksai, Void Burrower.png',
	'Ornn': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0021_Ornn, Fire Below the Mountain.png',
	'Jax': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0022_Jax, Grandmaster at Arms.png',
	'Irelia': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0023_Irelia, Blade Dancer.png',
	'Azir': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0024_Azir, Emperor of the Sands.png',
	'Ezreal': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0025_Ezreal, Prodigal Explorer.png',
	'Renata Glasc': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0026_Renata Glasc, Chem-Baroness.png',
	'Sivir': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0027_Sivir, Battle Mistress.png',
	'Fiora': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0028_Fiora, Grand Duelist.png'
};

// Listen for deck data to display
socket.on('broadcast-round-data', (data) => {
    // {match1:{}, match2:{},...}}
    console.log('data', data);

    roundData = data;

    // Update legend description if game is riftbound and legend data exists
    if (selectedGame === 'riftbound' && data[match_id] && data[match_id][`player-legend-${side_id}`]) {
        const riftboundSection = document.getElementById('deck-display-riftbound');
        if (riftboundSection) {
            const container = riftboundSection.querySelector('#riftbound-main-deck-container');
            if (container) {
                const legend = data[match_id][`player-legend-${side_id}`] || '';
                createLegendDescriptionSection(legend, container);
            }
        }
    }

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
            // Always update metadata from roundData to ensure it's fresh (fixes player name update issue)
            if (roundData[match_id]) {
                deckData.playerName = roundData[match_id][`player-name-${side_id}`] || 'Unknown Player';
                deckData.archetype = roundData[match_id][`player-archetype-${side_id}`] || 'Unknown Archetype';
                deckData.manaSymbols = roundData[match_id][`player-mana-symbols-${side_id}`] || '';
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
            // Always update metadata from roundData to ensure it's fresh (fixes player name update issue)
            if (roundData[match_id]) {
                deckData.playerName = roundData[match_id][`player-name-${side_id}`] || 'Unknown Player';
                deckData.archetype = roundData[match_id][`player-archetype-${side_id}`] || 'Unknown Archetype';
                deckData.manaSymbols = roundData[match_id][`player-mana-symbols-${side_id}`] || '';
            }
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
    legendDisplay.textContent = legend ? `${legend}` : '';
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

// Function to create and update the legend description section
function createLegendDescriptionSection(legend, container) {
    if (!container) return;
    
    // Remove existing legend description section if it exists
    const existingSection = container.querySelector('#riftbound-legend-description-section');
    if (existingSection) {
        existingSection.remove();
    }
    
    // Create the section wrapper
    const sectionWrapper = document.createElement('div');
    sectionWrapper.id = 'riftbound-legend-description-section';
    sectionWrapper.className = 'deck-section-wrapper legend-description-section';
    
    // Determine which image to use
    let imageUrl;
    if (legend) {
        const legendValue = legend.trim();
        const legendValueLower = legendValue.toLowerCase();
        let matchedLegendKey = null;
        
        // First try exact case-insensitive match
        for (const legendKey in RIFTBOUND_LEGENDS_DESCRIPTIONS) {
            if (legendKey.toLowerCase() === legendValueLower) {
                matchedLegendKey = legendKey;
                break;
            }
        }
        
        // If no exact match, check if the value contains any of the legend dictionary keys
        // This handles cases like "Jinx, Loose Cannon" matching "Jinx"
        if (!matchedLegendKey) {
            for (const legendKey in RIFTBOUND_LEGENDS_DESCRIPTIONS) {
                const legendKeyLower = legendKey.toLowerCase();
                // Check if the incoming value contains the legend key (e.g., "jinx, loose cannon" contains "jinx")
                if (legendValueLower.includes(legendKeyLower)) {
                    matchedLegendKey = legendKey;
                    break;
                }
            }
        }
        
        // Get the description image URL
        if (matchedLegendKey && RIFTBOUND_LEGENDS_DESCRIPTIONS[matchedLegendKey]) {
            imageUrl = RIFTBOUND_LEGENDS_DESCRIPTIONS[matchedLegendKey];
        } else {
            // Use default if no match found
            imageUrl = RIFTBOUND_LEGENDS_DESCRIPTIONS['default'];
        }
    } else {
        // Show default if legend is empty
        imageUrl = RIFTBOUND_LEGENDS_DESCRIPTIONS['default'];
    }
    
    // Create img element directly as child of section wrapper
    const imgElement = document.createElement('img');
    imgElement.className = 'legend-description-image';
    const encodedUrl = encodeURI(imageUrl);
    const cacheBuster = new Date().getTime();
    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
    imgElement.src = finalUrl;
    imgElement.alt = legend ? `Legend description for ${legend.trim()}` : 'Default legend description';
    
    sectionWrapper.appendChild(imgElement);
    container.appendChild(sectionWrapper);
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
                    // Filter out section headers (Main Deck, Sideboard, Pack 1/2/3)
                    const actualCards = deckData.mainDeck.filter(card => {
                        const cardName = card['card-name']?.toLowerCase().trim();
                        return cardName !== 'main deck' && cardName !== 'sideboard' &&
                               cardName !== 'pack 1' && cardName !== 'pack 2' && cardName !== 'pack 3';
                    });
                    const totalCards = actualCards.length;

                    // Determine cards per row based on total card count
                    // Goal: 3 rows, with appropriate cards per row
                    let cardsPerRow;
                    if (totalCards <= 24) {
                        cardsPerRow = 8;
                    } else if (totalCards <= 27) {
                        cardsPerRow = 9;
                    } else if (totalCards <= 30) {
                        cardsPerRow = 10;
                    } else {
                        // For >30 cards, compare 3 rows vs 4 rows
                        const cardsPerRow3 = Math.ceil(totalCards / 3);
                        const cardsPerRow4 = Math.ceil(totalCards / 4);

                        // Calculate total width needed for each option
                        const availableWidthCalc = 1920 - 20;
                        const cardWidth3 = (availableWidthCalc - (cardsPerRow3 - 1) * 5 - 10) / cardsPerRow3;
                        const cardWidth4 = (availableWidthCalc - (cardsPerRow4 - 1) * 5 - 10) / cardsPerRow4;

                        // Use 4 rows if it gives larger cards
                        cardsPerRow = (cardWidth4 > cardWidth3) ? cardsPerRow4 : cardsPerRow3;
                    }

                    // Calculate card width based on container dimensions
                    const containerHeight = mainDeckContainer.clientHeight || 756;
                    const availableHeight = containerHeight - 10; // subtract padding
                    const availableWidth = 1920 - 20; // screen width minus margins

                    // Determine number of rows needed
                    const numRows = Math.ceil(totalCards / cardsPerRow);

                    // Card width based on fitting rows in height (aspect ratio ~1:1.4)
                    const maxCardHeight = (availableHeight - (numRows - 1) * 5) / numRows;
                    const cardWidthFromHeight = maxCardHeight / 1.4;

                    // Card width based on fitting cardsPerRow in screen width
                    const cardWidthFromWidth = (availableWidth - (cardsPerRow - 1) * 5 - 10) / cardsPerRow;

                    // Use smaller width to fit both constraints
                    const scalingCardWidth = Math.min(cardWidthFromHeight, cardWidthFromWidth);

                    // Dynamically set container width to fit exactly cardsPerRow cards
                    const requiredWidth = cardsPerRow * scalingCardWidth + (cardsPerRow - 1) * 5 + 10;
                    mainDeckContainer.style.width = `${requiredWidth}px`;

                    actualCards.forEach((card, index) => {
                        const cardElement = document.createElement('div');
                        cardElement.className = 'main-deck-card';
                        cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
                        cardElement.style.width = `${scalingCardWidth}px`;
                        mainDeckContainer.appendChild(cardElement);
                    });
                }
            }

            // Optionally, display player name and archetype
            if (deckDisplayDetails) {
                deckDisplayDetails.innerHTML = `
                    <h1 class="player-name">${deckData.playerName}</h1>
                    <h5 class="archetype-name">
                        ${deckData.archetype} <span id="player-mana-symbols" class="mana-symbols-container"></span>
                    </h5>
                `;

                // display mana symbols
                renderManaSymbols(deckData.manaSymbols || '', 'player-mana-symbols');

                // Auto-scale player name to fit container
                document.fonts.ready.then(() => {
                    const playerNameEl = deckDisplayDetails.querySelector('.player-name');
                    if (playerNameEl) {
                        autoScaleText(playerNameEl, 115, 73, 1100);
                        const scaledFontSize = parseFloat(playerNameEl.style.fontSize);

                        // Keep height fixed at 100px (from CSS) so archetype stays in place
                        // Anchor name to bottom of its box - push text down as font shrinks
                        const baseTop = 42;
                        const maxFontSize = 115;
                        const fontShrinkage = maxFontSize - scaledFontSize;
                        playerNameEl.style.top = (baseTop + fontShrinkage) + 'px';
                    }
                    // Archetype stays at fixed position (set in CSS)
                });
            }
        } else {
            console.log('mtg selected but not correct deckData type - clearing');
            // Clear previous deck displays
            const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
            if (mainDeckContainer) mainDeckContainer.innerHTML = '';
        }
    }
    if (selectedGame === 'vibes') {
        const vibesSection = document.getElementById('deck-display-vibes');
        if (!vibesSection) return;
        
        if (Array.isArray(deckData.mainDeck) && deckData.mainDeck.length !== 0) {
            // Vibes uses same layout as MTG for now but is 3x7
            const deckDisplayDetails = vibesSection.querySelector('#vibes-deck-display-details');
            // Clear previous deck displays
            const mainDeckContainer = vibesSection.querySelector('#vibes-main-deck-container');
            if (mainDeckContainer) mainDeckContainer.innerHTML = '';

            if (orientation === 'vertical') {
                if (deckDisplayDetails) deckDisplayDetails.style.display = 'none';
                renderVibesVerticalDeck();
            } else {
                if (deckDisplayDetails) deckDisplayDetails.style.display = 'flex';
                // Render main deck horizontally
                if (mainDeckContainer) {
                    // Filter out section headers (Main Deck, Sideboard, Pack 1/2/3)
                    const actualCards = deckData.mainDeck.filter(card => {
                        const cardName = card['card-name']?.toLowerCase().trim();
                        return cardName !== 'main deck' && cardName !== 'sideboard' &&
                               cardName !== 'pack 1' && cardName !== 'pack 2' && cardName !== 'pack 3';
                    });
                    const totalCards = actualCards.length;

                    // No overlap, display cards normally
                    // 3 x 7 rows
                    if (totalCards <= 21) {
                        // Max 7 per row
                        const cardsPerRow = Math.min(7, totalCards);

                        // Card footprint = card width + left/right margins (must match your CSS)
                        // If .main-deck-card is 180px wide with margin: 5px, footprint is 190px
                        const cardFootprint = 190;

                        // Force container width to fit exactly N cards
                        const targetWidth = cardsPerRow * cardFootprint;

                        mainDeckContainer.style.width = `${targetWidth}px`;
                        mainDeckContainer.style.maxWidth = `${targetWidth}px`;

                        actualCards.forEach((card, index) => {
                            const cardElement = document.createElement('div');
                            cardElement.className = 'main-deck-card';
                            cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
                            mainDeckContainer.appendChild(cardElement);
                        });
                    } else {
                        // RULE #2: max 3 rows (so compute cards-per-row to keep it to 3)
                        mainDeckContainer.style.width = '';
                        mainDeckContainer.style.maxWidth = '1340px'; // or leave blank if CSS already sets it

                        const numberCardsPerRow = Math.ceil(totalCards / 3);

                        // Use actual container width (NOT 1920)
                        const containerWidth = mainDeckContainer.clientWidth || 1340;

                        // same padding/margin assumptions you used
                        const scalingCardWidth = ((containerWidth - 10) / numberCardsPerRow) - 10;

                        actualCards.forEach((card, index) => {
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
                        ${deckData.archetype} <span id="vibes-player-mana-symbols" class="mana-symbols-container"></span>
                    </h5>
                `;

                // display mana symbols (if applicable for vibes)
                renderManaSymbols(deckData.manaSymbols || '', 'vibes-player-mana-symbols');

                // Auto-scale player name to fit container
                document.fonts.ready.then(() => {
                    const playerNameEl = deckDisplayDetails.querySelector('.player-name');
                    if (playerNameEl) {
                        autoScaleText(playerNameEl, 144, 73, 1700);
                        const scaledFontSize = parseFloat(playerNameEl.style.fontSize);

                        // Keep height fixed at 100px (from CSS) so archetype stays in place
                        // Anchor name to bottom of its box - push text down as font shrinks
                        const baseTop = 50;
                        const maxFontSize = 144;
                        const fontShrinkage = maxFontSize - scaledFontSize;
                        playerNameEl.style.top = (baseTop + fontShrinkage) + 'px';
                    }
                    // Archetype stays at fixed position (set in CSS)
                });
            }
        } else {
            console.log('vibes selected but not correct deckData type - clearing');
            // Clear previous deck displays
            const mainDeckContainer = vibesSection.querySelector('#vibes-main-deck-container');
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
    
    // Create and populate the legend description section
    createLegendDescriptionSection(legend, container);

    // Handle battlefields separately using scoreboard-style implementation
    if (deckObj.battlefields && deckObj.battlefields.length > 0) {
        const battlefields = deckObj.battlefields.slice(0, 3); // Max 3
        renderBattlefields(battlefields, container);
    } else {
        // Show default battlefields if none exist
        renderBattlefields([], container);
    }

    // Handle runes section separately - use rune icons from runes string
    const runesString = roundData[match_id] ? (roundData[match_id][`player-runes-${side_id}`] || '').trim().toLowerCase() : '';
    if (runesString) {
        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = 'deck-section-wrapper runes-section';

        // Map rune letters to rune names for matching with deck data
        const runeLetterToName = {
            'g': 'Calm',
            'p': 'Chaos',
            'r': 'Fury',
            'b': 'Mind',
            'y': 'Order',
            'o': 'Body'
        };

        // Create a map of rune card names to their counts from deck data
        const runeCardsMap = {};
        if (deckObj.runes && Array.isArray(deckObj.runes)) {
            deckObj.runes.forEach(card => {
                const cardName = card['card-name'] || '';
                // Match rune name in card name (case-insensitive)
                for (const [letter, runeName] of Object.entries(runeLetterToName)) {
                    if (cardName.toLowerCase().includes(runeName.toLowerCase())) {
                        runeCardsMap[letter] = card['card-count'] || 0;
                        break;
                    }
                }
            });
        }

        // Process first 2 runes from the string
        const runesToDisplay = runesString.slice(0, 2);
        for (let i = 0; i < runesToDisplay.length; i++) {
            const letter = runesToDisplay[i];
            const runeUrl = RIFTBOUND_RUNES[letter];
            
            if (runeUrl) {
                const cardEl = document.createElement('div');
                cardEl.className = 'main-deck-card';
                const cardCount = runeCardsMap[letter] || 0;
                cardEl.innerHTML = `
                    <img src="${runeUrl}" class="riftbound-rune-icon" alt="Rune ${letter}">
                    <div class="card-count">${cardCount}</div>
                `;
                sectionWrapper.appendChild(cardEl);
            }
        }

        if (sectionWrapper.children.length > 0) {
            container.appendChild(sectionWrapper);
        }
    }

    // Handle other section (main deck cards)
    const otherCards = deckObj['other'];
    if (otherCards && otherCards.length > 0) {
        const cards = otherCards.slice(0, 18); // Max 18

        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = 'deck-section-wrapper other-section';

        cards.forEach(card => {
            if (card['card-url']) {
                const cardEl = document.createElement('div');
                cardEl.className = 'main-deck-card';
                cardEl.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
                sectionWrapper.appendChild(cardEl);
            }
        });

        container.appendChild(sectionWrapper);
    }

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

    // Calculate card height to fit all cards in available space
    // Container is 980px with no padding
    const availableHeight = 980;
    const maxCardHeight = 50;
    const minCardHeight = 18;

    // Calculate height to fit all cards, clamped between min and max
    let cardHeight = availableHeight / totalCards;
    cardHeight = Math.max(minCardHeight, Math.min(maxCardHeight, cardHeight));

    const fontScaleFactor = cardHeight < 30 ? 0.8 : 1;
    
    // Render all cards with conditional sizing
    const manaSymbolSize = Math.max(12, Math.min(18, cardHeight * 0.6));
    deckData.mainDeck.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'vertical-card';
        cardElement.style.height = `${cardHeight}px`;

        // Check if this is a section header (Main Deck or Sideboard)
        const cardName = card['card-name']?.toLowerCase().trim();
        const isSectionHeader = cardName === 'main deck' || cardName === 'sideboard';

        if (isSectionHeader) {
            // Render section header - centered text, black background, no card art
            cardElement.innerHTML = `
                <div class="vertical-card-section-header" style="font-size: ${20 * fontScaleFactor}px;">${card['card-name']}</div>
                <div class="vertical-card-background" style="background: black;"></div>
            `;
        } else {
            // Render normal card
            // For double-faced cards, only show the front half
            // Exception: if both halves are single words (e.g., "Fire // Ice"), show the full name
            let displayName = card['card-name'];
            if (card['card-name']?.includes('//')) {
                const parts = card['card-name'].split('//').map(p => p.trim());
                const frontWords = parts[0].split(/\s+/).length;
                const backWords = parts[1]?.split(/\s+/).length || 0;
                // Only truncate if either half has more than 1 word
                if (frontWords > 1 || backWords > 1) {
                    displayName = parts[0];
                }
            }
            const manaHtml = renderCardManaSymbols(card['mana-cost'], manaSymbolSize);
            cardElement.innerHTML = `
                <div class="vertical-card-number" style="font-size: ${20 * fontScaleFactor}px;">${card['card-count']}</div>
                <div class="vertical-card-name" style="font-size: ${20 * fontScaleFactor}px;">${displayName}</div>
                ${manaHtml}
                <div class="vertical-card-background" style="background: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.4) 100%), url('${getArtCropUrl(card['card-url'])}'); background-size: 100% 100%, 65% auto; background-position: center, calc(100% + 55px) calc(50% + 20px); background-repeat: no-repeat;"></div>
            `;
        }
        cardsContainer.appendChild(cardElement);
    });

    mainDeckContainer.appendChild(cardsContainer);
}

function renderVibesVerticalDeck() {
    const vibesSection = document.getElementById('deck-display-vibes');
    if (!vibesSection) return;
    
    const mainDeckContainer = vibesSection.querySelector('#vibes-main-deck-container');
    if (!mainDeckContainer) return;
    
    mainDeckContainer.className = 'vertical-deck-container';
    
    // Clear previous deck displays
    mainDeckContainer.innerHTML = '';
    
    // Create single cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'vibes-single-column-cards-container';
    
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
        { key: 'other', title: 'Main Deck' }
    ];
    
    // Create single cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'riftbound-single-column-cards-container';
    
    // Count total cards first to determine card height (excluding runes which are handled separately)
    let totalCards = 0;
    sections.forEach(section => {
        const cards = deckObj[section.key];
        if (cards && cards.length > 0) {
            totalCards += cards.length; // Count all cards in each section
        }
    });
    
    // Add runes count (max 2)
    const runesString = roundData[match_id] ? (roundData[match_id][`player-runes-${side_id}`] || '').trim().toLowerCase() : '';
    if (runesString) {
        totalCards += Math.min(runesString.length, 2);
    }
    
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
    
    // Handle runes section separately - use rune icons from runes string
    if (runesString) {
        // Map rune letters to rune names for matching with deck data
        const runeLetterToName = {
            'g': 'Calm',
            'p': 'Chaos',
            'r': 'Fury',
            'b': 'Mind',
            'y': 'Order',
            'o': 'Body'
        };

        // Create a map of rune card names to their counts from deck data
        const runeCardsMap = {};
        if (deckObj.runes && Array.isArray(deckObj.runes)) {
            deckObj.runes.forEach(card => {
                const cardName = card['card-name'] || '';
                // Match rune name in card name (case-insensitive)
                for (const [letter, runeName] of Object.entries(runeLetterToName)) {
                    if (cardName.toLowerCase().includes(runeName.toLowerCase())) {
                        runeCardsMap[letter] = card['card-count'] || 0;
                        break;
                    }
                }
            });
        }

        // Process first 2 runes from the string
        const runesToDisplay = runesString.slice(0, 2);
        for (let i = 0; i < runesToDisplay.length; i++) {
            const letter = runesToDisplay[i];
            const runeUrl = RIFTBOUND_RUNES[letter];
            
            if (runeUrl) {
                const cardElement = document.createElement('div');
                cardElement.className = 'riftbound-vertical-card';
                cardElement.style.height = `${cardHeight}px`;
                const cardCount = runeCardsMap[letter] || 0;
                cardElement.innerHTML = `
                    <div class="riftbound-card-number" style="font-size: ${20 * fontScaleFactor}px;">${cardCount}</div>
                    <img src="${runeUrl}" class="riftbound-rune-icon-vertical" alt="Rune ${letter}" style="width: 40px; height: 40px; object-fit: contain;">
                `;
                cardsContainer.appendChild(cardElement);
            }
        }
    }
    
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

// Auto-scale font size to fit container width
function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    // Create a temporary span to measure text width accurately
    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerHTML = element.innerHTML;
    document.body.appendChild(temp);

    // Reduce font size until text fits
    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';
    document.body.removeChild(temp);
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
function updateTheme(game, vendor, playerCount) {
    const gameSelection = game;
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
    const vibesSection = document.getElementById('deck-display-vibes');

    if (selectedGame === 'mtg') {
        console.log('Switching to MTG mode...');
        if (mtgSection) mtgSection.style.display = 'block';
        if (riftboundSection) riftboundSection.style.display = 'none';
        if (vibesSection) vibesSection.style.display = 'none';
    } else if (selectedGame === 'riftbound') {
        console.log('Switching to Riftbound mode...');
        if (mtgSection) mtgSection.style.display = 'none';
        if (riftboundSection) riftboundSection.style.display = 'block';
        if (vibesSection) vibesSection.style.display = 'none';
        setRiftboundBackground();

        // Update legend description when switching to riftbound
        if (riftboundSection) {
            const container = riftboundSection.querySelector('#riftbound-main-deck-container');
            if (container && roundData[match_id] && roundData[match_id][`player-legend-${side_id}`]) {
                const legend = roundData[match_id][`player-legend-${side_id}`] || '';
                createLegendDescriptionSection(legend, container);
            }
        }
    } else if (selectedGame === 'vibes') {
        console.log('Switching to Vibes mode...');
        if (mtgSection) mtgSection.style.display = 'none';
        if (riftboundSection) riftboundSection.style.display = 'none';
        if (vibesSection) vibesSection.style.display = 'block';
    } else {
        // Default: hide all if unknown game type
        if (mtgSection) mtgSection.style.display = 'none';
        if (riftboundSection) riftboundSection.style.display = 'none';
        if (vibesSection) vibesSection.style.display = 'none';
    }

    // Request side deck transformation now that game selection is known
    requestSideDeckTransformation();

    // Apply vendor overrides
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
    if (isLeft && orientation === 'horizontal') {
        backgroundImage = '/assets/images/riftbound/decklist/frame/Decklist-New-v4-Blue_Prepped-3.png';
    } else if (isRight && orientation === 'horizontal') {
        backgroundImage = '/assets/images/riftbound/decklist/frame/Decklist-New-v4-Green_Prepped-3.png';
    } else {
        // Default to blue if side_id is not recognized
        console.log('Unknown side_id, defaulting to blue background');
        //backgroundImage = '/assets/images/riftbound/decklist/frame/Decklist-New-v4-Blue_Prepped-2.png';
    }
    
    // Set the background image with cache buster
    const cacheBuster = new Date().getTime();
    const finalUrl = `${backgroundImage}?v=${cacheBuster}`;
    backgroundParent.style.backgroundImage = `url("${finalUrl}")`;
    console.log(`Riftbound background set to: ${finalUrl} for side_id: ${side_id}`);
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