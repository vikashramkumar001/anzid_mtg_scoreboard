const socket = io();
let globalData = {};
let detailToDisplay = "";

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const detail_id = pathSegments[4];

const globalDetail = document.getElementById('global-detail');

// Listen for deck data to display
socket.on('update-match-global-data', (data) => {
    // {...}
    console.log('data', data);

    // Save to local object
    globalData = data['globalData'];
    if (globalData[detail_id]) {
        detailToDisplay = `${globalData[detail_id]}`;
        // Call a function to render the round details
        renderDetails(detail_id);
    }
});

// Function to render the round details on the page
function renderDetails() {
    // Render player name
    globalDetail.innerHTML = `${detailToDisplay}`;
    if (detail_id === 'global-commentator-one' || detail_id === 'global-commentator-two') {
        globalDetail.style.fontSize = '70px';
    }
    if (detail_id === 'global-commentator-one-subtext' || detail_id === 'global-commentator-two-subtext') {
        globalDetail.style.fontSize = '30px';
    }
}