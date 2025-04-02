const socket = io();
let cardName = null;

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');

// Listen for card view to display
socket.on('vibes-card-view-card-selected', (data) => {
    // data : mainDeck, sideDeck, playerName, archetype
    console.log('card to view from server', data);
    if (data) {
        renderCard(data);
    }
});

// Function to render the card on the page
function renderCard(data) {
    const mainCardViewContainer = document.getElementById('card-view-container');

    // Clear previous deck displays
    mainCardViewContainer.innerHTML = '';

    // Set the card URL
    const cardURL = data?.url;

    // Create card element and add it to the container
    const cardElement = document.createElement('div');
    cardElement.className = 'main-card-display';
    cardElement.innerHTML = `<img src="${cardURL}" class="card-src">`;
    mainCardViewContainer.appendChild(cardElement);
}