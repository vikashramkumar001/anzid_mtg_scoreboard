const socket = io();
let roundData = {};
let detailToDisplay = "";

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const match_id = pathSegments[4];
const detail_id = pathSegments[5];

console.log('match, detail', match_id, detail_id);

const playerDetail = document.getElementById('player-detail');

// Listen for deck data to display
socket.on('broadcast-round-data', (data) => {
    // {match1:{}, match2:{},...}}
    console.log('data', data);

    // Save to local object
    roundData = data;
    if (data[match_id] && data[match_id][detail_id]) {
        detailToDisplay = `${data[match_id][detail_id]}`;
        // Call a function to render the round details
        renderDetails();
    }
});

// Function to render the round details on the page
function renderDetails() {
    // Render player name
    playerDetail.innerHTML = `${detailToDisplay}`;
}