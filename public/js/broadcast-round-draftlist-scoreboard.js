const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);

// Get slot ID from URL
// URL pattern: /broadcast/round/draftlist/scoreboard/:slotId
const pathSegments = window.location.pathname.split('/');
const slotId = pathSegments[5];

const playerNameEl = document.getElementById('player-name');
const playerPronounsEl = document.getElementById('player-pronouns');

// Listen for dedicated draft list data (separate from match data)
socket.on('draft-list-data', (data) => {
    console.log('[DraftList Scoreboard] draft-list-data received:', data);

    // Only process if this data is for our slot
    if (data.slotId === slotId) {
        console.log('[DraftList Scoreboard] Match! Rendering:', data.playerName, data.playerPronouns);
        renderScoreboard(data.playerName, data.playerPronouns);
    } else {
        console.log('[DraftList Scoreboard] No match, ignoring. Expected slot:', slotId, 'Got:', data.slotId);
    }
});

// Render the scoreboard
function renderScoreboard(playerName, playerPronouns) {
    playerNameEl.textContent = playerName || '';
    playerPronounsEl.textContent = playerPronouns || '';

    // Wait for fonts to load before auto-scaling
    document.fonts.ready.then(() => {
        autoScaleText(playerNameEl, 29, 12, 394);
    });
}

// Request current draft list data on page load (wait for connection)
socket.on('connect', () => {
    console.log('[DraftList Scoreboard] Connected, requesting data for slot', slotId);
    socket.emit('get-draft-list-data', { slotId });
});

// Also request if already connected
if (socket.connected) {
    console.log('[DraftList Scoreboard] Already connected, requesting data for slot', slotId);
    socket.emit('get-draft-list-data', { slotId });
}

// Auto-scale font size to fit container width
function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.textContent) return;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    // Create a temporary span to measure text width
    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.textContent = element.textContent;
    document.body.appendChild(temp);

    // Reduce font size until text fits
    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';

    // Scale pronouns to 70% of name size
    const pronounsSize = currentSize * 0.7;
    playerPronounsEl.style.fontSize = pronounsSize + 'px';

    document.body.removeChild(temp);
}
