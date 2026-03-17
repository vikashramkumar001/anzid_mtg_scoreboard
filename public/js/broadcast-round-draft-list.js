const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let roundData = {};
let deckData = {};
let selectedGame = '';
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

// Get slot ID from the URL
// URL pattern: /broadcast/round/draftlist/:orientation/:slotId or /broadcast/round/draftlist/:slotId
const pathSegments = window.location.pathname.split('/');
let orientation, slotId;

// Handle both URL patterns: /orientation/slotId and /slotId
if (pathSegments[4] === 'horizontal' || pathSegments[4] === 'vertical') {
    orientation = pathSegments[4];
    slotId = pathSegments[5];
} else {
    orientation = 'vertical'; // Default to vertical for draft lists
    slotId = pathSegments[4];
}

// Add orientation class to body for CSS targeting
document.body.classList.add(orientation);

// Add side class to body for left/right alignment (slot 1 = left, slot 2 = right)
const sideClass = slotId === '1' ? 'left' : 'right';
document.body.classList.add(sideClass);

// Mana symbol constants for archetype display
const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

// Transform Scryfall URL from full card (png) to art_crop
function getArtCropUrl(cardUrl) {
    if (!cardUrl) return '';
    return cardUrl.replace('/png/', '/art_crop/').replace('.png', '.jpg');
}

// Parse mana cost string into array of symbols
function parseManaCost(manaCost) {
    if (!manaCost) return [];
    const matches = manaCost.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return matches.map(s => s.slice(1, -1));
}

// Generate HTML for card row mana symbols
function renderCardManaSymbols(manaCost, symbolSize = 16) {
    const symbols = parseManaCost(manaCost);
    if (symbols.length === 0) return '';

    const symbolsHtml = symbols.map(symbol => {
        const cleanSymbol = symbol.replace(/\//g, '');
        const src = `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(cleanSymbol)}.svg`;
        return `<img src="${src}" alt="${symbol}" class="mana-symbol" style="width: ${symbolSize}px; height: ${symbolSize}px;">`;
    }).join('');

    return `<div class="vertical-card-mana">${symbolsHtml}</div>`;
}

// Generate HTML for split card mana symbols (both halves separated by /)
function renderSplitCardManaSymbols(manaCost, symbolSize = 16) {
    if (!manaCost) return '';

    // Check if mana cost contains // (split card format)
    if (!manaCost.includes('//')) {
        return renderCardManaSymbols(manaCost, symbolSize);
    }

    const parts = manaCost.split('//').map(p => p.trim());
    const frontSymbols = parseManaCost(parts[0]);
    const backSymbols = parseManaCost(parts[1] || '');

    if (frontSymbols.length === 0 && backSymbols.length === 0) return '';

    const renderSymbols = (symbols) => symbols.map(symbol => {
        const cleanSymbol = symbol.replace(/\//g, '');
        const src = `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(cleanSymbol)}.svg`;
        return `<img src="${src}" alt="${symbol}" class="mana-symbol" style="width: ${symbolSize}px; height: ${symbolSize}px;">`;
    }).join('');

    const frontHtml = renderSymbols(frontSymbols);
    const backHtml = renderSymbols(backSymbols);
    const separator = `<span class="mana-separator" style="margin: 0 2px; font-size: ${symbolSize}px;">/</span>`;

    return `<div class="vertical-card-mana">${frontHtml}${separator}${backHtml}</div>`;
}

// Listen for dedicated draft list data (separate from match data)
socket.on('draft-list-data', (data) => {
    console.log('draft-list-data received', data);

    // Only process if this data is for our slot
    if (data.slotId === slotId) {
        if (data.cards && data.cards.length > 0) {
            deckData = {
                mainDeck: data.cards,
                playerName: data.playerName || 'Unknown Player',
                playerPronouns: data.playerPronouns || '',
                archetype: data.playerArchetype || '',
                manaSymbols: data.playerManaSymbols || ''
            };
            console.log('draft list data for display', deckData);
            renderDraftList();
        } else {
            console.log('No draft list cards for slot', slotId);
            // Clear the display if no data
            const mtgSection = document.getElementById('deck-display-mtg');
            if (mtgSection) {
                const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
                if (mainDeckContainer) mainDeckContainer.innerHTML = '';
            }
        }
    }
});

// Render the draft list
function renderDraftList() {
    if (selectedGame === 'mtg') {
        const mtgSection = document.getElementById('deck-display-mtg');
        if (!mtgSection) return;

        if (Array.isArray(deckData.mainDeck) && deckData.mainDeck.length !== 0) {
            const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
            if (mainDeckContainer) mainDeckContainer.innerHTML = '';
            if (orientation === 'horizontal') {
                renderMTGHorizontalDraftList();
            } else {
                renderMTGDraftList();
            }
        } else {
            console.log('mtg selected but no valid deck data');
            const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
            if (mainDeckContainer) mainDeckContainer.innerHTML = '';
        }
    }
    // Riftbound support can be added here in the future
}

// Render MTG draft list (vertical only)
function renderMTGDraftList() {
    const mtgSection = document.getElementById('deck-display-mtg');
    if (!mtgSection) return;

    const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
    if (!mainDeckContainer) return;

    mainDeckContainer.className = 'vertical-deck-container';
    mainDeckContainer.innerHTML = '';

    // Create single cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'mtg-single-column-cards-container';

    // Fixed card height (equivalent to 45 cards fitting in 1080px = 24px per card)
    const cardHeight = 24;
    const fontScaleFactor = 0.8;
    const manaSymbolSize = 14;

    // Track pick number (resets after each pack header)
    let pickNumber = 0;

    deckData.mainDeck.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'vertical-card';
        cardElement.style.height = `${cardHeight}px`;

        // Check if this is a section header (Pack 1, Pack 2, Pack 3)
        const cardName = card['card-name']?.toLowerCase().trim();
        const isSectionHeader = cardName === 'pack 1' || cardName === 'pack 2' || cardName === 'pack 3';

        if (isSectionHeader) {
            // Reset pick number for new pack
            pickNumber = 0;
            // Render section header - centered text, black background
            cardElement.innerHTML = `
                <div class="vertical-card-section-header" style="font-size: ${20 * fontScaleFactor}px;">${card['card-name']}</div>
                <div class="vertical-card-background" style="background: black;"></div>
            `;
        } else {
            // Increment pick number for actual cards
            pickNumber++;

            // For double-faced cards, only show the front half
            // Exception: if both halves are single words (e.g., "Fire // Ice"), show the full name
            let displayName = card['card-name'];
            let showBothHalves = false;
            if (card['card-name']?.includes('//')) {
                const parts = card['card-name'].split('//').map(p => p.trim());
                const frontWords = parts[0].split(/\s+/).length;
                const backWords = parts[1]?.split(/\s+/).length || 0;
                if (frontWords > 1 || backWords > 1) {
                    displayName = parts[0];
                } else {
                    // Both halves are single words, show full name and both mana costs
                    showBothHalves = true;
                }
            }

            // Use split mana renderer when showing both halves, otherwise use regular renderer
            const manaHtml = showBothHalves
                ? renderSplitCardManaSymbols(card['mana-cost'], manaSymbolSize)
                : renderCardManaSymbols(card['mana-cost'], manaSymbolSize);
            const isHighlighted = card.highlighted || false;
            cardElement.innerHTML = `
                <div class="vertical-card-number${isHighlighted ? ' highlighted' : ''}" style="font-size: ${20 * fontScaleFactor}px;">${isHighlighted ? '★' : pickNumber}</div>
                <div class="vertical-card-name${isHighlighted ? ' highlighted' : ''}" style="font-size: ${20 * fontScaleFactor}px;">${displayName}</div>
                ${manaHtml}
                <div class="vertical-card-background" style="background: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.4) 100%), url('${getArtCropUrl(card['card-url'])}'); background-size: 100% 100%, 65% auto; background-position: center, calc(100% + 55px) calc(50% + 20px); background-repeat: no-repeat;"></div>
            `;
        }
        cardsContainer.appendChild(cardElement);
    });

    mainDeckContainer.appendChild(cardsContainer);
}

