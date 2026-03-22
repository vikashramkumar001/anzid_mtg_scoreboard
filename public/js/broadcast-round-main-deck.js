import {
    RIFTBOUND_RUNES_FILLED as RIFTBOUND_RUNES,
    RIFTBOUND_BATTLEFIELD_NAMES,
    RIFTBOUND_BATTLEFIELDS_BASE,
    RIFTBOUND_LEGENDS_CARD_FRAMES,
    RIFTBOUND_LEGENDS_DESCRIPTIONS,
} from './riftbound/constants.js';

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

// Star Wars Unlimited Aspects Dictionary
const SWU_ASPECTS = {
    'aggression': '/assets/images/starwars/icons/Aggression.png',
    'command': '/assets/images/starwars/icons/Command.png',
    'cunning': '/assets/images/starwars/icons/Cunning.png',
    'heroism': '/assets/images/starwars/icons/Heroism.png',
    'vigilance': '/assets/images/starwars/icons/Vigilance.png',
    'villainy': '/assets/images/starwars/icons/Villainy.png'
};

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

// Build battlefield lookup from shared names + base path
const RIFTBOUND_BATTLEFIELDS_DEFAULT = `${RIFTBOUND_BATTLEFIELDS_BASE}/Altar to Unity.png`;
const RIFTBOUND_BATTLEFIELDS = {};
RIFTBOUND_BATTLEFIELD_NAMES.forEach(name => {
    RIFTBOUND_BATTLEFIELDS[name] = `${RIFTBOUND_BATTLEFIELDS_BASE}/${name}.png`;
});

function getLegendCardFrameUrl(legendName) {
    if (!legendName) return null;
    const lowerInput = legendName.trim().toLowerCase();
    for (const key of Object.keys(RIFTBOUND_LEGENDS_CARD_FRAMES)) {
        if (lowerInput.includes(key.toLowerCase())) return RIFTBOUND_LEGENDS_CARD_FRAMES[key];
    }
    return null;
}

