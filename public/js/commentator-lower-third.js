const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let globalData = {};
let commentator1 = "";
let commentator1subtext = "";
let commentator2 = "";
let commentator2subtext = ""; 
let commentator3 = "";
let commentator3subtext = "";
let commentator4 = "";
let commentator4subtext = "";

// Get match name from the URL - exact pathSegment might be different
const pathSegments = window.location.pathname.split('/');
const commentator_id = pathSegments[4];

// Listen for global data update w/ commentator data
socket.on('update-match-global-data', (data) => {
    console.log('L3 - global data', data);
    // Save to local object
    globalData = data;

    commentator1 = globalData['global-commentator-1']
    commentator1subtext = globalData['global-commentator-1-subtext']
    commentator2= globalData['global-commentator-2']
    commentator2subtext = globalData['global-commentator-2-subtext']
    commentator3 = globalData['global-commentator-3']
    commentator3subtext = globalData['global-commentator-3-subtext']
    commentator4 = globalData['global-commentator-4']
    commentator4subtext = globalData['global-commentator-4-subtext']

    console.log('L3 - commentator data', commentator1, commentator1subtext, commentator2, commentator2subtext, commentator3, commentator3subtext, commentator4, commentator4subtext);

    // specifically checking for font family change
    checkFontFamily(data['globalData']['global-font-family']);
    updateCommentatorData();
})

// Function to check if font family needs updating
function checkFontFamily(globalFont) {
    if (globalFont) {
        document.documentElement.style.setProperty('--dynamic-font', globalFont);
    }
}

// Function to update commentator data
function updateCommentatorData(){
    const commentatorNameplate = document.getElementsByClassName('commentator');
    const commentatorHandle = document.getElementsByClassName('commentator-subtext');

    switch(commentator_id) {
        case 1:
            commentatorNameplate.innerHTML = commentator1;
            commentatorHandle.innerHTML = commentator1subtext;
            break;
        case 2:
            commentatorNameplate.innerHTML = commentator2;
            commentatorHandle.innerHTML = commentator2subtext;
            break;
        case 3:
            commentatorNameplate.innerHTML = commentator3;
            commentatorHandle.innerHTML = commentator3subtext;
            break;
        case 4:
            commentatorNameplate.innerHTML = commentator4;
            commentatorHandle.innerHTML = commentator4subtext;
            break;
    }
}

socket.emit('get-game-selection');

socket.on('game-selection-updated', ({gameSelection}) => {
    console.log('L3 - game selection updated socket on');
    handleGameSelectionUpdate(gameSelection);
});

// If this is the first time receiving it (like on initial load):
socket.on('server-current-game-selection', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
});

// game selection logic - we only need to update the image
function handleGameSelectionUpdate(gameSelection) {
    const normalized = gameSelection?.toLowerCase();
    if (!normalized || normalized === selectedGame) return;

    // Remove previous game class if it exists
    if (selectedGame) {
        document.body.classList.remove(selectedGame);
    }

    selectedGame = normalized;
    console.log('L3 - Game selection updated:', selectedGame);

    // Add game type class to body
    document.body.classList.add(selectedGame);

    // Show/hide appropriate commentator containers
    const mtgLowerThird = document.getElementById('lower-third-mtg');
    const riftboundLowerThird = document.getElementById('lower-third-riftbound');
    const vibesLowerThird = document.getElementById('lower-third-vibes');

    if (selectedGame === 'mtg') {
        console.log('Switching lower-third to MTG mode...');
        if (mtgLowerThird) mtgLowerThird.style.display = 'block';
        if (riftboundLowerThird) riftboundLowerThird.style.display = 'none';
        if (vibesLowerThird) vibesLowerThird.style.display = 'none';
    } else if (selectedGame === 'riftbound') {
        console.log('Switching lower-third to Riftbound mode...');
        if (mtgLowerThird) mtgLowerThird.style.display = 'none';
        if (riftboundLowerThird) riftboundLowerThird.style.display = 'block';
        if (vibesLowerThird) vibesLowerThird.style.display = 'none';
    } else if (selectedGame === 'vibes') {
        console.log('Switching lower-third to Vibes mode...');
        if (mtglowerThird) mtglowerThird.style.display = 'none';
        if (riftboundlowerThird) riftboundlowerThird.style.display = 'none';
        if (vibeslowerThird) vibeslowerThird.style.display = 'block';
    } else {
        // Default: hide all if unknown game type
        if (mtglowerThird) mtglowerThird.style.display = 'none';
        if (riftboundlowerThird) riftboundlowerThird.style.display = 'none';
        if (vibeslowerThird) vibeslowerThird.style.display = 'none';
    }
}