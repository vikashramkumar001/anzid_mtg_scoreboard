const socket = io();
let bracketData = {};
let win = '0';

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const bracket_id = pathSegments[4];

console.log('bracket detail', bracket_id);

const playerRank = document.getElementById('player-rank');
const playerName = document.getElementById('player-name');
const playerArchetype = document.getElementById('player-archetype');
const playerPoints = document.getElementById('player-points');
const bracketContainer = document.getElementById('bracket-details-container');

// Listen for deck data to display
socket.on('bracket-data', (data) => {
    // {"bracket-quarterfinal-1-name": "", "bracket-quarterfinal-1-archetype": "", "bracket-quarterfinal-1-rank": "",...}
    console.log('data', data['bracketData']);

    // Save to local object
    bracketData = data['bracketData'];
    // Call a function to render the round details
    renderDetails();
});

// Function to render the round details on the page
function renderDetails() {
    const rank_key = `${bracket_id}-rank`;
    const name_key = `${bracket_id}-name`;
    const archetype_key = `${bracket_id}-archetype`;
    const points_key = `${bracket_id}-points`;
    const win_key = `${bracket_id}-win`;
    if (rank_key in bracketData) {
        playerRank.innerText = bracketData[rank_key];
    }
    if (name_key in bracketData) {
        playerName.innerText = bracketData[name_key];
    }
    if (archetype_key in bracketData) {
        playerArchetype.innerText = bracketData[archetype_key];
    }
    if (points_key in bracketData) {
        playerPoints.innerText = bracketData[points_key];
    }
    if (win_key in bracketData) {
        win = bracketData[win_key];
    }
    // default is no opacity
    playerRank.style.color = 'rgba(0,0,0, 1)';
    playerName.style.color = 'rgba(0,0,0, 1)';
    playerArchetype.style.color = 'rgba(0,0,0, 1)';
    playerPoints.style.color = 'rgba(0,0,0, 1)';
    // opacity on color if win is false
    if (win === '0') {
        playerRank.style.color = 'rgba(0,0,0, 0.5)';
        playerName.style.color = 'rgba(0,0,0, 0.5)';
        playerArchetype.style.color = 'rgba(0,0,0, 0.5)';
        playerPoints.style.color = 'rgba(0,0,0, 0.5)';
    }
    // change points background color based on number of points
    if (bracketData[points_key] === '2') {
        playerPoints.style.backgroundColor = '#E9CE89';
    } else {
        playerPoints.style.backgroundColor = '#fff';
    }
}