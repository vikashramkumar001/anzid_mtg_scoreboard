const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let metaBreakdownData = {};

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const meta_id = pathSegments[4];
const game_id = 'mtg';
const fallbackUrl = `/assets/images/cards/${game_id}/${game_id === 'mtg' ? 'magic' : 'vibes'}-card-back.jpg`;

console.log('meta id', meta_id);

const metaBreakdownDetail = document.getElementById('meta-breakdown-detail');

// Listen for deck data to display
socket.on('receive-meta-breakdown-data', (data) => {
    // {meta-breakdown-archetype-1:{}, meta-breakdown-key-card-1-1:{},...}}
    console.log('data', data);

    // Save to local object
    metaBreakdownData = data;

    // display details
    displayDetails(metaBreakdownData)
});

// ask for global match data to get font family
socket.emit('get-match-global-data');

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

function displayDetails(data) {
    const archetype = data[`meta-breakdown-archetype-${meta_id}`];
    const day1Count = data[`meta-breakdown-day-1-count-${meta_id}`];
    const day1Percent = data[`meta-breakdown-day-1-percent-${meta_id}`];
    const day2Count = data[`meta-breakdown-day-2-count-${meta_id}`];
    const day2Percent = data[`meta-breakdown-day-2-percent-${meta_id}`];

    const keyCard1 = data[`meta-breakdown-key-card-1-${meta_id}`];
    const keyCard2 = data[`meta-breakdown-key-card-2-${meta_id}`];
    const keyCard3 = data[`meta-breakdown-key-card-3-${meta_id}`];

    // Only render if archetype exists
    if (archetype && archetype.trim() !== "") {
        document.getElementById('meta-breakdown-archetype').innerHTML = `${archetype}`;
        document.getElementById('meta-breakdown-day1').textContent = day1Count || '';
        document.getElementById('meta-breakdown-day1-%').textContent = day1Percent ? `${day1Percent}%` : '';
        document.getElementById('meta-breakdown-day2').textContent = day2Count || '';
        document.getElementById('meta-breakdown-day2-%').textContent = day2Percent ? `${day2Percent}%` : '';

        const keyCardsContainer = document.getElementById('meta-breakdown-key-cards');
        keyCardsContainer.innerHTML = ''; // Clear old cards

        [keyCard1, keyCard2, keyCard3].forEach(card => {
            if (card && card.name && card.name.trim() !== '') {
                const img = document.createElement('img');
                img.src = card.url || fallbackUrl;
                img.alt = card.name;
                img.className = 'key-card-img'; // Style this in your CSS
                keyCardsContainer.appendChild(img);
            }
        });
    }
}