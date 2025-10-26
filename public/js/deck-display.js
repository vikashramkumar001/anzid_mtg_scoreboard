const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let deckData = {};

// Listen for deck data to display
socket.on('deck-display-update', (data) => {
    // data : mainDeck, sideDeck, playerName, archetype
    console.log('deck data from server', data);

    // Save to local object
    deckData = {
        playerName: data.playerName,
        archetype: data.archetype,
        mainDeck: transformDeck(data.mainDeck),
        sideDeck: transformDeck(data.sideDeck)
    };
    console.log('deck data', deckData);

    // Call a function to render the decks
    renderDecks();
});

// Function to transform deck data into an object with counts
function transformDeck(deckArray) {
    const deckObject = [];
    deckArray.forEach(card => {
        // Split the card string into count and name
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card]; // Default count to 1 if no number is found
        const count = parseInt(parts[1], 10); // Get the count
        const name = parts[2]; // Get the card name
        const cardNameForURL = name.replace(/ /g, '+').replace(/&/g, '');
        deckObject.push({
            'card-name': name,
            'card-count': count,
            'card-url': `https://api.scryfall.com/cards/named?exact=${cardNameForURL}&format=image` // Set card URL
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
    detailsElement.innerHTML = `<h1 class="player-name">${deckData.playerName}</h1><h5 class="archetype-name">${deckData.archetype}</h5>`;
}