// Render mana symbols into a container element (for archetype display)
function renderManaSymbols(inputStr, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const presentSymbols = new Set(
        inputStr.toUpperCase().split('').filter(char => MANA_SYMBOLS[char])
    );

    if (presentSymbols.size === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = '';

    MANA_ORDER.filter(symbol => presentSymbols.has(symbol)).forEach(symbol => {
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

    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerHTML = element.innerHTML;
    document.body.appendChild(temp);

    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';
    document.body.removeChild(temp);
}

// Render MTG draft list (horizontal - full card images in 3-pack grid)
function renderMTGHorizontalDraftList() {
    const mtgSection = document.getElementById('deck-display-mtg');
    if (!mtgSection) return;

    const mainDeckContainer = mtgSection.querySelector('#main-deck-container');
    if (!mainDeckContainer) return;

    mainDeckContainer.className = '';
    mainDeckContainer.innerHTML = '';

    // Render player name and archetype header
    const deckDisplayDetails = mtgSection.querySelector('#deck-display-details');
    if (deckDisplayDetails) {
        deckDisplayDetails.style.display = 'flex';
        deckDisplayDetails.innerHTML = `
            <h1 class="player-name">${deckData.playerName || ''}</h1>
            <h5 class="archetype-name">
                ${deckData.archetype || ''} <span id="player-mana-symbols" class="mana-symbols-container"></span>
            </h5>
        `;

        renderManaSymbols(deckData.manaSymbols || '', 'player-mana-symbols');

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

    // Parse flat card array into packs by splitting on pack headers
    const packs = [];
    let currentPack = null;

    deckData.mainDeck.forEach(card => {
        const cardName = card['card-name']?.toLowerCase().trim();
        if (cardName === 'pack 1' || cardName === 'pack 2' || cardName === 'pack 3') {
            currentPack = { title: card['card-name'], cards: [] };
            packs.push(currentPack);
        } else if (currentPack) {
            currentPack.cards.push(card);
        }
    });

    // If no pack headers found, treat everything as Pack 1
    if (packs.length === 0) {
        packs.push({ title: 'Pack 1', cards: [...deckData.mainDeck] });
    }

    // Create the horizontal container
    const container = document.createElement('div');
    container.className = 'horizontal-draft-container';

    // Calculate card size from available height (height is the constraint)
    // Layout: 3 rows of 4 cards + 1 row of 2 cards = 14 cards per pack (4 total rows)
    // Available: 780px container - 36px pack title - 10px padding = 734px
    // 4 rows with 3×6px gaps = 716px for cards → 179px per row
    // MTG card aspect ratio ~0.7179 → card width = height × 0.7179
    const availableCardHeight = 780 - 36 - 10 - (3 * 6);
    const cardHeight = availableCardHeight / 4;
    const cardAspectRatio = 0.7179;
    const cardWidth = Math.floor(cardHeight * cardAspectRatio);
    const cardBackUrl = '/assets/images/mtg/cards/magic-card-back.jpg';

    // Always render 3 columns (even if empty)
    for (let packIndex = 0; packIndex < 3; packIndex++) {
        const pack = packs[packIndex] || { title: `Pack ${packIndex + 1}`, cards: [] };

        const column = document.createElement('div');
        column.className = 'draft-pack-column';

        // Pack title
        const title = document.createElement('div');
        title.className = 'draft-pack-title';
        title.textContent = pack.title;
        column.appendChild(title);

        // Pad to 14 cards so empty slots show card backs
        const cards = [...pack.cards];
        while (cards.length < 14) {
            cards.push({ 'card-name': '', 'card-url': '' });
        }

        // Split into grid cards (first 12) and last row (remaining up to 2)
        const gridCards = cards.slice(0, 12);
        const lastRowCards = cards.slice(12, 14);

        // Main grid (4 columns × 3 rows)
        if (gridCards.length > 0) {
            const grid = document.createElement('div');
            grid.className = 'draft-pack-grid';

            gridCards.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'draft-card' + (card.highlighted ? ' highlighted' : '');
                cardEl.style.width = `${cardWidth}px`;
                const img = document.createElement('img');
                img.src = card['card-url'] || cardBackUrl;
                img.alt = card['card-name'] || '';
                cardEl.appendChild(img);
                grid.appendChild(cardEl);
            });

            column.appendChild(grid);
        }

        // Last row (centered, up to 2 cards)
        if (lastRowCards.length > 0) {
            const lastRow = document.createElement('div');
            lastRow.className = 'draft-pack-last-row';

            lastRowCards.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'draft-card' + (card.highlighted ? ' highlighted' : '');
                cardEl.style.width = `${cardWidth}px`;
                const img = document.createElement('img');
                img.src = card['card-url'] || cardBackUrl;
                img.alt = card['card-name'] || '';
                cardEl.appendChild(img);
                lastRow.appendChild(cardEl);
            });

            column.appendChild(lastRow);
        }

        container.appendChild(column);
    }

    mainDeckContainer.appendChild(container);
}

