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
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

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

// Auto-scale font size to fit container width
function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    // Create a temporary span to measure text width accurately
    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerHTML = element.innerHTML;
    document.body.appendChild(temp);

    // Reduce font size until text fits
    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';
    document.body.removeChild(temp);
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

    // Wait for fonts to load before scaling text
    document.fonts.ready.then(() => {
        [].slice.call(commentatorNameplate).forEach(function(div) {
            autoScaleText(div, 48, 24, 465);
        });
    });
}

socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');

socket.on('server-current-game-selection', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('game-selection-updated', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-vendor-selection', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('vendor-selection-updated', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-player-count', ({playerCount}) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('player-count-updated', ({playerCount}) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});

// game selection logic - we only need to update the image
function updateTheme(game, vendor, playerCount) {
    //console.log('L3 - Enter handle game select: ', game);
    const normalized = game?.toLowerCase();
    if (!normalized) return;

    // Remove previous game class if it exists
    if (currentGame) {
        document.body.classList.remove(currentGame);
    }

    // Add game type class to body
    document.body.classList.add(normalized);

    // Show/hide appropriate commentator containers
    const mtgLowerThird = document.getElementById('lower-third-mtg');
    const riftboundLowerThird = document.getElementById('lower-third-riftbound');
    const vibesLowerThird = document.getElementById('lower-third-vibes');

    if (normalized === 'mtg') {
        console.log('Switching lower-third to MTG mode...');
        if (mtgLowerThird) mtgLowerThird.style.display = 'block';
        if (riftboundLowerThird) riftboundLowerThird.style.display = 'none';
        if (vibesLowerThird) vibesLowerThird.style.display = 'none';
    } else if (normalized === 'riftbound') {
        console.log('Switching lower-third to Riftbound mode...');
        if (mtgLowerThird) mtgLowerThird.style.display = 'none';
        if (riftboundLowerThird) riftboundLowerThird.style.display = 'block';
        if (vibesLowerThird) vibesLowerThird.style.display = 'none';
    } else if (normalized === 'vibes') {
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

    // Apply vendor overrides
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }
}