const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let roundData = {};
let deckData = {};
let selectedGame = '';

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

// Listen for dedicated draft list data (separate from match data)
socket.on('draft-list-data', (data) => {
    console.log('draft-list-data received', data);

    // Only process if this data is for our slot
    if (data.slotId === slotId) {
        if (data.cards && data.cards.length > 0) {
            deckData = {
                mainDeck: data.cards,
                playerName: data.playerName || 'Unknown Player',
                playerPronouns: data.playerPronouns || ''
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
            renderMTGDraftList();
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
            if (card['card-name']?.includes('//')) {
                const parts = card['card-name'].split('//').map(p => p.trim());
                const frontWords = parts[0].split(/\s+/).length;
                const backWords = parts[1]?.split(/\s+/).length || 0;
                if (frontWords > 1 || backWords > 1) {
                    displayName = parts[0];
                }
            }

            const manaHtml = renderCardManaSymbols(card['mana-cost'], manaSymbolSize);
            cardElement.innerHTML = `
                <div class="vertical-card-number" style="font-size: ${20 * fontScaleFactor}px;">${pickNumber}</div>
                <div class="vertical-card-name" style="font-size: ${20 * fontScaleFactor}px;">${displayName}</div>
                ${manaHtml}
                <div class="vertical-card-background" style="background: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.4) 100%), url('${getArtCropUrl(card['card-url'])}'); background-size: 100% 100%, 65% auto; background-position: center, calc(100% + 55px) calc(50% + 20px); background-repeat: no-repeat;"></div>
            `;
        }
        cardsContainer.appendChild(cardElement);
    });

    mainDeckContainer.appendChild(cardsContainer);
}

// Handle game selection updates
function handleGameSelectionUpdate(gameSelection) {
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
}

// Request game selection on load
socket.emit('get-game-selection');

socket.on('game-selection-updated', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
});

socket.on('server-current-game-selection', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
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