// Listen for deck data to display
socket.on('broadcast-round-data', (data) => {
    // {match1:{}, match2:{},...}}
    console.log('data', data);

    roundData = data;

    // Update player name immediately from round data (riftbound)
    if (selectedGame === 'riftbound' && data[match_id]) {
        createPlayerNameSection(data[match_id][`player-name-${side_id}`] || '');
    }

    // Update legend description if game is riftbound and legend data exists
    if (selectedGame === 'riftbound' && data[match_id] && data[match_id][`player-legend-${side_id}`]) {
        const legend = data[match_id][`player-legend-${side_id}`] || '';
        createLegendDescriptionSection(legend);
    }

    if (data[match_id] && (data[match_id][`player-main-deck-${side_id}`] || selectedGame === 'riftbound')) {
        // ask server to transform main deck data
        const transformPayload = {
            deckData: data[match_id][`player-main-deck-${side_id}`] || [],
            gameType: selectedGame,
            sideID: side_id,
            matchID: match_id,
            source: 'broadcast-round-main-deck'
        };
        // Pass master control fields for riftbound so server resolves image URLs
        if (selectedGame === 'riftbound') {
            transformPayload.riftboundMeta = {
                legend: data[match_id][`player-legend-${side_id}`] || '',
                champion: data[match_id][`player-champion-${side_id}`] || '',
                battlefields: [
                    data[match_id][`player-battlefield-1-${side_id}`] || '',
                    data[match_id][`player-battlefield-2-${side_id}`] || '',
                    data[match_id][`player-battlefield-3-${side_id}`] || ''
                ],
                runeColor1: data[match_id][`player-rune-color-1-${side_id}`] || '',
                runeQty1: data[match_id][`player-rune-qty-1-${side_id}`] || '',
                runeColor2: data[match_id][`player-rune-color-2-${side_id}`] || '',
                runeQty2: data[match_id][`player-rune-qty-2-${side_id}`] || '',
                runesString: data[match_id][`player-runes-${side_id}`] || ''
            };
            console.log('[Riftbound Debug] Master control fields sent to server:', JSON.stringify(transformPayload.riftboundMeta, null, 2));
            console.log('[Riftbound Debug] Main deck textarea:', data[match_id][`player-main-deck-${side_id}`]);
            console.log('[Riftbound Debug] Side deck textarea:', data[match_id][`player-side-deck-${side_id}`]);
        }
        socket.emit('transform-main-deck-data', transformPayload);
    } else if (selectedGame === 'starwars' && deckData && deckData.mainDeck) {
        // Leader/base changed but main deck already loaded — re-render to pick up new values
        renderDecks();
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
    if (data.gameType === 'riftbound' && data.sideID === side_id && data.matchID === match_id) {
        console.log('[Riftbound Debug] Resolved data from server:');
        console.log('  Legend image URL:', data.deckData.legendImageUrl);
        console.log('  Champion image URL:', data.deckData.championImageUrl);
        console.log('  Battlefields:', JSON.stringify(data.deckData.battlefields));
        console.log('  Runes:', JSON.stringify(data.deckData.runes));
        console.log('  Runes string:', data.deckData.runesString);
        console.log('  Other cards count:', (data.deckData.other || []).length);
    }
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
function createPlayerNameSection(playerName) {
    const detailsEl = document.getElementById('riftbound-deck-display-details');
    if (detailsEl) {
        detailsEl.textContent = playerName || '';
    }
}

// Function to update the static legend description image
function createLegendDescriptionSection(legend) {
    const imgEl = document.getElementById('riftbound-dl-legend-desc-img');
    if (!imgEl) return;

    let imageUrl;
    if (legend) {
        const legendValueLower = legend.trim().toLowerCase();
        let matchedKey = null;

        for (const key in RIFTBOUND_LEGENDS_DESCRIPTIONS) {
            if (key.toLowerCase() === legendValueLower) { matchedKey = key; break; }
        }
        if (!matchedKey) {
            for (const key in RIFTBOUND_LEGENDS_DESCRIPTIONS) {
                if (legendValueLower.includes(key.toLowerCase())) { matchedKey = key; break; }
            }
        }
        imageUrl = (matchedKey && RIFTBOUND_LEGENDS_DESCRIPTIONS[matchedKey])
            ? RIFTBOUND_LEGENDS_DESCRIPTIONS[matchedKey]
            : RIFTBOUND_LEGENDS_DESCRIPTIONS['default'];
    } else {
        imageUrl = RIFTBOUND_LEGENDS_DESCRIPTIONS['default'];
    }

    const cacheBuster = new Date().getTime();
    imgEl.src = `${encodeURI(imageUrl)}?v=${cacheBuster}`;
    imgEl.alt = legend ? `Legend description for ${legend.trim()}` : '';
}

// Parse a flat array of transformed card objects into categorized sections.
// Recognizes section headers from manual text entry across all games.
// Melee decklists are already pre-separated at ingest using category codes (0=main, 99=sideboard).
function filterManualEntry(cards) {
    const HEADER_MAP = {
        'maindeck':       'main',
        'main':           'main',
        'sideboard':      'sideboard',
        'side':           'sideboard',
        'legend':         'legend',
        'champion':       'champion',
        'chosenchampion': 'champion',
        'runepool':       'runes',
        'runes':          'runes',
        'rune':           'runes',
        'battlefield':    'battlefields',
        'battlefields':   'battlefields',
        'units':          'main',
        'spells':         'main',
        'leader':         'discard',
        'base':           'discard',
    };

    const result = {
        main: [],
        sideboard: [],
        legend: [],
        champion: [],
        runes: [],
        battlefields: []
    };

    let currentSection = 'main';

    for (const card of cards) {
        const rawName = (card['card-name'] || '').trim();
        if (!rawName) continue;

        // Normalize for header matching: lowercase, strip colon, strip "(N)", remove non-alphanumeric
        const normalized = rawName
            .toLowerCase()
            .replace(/:$/, '')
            .replace(/\s*\(\d+\)\s*$/, '')
            .replace(/[^a-z0-9]/g, '');

        const sectionKey = HEADER_MAP[normalized];
        if (sectionKey !== undefined) {
            currentSection = sectionKey;
            continue;
        }

        if (currentSection === 'discard') continue;
        if (result[currentSection]) {
            result[currentSection].push(card);
        } else {
            result.main.push(card);
        }
    }

    return result;
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
                    const { main: actualCards, sideboard } = filterManualEntry(deckData.mainDeck);
                    if (sideboard.length > 0) deckData.sideDeck = sideboard;
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
                    const { main: actualCards, sideboard } = filterManualEntry(deckData.mainDeck);
                    if (sideboard.length > 0) deckData.sideDeck = sideboard;
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
    if (selectedGame === 'starwars') {
        const starwarsSection = document.getElementById('deck-display-starwars');
        if (!starwarsSection) return;

        if (Array.isArray(deckData.mainDeck) && deckData.mainDeck.length !== 0) {
            const deckDisplayDetails = starwarsSection.querySelector('#starwars-deck-display-details');
            const mainDeckContainer = starwarsSection.querySelector('#starwars-main-deck-container');
            if (mainDeckContainer) mainDeckContainer.innerHTML = '';

            // Remove any previous leader/base header zone
            const oldHeaderZone = starwarsSection.querySelector('.starwars-deck-header-zone');
            if (oldHeaderZone) oldHeaderZone.remove();

            // Get leader/base names from roundData (synced from master control)
            const leaderName = roundData[match_id]?.[`player-leader-${side_id}`] || '';
            const baseName = roundData[match_id]?.[`player-base-${side_id}`] || '';


            let { main: actualCards, sideboard } = filterManualEntry(deckData.mainDeck);
            if (sideboard.length > 0) deckData.sideDeck = sideboard;


            // Find leader and base card images from the deck data (matched by normalized name)
            let leaderCard = null;
            let baseCard = null;
            if (leaderName) {
                const leaderNorm = leaderName.toLowerCase().replace(/[^a-z0-9]/g, '');
                leaderCard = actualCards.find(c => c['card-name']?.toLowerCase().replace(/[^a-z0-9]/g, '') === leaderNorm);
                if (leaderCard) {
                    actualCards = actualCards.filter(c => c !== leaderCard);
                }
            }
            if (baseName) {
                const baseNorm = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
                baseCard = actualCards.find(c => c['card-name']?.toLowerCase().replace(/[^a-z0-9]/g, '') === baseNorm);
                if (baseCard) {
                    actualCards = actualCards.filter(c => c !== baseCard);
                }
            }

            if (orientation === 'vertical') {
                if (deckDisplayDetails) deckDisplayDetails.style.display = 'none';
                renderStarWarsVerticalDeck();
            } else {
                if (deckDisplayDetails) deckDisplayDetails.style.display = 'flex';

                // Create leader/base header zone if we have either
                if (leaderCard || baseCard) {
                    const headerZone = document.createElement('div');
                    headerZone.className = 'starwars-deck-header-zone';

                    if (leaderCard) {
                        const leaderEl = document.createElement('div');
                        leaderEl.className = 'starwars-leader-card';
                        leaderEl.innerHTML = `
                            <span class="leader-label">Leader</span>
                            <img src="${leaderCard['card-url']}" class="leader-card-img">
                        `;
                        headerZone.appendChild(leaderEl);
                    }
                    if (baseCard) {
                        const baseEl = document.createElement('div');
                        baseEl.className = 'starwars-base-card';
                        baseEl.innerHTML = `
                            <span class="base-label">Base</span>
                            <img src="${baseCard['card-url']}" class="base-card-img">
                        `;
                        headerZone.appendChild(baseEl);
                    }

                    starwarsSection.querySelector('#starwars-deck-display-container').appendChild(headerZone);
                }

                if (mainDeckContainer) {
                    const totalCards = actualCards.length;
                    // Leader/base are always landscape at 220px height ≈ 308px wide
                    const headerWidth = (leaderCard || baseCard) ? 308 : 0;
                    const gap = (leaderCard || baseCard) ? 40 : 0;
                    const minMargin = 20;
                    // Max available width for main deck cards
                    const swAvailableWidth = 1920 - headerWidth - gap - (2 * minMargin);

                    let cardsPerRow;
                    if (totalCards <= 24) {
                        cardsPerRow = 8;
                    } else if (totalCards <= 27) {
                        cardsPerRow = 9;
                    } else if (totalCards <= 30) {
                        cardsPerRow = 10;
                    } else {
                        const cardsPerRow3 = Math.ceil(totalCards / 3);
                        const cardsPerRow4 = Math.ceil(totalCards / 4);
                        const cardWidth3 = (swAvailableWidth - (cardsPerRow3 - 1) * 5) / cardsPerRow3;
                        const cardWidth4 = (swAvailableWidth - (cardsPerRow4 - 1) * 5) / cardsPerRow4;
                        cardsPerRow = (cardWidth4 > cardWidth3) ? cardsPerRow4 : cardsPerRow3;
                    }

                    const containerHeight = mainDeckContainer.clientHeight || 756;
                    const availableHeight = containerHeight;
                    const numRows = Math.ceil(totalCards / cardsPerRow);
                    const maxCardHeight = (availableHeight - (numRows - 1) * 5) / numRows;
                    const maxContainerWidth = 1456;
                    const cardWidthFromHeight = maxCardHeight / 1.4;
                    const cardWidthFromWidth = (swAvailableWidth - (cardsPerRow - 1) * 5) / cardsPerRow;
                    const cardWidthFromMax = (maxContainerWidth - (cardsPerRow - 1) * 5) / cardsPerRow;
                    const scalingCardWidth = Math.min(cardWidthFromHeight, cardWidthFromWidth, cardWidthFromMax);
                    const requiredWidth = cardsPerRow * scalingCardWidth + (cardsPerRow - 1) * 5;
                    mainDeckContainer.style.width = `${requiredWidth}px`;

                    // Calculate equal margins: (1920 - headerWidth - gap - mainDeckWidth) / 2
                    const totalUsed = headerWidth + gap + requiredWidth;
                    const margin = Math.max(minMargin, (1920 - totalUsed) / 2);

                    // Position header zone and main deck
                    const headerZone = starwarsSection.querySelector('.starwars-deck-header-zone');
                    if (headerZone) {
                        headerZone.style.left = `${margin}px`;
                    }
                    mainDeckContainer.style.left = `${margin + headerWidth + gap}px`;

                    actualCards.forEach(card => {
                        const cardElement = document.createElement('div');
                        cardElement.className = 'main-deck-card';
                        cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
                        cardElement.style.width = `${scalingCardWidth}px`;
                        mainDeckContainer.appendChild(cardElement);
                    });
                }
            }

            if (deckDisplayDetails) {
                // Build deck name from leader + base (e.g., "Han Solo, Worth the Risk - Shadowed Undercity")
                const rawArchetype = deckData.archetype || '';
                let deckName = (rawArchetype === 'Unknown Archetype') ? '' : rawArchetype;
                if (!deckName && (leaderName || baseName)) {
                    const parts = [leaderName, baseName].filter(Boolean);
                    deckName = parts.join(' - ');
                }

                // Collect all unique aspects from leader + base
                const aspect1 = roundData[match_id]?.[`player-leader-aspect-1-${side_id}`] || '';
                const aspect2 = roundData[match_id]?.[`player-leader-aspect-2-${side_id}`] || '';
                const baseAspects = roundData[match_id]?.[`player-base-aspects-${side_id}`] || '';
                const allAspects = [aspect1, aspect2, ...baseAspects.split(',')]
                    .map(a => a.trim().toLowerCase())
                    .filter(Boolean);
                const uniqueAspects = [...new Set(allAspects)];

                deckDisplayDetails.innerHTML = `
                    <h1 class="player-name">${deckData.playerName}</h1>
                    <h5 class="archetype-name">
                        ${deckName} <span id="starwars-player-aspects" class="swu-aspects-container"></span>
                    </h5>
                `;

                // Render aspect icons
                const aspectsContainer = document.getElementById('starwars-player-aspects');
                if (aspectsContainer) {
                    uniqueAspects.forEach(aspect => {
                        const iconUrl = SWU_ASPECTS[aspect];
                        if (iconUrl) {
                            const img = document.createElement('img');
                            img.src = iconUrl;
                            img.alt = aspect;
                            img.className = 'swu-decklist-aspect-icon';
                            aspectsContainer.appendChild(img);
                        }
                    });
                }

                document.fonts.ready.then(() => {
                    const playerNameEl = deckDisplayDetails.querySelector('.player-name');
                    if (playerNameEl) {
                        autoScaleText(playerNameEl, 115, 73, 1100);
                        const scaledFontSize = parseFloat(playerNameEl.style.fontSize);
                        const baseTop = 42;
                        const maxFontSize = 115;
                        const fontShrinkage = maxFontSize - scaledFontSize;
                        playerNameEl.style.top = (baseTop + fontShrinkage) + 'px';
                    }
                });
            }
        } else {
            const mainDeckContainer = starwarsSection.querySelector('#starwars-main-deck-container');
            if (mainDeckContainer) mainDeckContainer.innerHTML = '';
            const oldHeaderZone = starwarsSection.querySelector('.starwars-deck-header-zone');
            if (oldHeaderZone) oldHeaderZone.remove();
        }
    }
}

// Function to render Star Wars vertical deck
function renderStarWarsVerticalDeck() {
    const starwarsSection = document.getElementById('deck-display-starwars');
    if (!starwarsSection) return;
    const mainDeckContainer = starwarsSection.querySelector('#starwars-main-deck-container');
    if (!mainDeckContainer) return;
    mainDeckContainer.innerHTML = '';

    const { main: actualCards, sideboard } = filterManualEntry(deckData.mainDeck);
    if (sideboard.length > 0) deckData.sideDeck = sideboard;

    actualCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'vertical-card';
        const artUrl = card['card-url'] || '';
        cardElement.style.backgroundImage = artUrl ? `url('${artUrl}')` : 'none';
        cardElement.innerHTML = `
            <span class="vertical-card-count">${card['card-count']}</span>
            <span class="vertical-card-name">${card['card-name']}</span>
        `;
        mainDeckContainer.appendChild(cardElement);
    });
}

// Function to render battlefields using scoreboard-style implementation
function renderBattlefields(battlefields, container) {
    if (!container) return;

    const sectionWrapper = document.createElement('div');
    sectionWrapper.className = 'deck-section-wrapper battlefields-section';
    sectionWrapper.style.cssText = 'position:absolute;top:861px;left:427px;width:500px;height:180px;display:flex;gap:8px;z-index:20;';

    for (let i = 0; i < 3; i++) {
        let imageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT;
        if (i < battlefields.length && battlefields[i]) {
            const battlefieldName = (battlefields[i].name || battlefields[i]['card-name'] || '').trim();
            let url = RIFTBOUND_BATTLEFIELDS[battlefieldName];
            if (!url) {
                const lower = battlefieldName.toLowerCase();
                for (const key in RIFTBOUND_BATTLEFIELDS) {
                    if (key.toLowerCase() === lower) { url = RIFTBOUND_BATTLEFIELDS[key]; break; }
                }
            }
            if (url) imageUrl = url;
        }

        const img = document.createElement('img');
        img.src = encodeURI(imageUrl);
        img.className = 'riftbound-battlefield-img';
        img.style.cssText = 'width:180px;height:auto;object-fit:contain;border-radius:4px;';
        sectionWrapper.appendChild(img);
    }

    container.appendChild(sectionWrapper);
}

// RIFTBOUND RENDERING
function renderRiftboundDeckSections(deckObj) {
    const riftboundSection = document.getElementById('deck-display-riftbound');
    if (!riftboundSection) return;

    const container = riftboundSection.querySelector('#riftbound-main-deck-container');
    if (!container) return;

    container.innerHTML = ''; // Clear previous

    const matchData = roundData[match_id] || {};
    const legend = (matchData[`player-legend-${side_id}`] || '').trim();

    // Update static player name
    createPlayerNameSection(deckData.playerName);

    // Update legend card — prefer mp4 video, fall back to card image
    const legendCardVideo = document.getElementById('riftbound-dl-legend-card-video');
    const legendCardImg = document.getElementById('riftbound-dl-legend-card-img');
    const legendFrameUrl = getLegendCardFrameUrl(legend);

    if (legendFrameUrl && legendCardVideo) {
        legendCardVideo.src = legendFrameUrl;
        legendCardVideo.style.display = 'block';
        if (legendCardImg) legendCardImg.style.display = 'none';
    } else {
        if (legendCardVideo) { legendCardVideo.src = ''; legendCardVideo.style.display = 'none'; }
        if (legendCardImg) {
            legendCardImg.src = deckObj.legendImageUrl || '';
            legendCardImg.style.display = 'block';
        }
    }

    // Update static legend description image
    createLegendDescriptionSection(legend);

    // Update static champion card image (resolved server-side from master control field)
    const championCardImg = document.getElementById('riftbound-dl-champion-card-img');
    if (championCardImg) {
        championCardImg.src = deckObj.championImageUrl || '';
    }

    // Clear previous battlefields/runes from riftboundSection (they live outside the deck container)
    riftboundSection.querySelectorAll('.battlefields-section, .runes-section').forEach(el => el.remove());

    // Battlefields (appended to riftboundSection root so positioning is relative to 1920x1080 viewport)
    renderBattlefields((deckObj.battlefields || []).slice(0, 3), riftboundSection);

    // Runes (from master control fields — letter + count resolved server-side)
    const runesData = deckObj.runes || [];
    if (runesData.length > 0) {
        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = 'deck-section-wrapper runes-section';

        for (const rune of runesData) {
            if (!rune.letter) continue;
            const runeUrl = RIFTBOUND_RUNES[rune.letter];
            if (runeUrl) {
                const runeItem = document.createElement('div');
                runeItem.className = 'rfb-rune-item';
                runeItem.innerHTML = `<img src="${runeUrl}" class="rfb-rune-icon" alt="Rune ${rune.letter}"><span class="rfb-rune-count">x${rune.count}</span>`;
                sectionWrapper.appendChild(runeItem);
            }
        }

        if (sectionWrapper.children.length > 0) riftboundSection.appendChild(sectionWrapper);
    }

    // Main deck (other[] — champion already excluded server-side)
    const otherCards = deckObj.other || [];
    if (otherCards.length > 0) {
        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = 'deck-section-wrapper other-section';

        otherCards.slice(0, 30).forEach(card => {
            if (card['card-url']) {
                const cardEl = document.createElement('div');
                cardEl.className = 'main-deck-card';
                cardEl.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
                sectionWrapper.appendChild(cardEl);
            }
        });

        container.appendChild(sectionWrapper);
    }

    // Sideboard (right column)
    if (deckData.sideDeck && Array.isArray(deckData.sideDeck) && deckData.sideDeck.length > 0) {
        const sideDeckWrapper = document.createElement('div');
        sideDeckWrapper.className = 'deck-section-wrapper side-deck-section';

        deckData.sideDeck.slice(0, 10).forEach(card => {
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
    
    // Add runes count from resolved rune data
    const runesData = deckObj.runes || [];
    if (runesData.length > 0) {
        totalCards += runesData.length;
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
                const bfName = (card.name || card['card-name'] || '').trim();
                let bfUrl = RIFTBOUND_BATTLEFIELDS[bfName];
                if (!bfUrl) {
                    const lower = bfName.toLowerCase();
                    for (const key in RIFTBOUND_BATTLEFIELDS) {
                        if (key.toLowerCase() === lower) { bfUrl = RIFTBOUND_BATTLEFIELDS[key]; break; }
                    }
                }
                const bfImageUrl = bfUrl || RIFTBOUND_BATTLEFIELDS_DEFAULT;
                cardElement.innerHTML = `
                    <div class="riftbound-battlefield-card">
                        <div class="riftbound-battlefield-icon"></div>
                        <div class="riftbound-battlefield-name">${bfName}</div>
                        <div class="riftbound-battlefield-background" style="--bg-image: url('${bfImageUrl}');"></div>
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
    
    // Handle runes section — use resolved rune data from master control fields
    if (runesData.length > 0) {
        for (const rune of runesData) {
            if (!rune.letter) continue;
            const runeUrl = RIFTBOUND_RUNES[rune.letter];
            if (runeUrl) {
                const cardElement = document.createElement('div');
                cardElement.className = 'riftbound-vertical-card';
                cardElement.style.height = `${cardHeight}px`;
                cardElement.innerHTML = `
                    <div class="riftbound-card-number" style="font-size: ${20 * fontScaleFactor}px;">${rune.count}</div>
                    <img src="${runeUrl}" class="riftbound-rune-icon-vertical" alt="Rune ${rune.letter}" style="width: 40px; height: 40px; object-fit: contain;">
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

        // Show/hide appropriate sections
        const mtgSection = document.getElementById('deck-display-mtg');
        const riftboundSection = document.getElementById('deck-display-riftbound');
        const vibesSection = document.getElementById('deck-display-vibes');
        const starwarsSection = document.getElementById('deck-display-starwars');

        if (selectedGame === 'mtg') {
            console.log('Switching to MTG mode...');
            if (mtgSection) mtgSection.style.display = 'block';
            if (riftboundSection) riftboundSection.style.display = 'none';
            if (vibesSection) vibesSection.style.display = 'none';
            if (starwarsSection) starwarsSection.style.display = 'none';
        } else if (selectedGame === 'riftbound') {
            console.log('Switching to Riftbound mode...');
            if (mtgSection) mtgSection.style.display = 'none';
            if (riftboundSection) riftboundSection.style.display = 'block';
            if (vibesSection) vibesSection.style.display = 'none';
            if (starwarsSection) starwarsSection.style.display = 'none';
            setRiftboundBackground();

            // Update legend description when switching to riftbound
            if (roundData[match_id] && roundData[match_id][`player-legend-${side_id}`]) {
                createLegendDescriptionSection(roundData[match_id][`player-legend-${side_id}`] || '');
            }
        } else if (selectedGame === 'vibes') {
            console.log('Switching to Vibes mode...');
            if (mtgSection) mtgSection.style.display = 'none';
            if (riftboundSection) riftboundSection.style.display = 'none';
            if (vibesSection) vibesSection.style.display = 'block';
            if (starwarsSection) starwarsSection.style.display = 'none';
        } else if (selectedGame === 'starwars') {
            console.log('Switching to Star Wars mode...');
            if (mtgSection) mtgSection.style.display = 'none';
            if (riftboundSection) riftboundSection.style.display = 'none';
            if (vibesSection) vibesSection.style.display = 'none';
            if (starwarsSection) starwarsSection.style.display = 'block';
        } else {
            // Default: hide all if unknown game type
            if (mtgSection) mtgSection.style.display = 'none';
            if (riftboundSection) riftboundSection.style.display = 'none';
            if (vibesSection) vibesSection.style.display = 'none';
            if (starwarsSection) starwarsSection.style.display = 'none';
        }

        // Request side deck transformation now that game selection is known
        requestSideDeckTransformation();
    } // end game-switch block

    // --- Vendor overrides and dynamic backgrounds (always run) ---
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });

        // Update decklist background image dynamically
        const bgSelectors = {
            mtg: '#mtg-bg-image',
            riftbound: '#riftbound-bg-image',
            vibes: '#vibes-bg-image',
            starwars: '#starwars-bg-image',
        };
        const bgSelector = bgSelectors[normalized];
        if (bgSelector) {
            const bgEl = document.querySelector(bgSelector);
            if (bgEl) {
                const bgPath = vc.getAssetPath(
                    `/assets/images/${normalized}/decklist/${normalized}-decklist-bg.png`,
                    vendor, playerCount
                );
                bgEl.style.backgroundImage = `url("${bgPath}")`;
            }
        }
    }
}

// Function to set the riftbound background — frame/video are static in HTML, nothing to do here
function setRiftboundBackground() {
    // Frame PNG and video background are defined in HTML/CSS; no dynamic setup needed
}

socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('get-broadcast-scoreboard-data');

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