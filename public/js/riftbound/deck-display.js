const socket = io();

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const deck_id = pathSegments[5];

let deckData = [];

// Listen for deck data to display
socket.on('riftbound-deck-data-from-server', (data) => {
    console.log('data', data);
    if (parseInt(deck_id) === data?.index && data?.data.length > 0) {
        deckData = data?.data;
        renderDecks();
    }
});

// Function to render the decks on the page
function renderDecks() {
    // Clear previous deck displays
    document.getElementById('main-deck-container').innerHTML = '';

    // Render main deck
    const mainDeckContainer = document.getElementById('main-deck-container');
    const totalCards = deckData.length;

    // No overlap, display cards normally
    // 3 x 10 rows
    if (totalCards <= 30) {
        deckData.forEach((card, index) => {
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
        deckData.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'main-deck-card';
            // cardElement.innerHTML = `<div class="card-name">${card['card-name']}</div>`;
            cardElement.innerHTML = `<img src="${card['card-url']}" class="card-src"><div class="card-count">${card['card-count']}</div>`;
            cardElement.style.width = `${scalingCardWidth}px`;
            mainDeckContainer.appendChild(cardElement);
        });
    }
}