const socket = io();
let cardName = null;

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const game_id = pathSegments[4];
const card_id = pathSegments[5];

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
    // Clear previous deck displays
    mainCardViewContainer.innerHTML = '';
    // Create card element and add it to the container
    const cardElement = document.createElement('div');
    cardElement.className = 'main-card-display';
    cardElement.innerHTML = `<img src="${data['url']}" class="card-src">`;
    mainCardViewContainer.appendChild(cardElement);
}