const socket = io();
let cardName = null;

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const card_id = pathSegments[4];

// Listen for card view to display
socket.on('card-view-card-selected', (data) => {
    // data : mainDeck, sideDeck, playerName, archetype
    console.log('card to view from server', data);

    // check that data was meant for this card id
    if (card_id === data['card-id'].toString()) {
        cardName = data['card-selected'];
        console.log('card to display data', cardName);
        // Call a function to render the card
        renderCard();
    }
});

// Function to render the card on the page
function renderCard() {
    const mainCardViewContainer = document.getElementById('card-view-container');

    // Clear previous deck displays
    mainCardViewContainer.innerHTML = '';

    // Replace spaces with '+' and '&' with 'and'
    const cardNameForURL = cardName.replace(/ /g, '+').replace(/&/g, '');

    // Set the card URL
    const cardURL = `https://api.scryfall.com/cards/named?exact=${cardNameForURL}&format=image`;

    // Create card element and add it to the container
    const cardElement = document.createElement('div');
    cardElement.className = 'main-card-display';
    cardElement.innerHTML = `<img src="${cardURL}" class="card-src">`;
    mainCardViewContainer.appendChild(cardElement);
}