const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let localData = {};
let commentator1 = "";
let commentator1subtext = "";
let commentator2 = "";
let commentator2subtext = ""; 
let commentator3 = "";
let commentator3subtext = "";
let commentator4 = "";
let commentator4subtext = "";
let selectedGame = "";

// Get match name from the URL - exact pathSegment might be different
const pathSegments = window.location.pathname.split('/');
const commentator_id = pathSegments[3];

// Listen for global data update w/ commentator data
socket.on('update-match-global-data', (data) => {
    console.log('L3 - global data', data);
    // Save to local object
    localData = data;

    commentator1 = localData['globalData']['global-commentator-1']
    commentator1subtext = localData['globalData']['global-commentator-1-subtext']
    commentator2= localData['globalData']['global-commentator-2']
    commentator2subtext = localData['globalData']['global-commentator-2-subtext']
    commentator3 = localData['globalData']['global-commentator-3']
    commentator3subtext = localData['globalData']['global-commentator-3-subtext']
    commentator4 = localData['globalData']['global-commentator-4']
    commentator4subtext = localData['globalData']['global-commentator-4-subtext']

    console.log('L3 - commentator data', commentator1, commentator1subtext, commentator2, commentator2subtext, commentator3, commentator3subtext, commentator4, commentator4subtext);

    // specifically checking for font family change
    // checkFontFamily(data['localData']['global-font-family']);
    updateCommentatorData();
})

// function for font selection - TODO
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
        case '1':
            [].slice.call(commentatorNameplate).forEach(function(div) {
                div.innerHTML = commentator1;
            });
            [].slice.call(commentatorHandle).forEach(function(div) {
                div.innerHTML = commentator1subtext;
            });
            break;
        case '2':
            [].slice.call(commentatorNameplate).forEach(function(div) {
                div.innerHTML = commentator2;
            });
            [].slice.call(commentatorHandle).forEach(function(div) {
                div.innerHTML = commentator2subtext;
            });
            break;
        case '3':
            [].slice.call(commentatorNameplate).forEach(function(div) {
                div.innerHTML = commentator3;
            });
            [].slice.call(commentatorHandle).forEach(function(div) {
                div.innerHTML = commentator3subtext;
            });
            break;
        case '4':
            [].slice.call(commentatorNameplate).forEach(function(div) {
                div.innerHTML = commentator4;
            });
            [].slice.call(commentatorHandle).forEach(function(div) {
                div.innerHTML = commentator4subtext;
            });
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
    console.log('L3 - server game selection updated socket on');
    handleGameSelectionUpdate(gameSelection);
});

// game selection logic - we only need to update the image
function handleGameSelectionUpdate(gameSelection) {
    console.log('L3 - Enter handle game select: ', gameSelection);
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
        if (mtgLowerThird) mtgLowerThird.style.display = 'none';
        if (riftboundLowerThird) riftboundLowerThird.style.display = 'none';
        if (vibesLowerThird) vibesLowerThird.style.display = 'block';
    } else {
        // Default: hide all if unknown game type
        if (mtgLowerThird) mtgLowerThird.style.display = 'none';
        if (riftboundLowerThird) riftboundLowerThird.style.display = 'none';
        if (vibesLowerThird) vibesLowerThird.style.display = 'none';
    }
}