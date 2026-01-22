const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
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
    if (detail_id === 'global-commentator-1' || detail_id === 'global-commentator-2' || detail_id === 'global-commentator-3' || detail_id === 'global-commentator-4') {
		//		  MTG styling
		//        globalDetail.style.fontSize = '70px'; 
		
		//		  riftbound styling
		globalDetail.style.fontFamily = "'AkzMed', sans-serif";
		globalDetail.style.fontSize = "48px";
		globalDetail.style.fontWeight = "500";
		globalDetail.style.textAlign = "left";
    }
    if (detail_id === 'global-commentator-1-subtext' || detail_id === 'global-commentator-2-subtext' || detail_id === 'global-commentator-3-subtext' || detail_id === 'global-commentator-4-subtext') {
		//		  MTG styling
		//        globalDetail.style.fontSize = '30px';
		
		//		  riftbound styling
		globalDetail.style.fontFamily = "'AkzMed', sans-serif";
		globalDetail.style.fontSize = "48px";
		globalDetail.style.fontWeight = "500"; 
		globalDetail.style.fontStyle = "italic";
        globalDetail.style.color = "#ffffff";
		//TES color - globalDetail.style.color = "#49e723";
		globalDetail.style.textAlign = "left";
    }
}