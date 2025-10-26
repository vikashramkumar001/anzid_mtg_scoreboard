const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let cardName = null;
const fallbackUrl = `/assets/images/cards/riftbound/riftbound-card-back.jpg`;

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const card_id = pathSegments[5];

// Listen for card view to display
socket.on('riftbound-card-view-card-selected', (data) => {
    // data : mainDeck, sideDeck, playerName, archetype
    console.log('card to view from server', data);

    // check that data was meant for this card id
    if (card_id === data['card-id'].toString()) {
        cardName = data['name'];
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