const socket = io();
let globalData = {};
let detailToDisplay = "";

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const detail_id = pathSegments[4];

const globalDetail = document.getElementById('global-detail');

// ask for global match data to get font family
socket.emit('get-match-global-data');

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
    globalDetail.innerHTML = `${detailToDisplay}`;
    if (detail_id === 'global-commentator-one' || detail_id === 'global-commentator-two' || detail_id === 'global-commentator-three' || detail_id === 'global-commentator-four') {
        globalDetail.style.fontSize = '70px';
    }
    if (detail_id === 'global-commentator-one-subtext' || detail_id === 'global-commentator-two-subtext' || detail_id === 'global-commentator-three-subtext' || detail_id === 'global-commentator-four-subtext') {
        globalDetail.style.fontSize = '30px';
    }
}