const socket = io();
let metaBreakdownData = {};

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const detail_id = pathSegments[4];
const game_id = 'mtg';
const fallbackUrl = `/assets/images/cards/${game_id}/${game_id === 'mtg' ? 'magic' : 'vibes'}-card-back.jpg`;

console.log('detail', detail_id);

const metaBreakdownDetail = document.getElementById('meta-breakdown-detail');

// ask for global match data to get font family
socket.emit('get-match-global-data');

// Listen for deck data to display
socket.on('receive-meta-breakdown-data', (data) => {
    // {meta-breakdown-archetype-1:{}, meta-breakdown-key-card-1-1:{},...}}
    console.log('data', data);

    // Save to local object
    metaBreakdownData = data;
    if (metaBreakdownData[detail_id]) {
        // Call a function to render the round details
        renderDetails(metaBreakdownData);
    }
});

// Listen for global data update
socket.on('update-match-global-data', (data) => {
    console.log('global data', data);
    // specifically checking for font family change
    checkFontFamily(data['globalData']['global-font-family']);
})

// Function to check if font family needs updating
function checkFontFamily(globalFont) {
    if (globalFont) {
        document.documentElement.style.setProperty('--dynamic-font', globalFont);
    }
}

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

// Function to render the round details on the page
function renderDetails(data) {
    // based on key, handle incoming data
    if (detail_id.includes('meta-breakdown-key-card')) {
        // render card
        renderCard(data[detail_id]);
    } else {
        // Render detail text
        metaBreakdownDetail.innerHTML = `${metaBreakdownData[detail_id]}`;
    }
}

// on start - render fallback image if card
if (detail_id.includes('meta-breakdown-key-card')) {
    // render card
    renderCard({url: ''});
}