// Handle game selection updates
function updateTheme(game, vendor, playerCount) {
    const gameSelection = game;
    console.log('Game selection updated:', gameSelection);

    // Hide all sections first
    const mtgSection = document.getElementById('deck-display-mtg');
    const riftboundSection = document.getElementById('deck-display-riftbound');

    if (mtgSection) mtgSection.style.display = 'none';
    if (riftboundSection) riftboundSection.style.display = 'none';

    // Show the selected game's section
    if (gameSelection === 'mtg') {
        if (mtgSection) mtgSection.style.display = 'block';
        document.body.classList.remove('riftbound');
        document.body.classList.add('mtg');
    } else if (gameSelection === 'riftbound') {
        if (riftboundSection) riftboundSection.style.display = 'block';
        document.body.classList.remove('mtg');
        document.body.classList.add('riftbound');
    }

    selectedGame = gameSelection;

    // If we have draft list data, re-render
    if (deckData.mainDeck && deckData.mainDeck.length > 0) {
        renderDraftList();
    }

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

        // Update decklist background image dynamically
        const normalized = gameSelection?.toLowerCase();
        const bgSelectors = {
            mtg: '#mtg-bg-image',
            riftbound: '#riftbound-bg-image',
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

// Request game selection on load
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

// Request current draft list data on page load (wait for connection)
socket.on('connect', () => {
    console.log('[DraftList Display] Connected, requesting data for slot', slotId);
    socket.emit('get-draft-list-data', { slotId });
});

// Also request if already connected
if (socket.connected) {
    console.log('[DraftList Display] Already connected, requesting data for slot', slotId);
    socket.emit('get-draft-list-data', { slotId });
}
