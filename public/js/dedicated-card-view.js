const socket = io();
let cardName = null;

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const game_id = pathSegments[4];
const card_id = pathSegments[5];
const fallbackUrl = `/assets/images/cards/${game_id}/${game_id === 'mtg' ? 'magic' : 'vibes'}-card-back.jpg`;

// Listen for card view to display
socket.on('card-view-card-selected', (data) => {
    // data : mainDeck, sideDeck, playerName, archetype
    console.log('card to view from server', data);

    // check that data was meant for this card id and game id
    if (card_id === data['card-id'].toString() && game_id === data['game-id'].toString()) {
        cardName = data['card-selected'];
        console.log('card to display data', cardName);
        // Call a function to render the card
        renderCard(data);
    }
});

// Function to render the card on the page
function renderCard(data) {
    const mainCardViewContainer = document.getElementById('card-view-container');
    mainCardViewContainer.innerHTML = '';

    const cardElement = document.createElement('div');
    cardElement.className = 'main-card-display';

    const img = document.createElement('img');
    img.className = 'card-src';
    if (data.url) {
        img.src = data.url;
    } else {
        img.src = fallbackUrl;
    }

    // Handle broken image - case for mtg - url will be broken
    img.onerror = () => {
        console.warn('Image failed to load:', data.url);
        img.src = fallbackUrl;
    };

    cardElement.appendChild(img);
    mainCardViewContainer.appendChild(cardElement);
}

// on start - render fallback image
renderCard({url: ''});
