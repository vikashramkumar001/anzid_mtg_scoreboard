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
    document.getElementById('side-deck-container').innerHTML = '';

    // Render side deck
    const sideDeckContainer = document.getElementById('side-deck-container');
    const cardHeight = 250; // base height of each card
    const cardWidth = 180; // base width of each card
    const totalWidth = 1920; // Total width of the side deck container
    const spacing = Math.floor((totalWidth - (cardWidth + 10)) / (deckData.sideDeck.length - 1));

    // if (deckData.sideDeck.length <= 4) {
    //     // No overlap, display cards normally
    //     deckData.sideDeck.forEach((card, index) => {
    //         const cardElement = document.createElement('div');
    //         cardElement.className = 'side-deck-card';
    //         // cardElement.innerHTML = `<div class="card-name">${card['card-name']}</div>`;
    //         cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
    //         cardElement.style.top = `${index * cardHeight}px`; // Adjust the vertical position
    //         sideDeckContainer.appendChild(cardElement);
    //     });
    // } else {
    //     // Calculate the spacing for overlapping cards
    //     // + 10 to cater for the margin top/bottom 5px
    //     const spacing = Math.floor((totalHeight - (cardHeight + 10)) / (deckData.sideDeck.length - 1));
    //     deckData.sideDeck.forEach((card, index) => {
    //         const cardElement = document.createElement('div');
    //         cardElement.className = 'side-deck-card';
    //         // cardElement.innerHTML = `<div class="card-name">${card['card-name']}</div>`;
    //         cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
    //         // Position the card based on its index
    //         cardElement.style.top = `${index * spacing}px`; // Adjust the vertical position
    //         // cardElement.style.margin = '0px 15px';
    //         sideDeckContainer.appendChild(cardElement);
    //     });
    // }

    // spread side deck horizontally in 1 row centered. max 15. scale card size accordingly for no overlap
    deckData.sideDeck.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'side-deck-card';
        cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
        // Position the card based on its index
        // cardElement.style.top = `${index * spacing}px`; // Adjust the vertical position
        // cardElement.style.margin = '0px 15px';
        sideDeckContainer.appendChild(cardElement);
    });
}