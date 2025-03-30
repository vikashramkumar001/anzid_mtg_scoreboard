const socket = io();
let roundData = {};
let deckData = {};

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const match_id = pathSegments[4];
const side_id = pathSegments[5];

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

// Function to transform deck data into an object with counts
function transformDeck(deckArray) {
    const deckObject = [];
    deckArray.forEach(card => {
        // Split the card string into count and name
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card]; // Default count to 1 if no number is found
        const count = parseInt(parts[1], 10); // Get the count
        const name = parts[2]; // Get the card name
        const cardNameForURL = name.replace(/ /g, '+'); // Replace spaces with '+'
        deckObject.push({
            'card-name': name,
            'card-count': count,
            'card-url': `https://api.scryfall.com/cards/named?exact=${cardNameForURL}&format=image&version=border_crop` // Set card URL
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