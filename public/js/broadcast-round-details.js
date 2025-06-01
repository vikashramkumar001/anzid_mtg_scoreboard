const socket = io();
let roundData = {};
let detailToDisplay = "";

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const match_id = pathSegments[4];
const detail_id = pathSegments[5];

console.log('match, detail', match_id, detail_id);

const playerDetail = document.getElementById('player-detail');

// ask for global match data to get font family
socket.emit('get-match-global-data');

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

// Function to render the round details on the page
function renderDetails() {
    // Render player name
    playerDetail.innerHTML = `${detailToDisplay}`;
}