const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let standingsData = {};
let rankText = document.getElementById('standings-rank');
let nameText = document.getElementById('standings-name');
let archetypeText = document.getElementById('standings-archetype');
let recordText = document.getElementById('standings-record');

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const rank_id = pathSegments[4];

console.log('standings for rank', rank_id);

// Listen for deck data to display
socket.on('broadcast-round-standings-data', (data) => {
    // {{"rank": 1, "name": "Barber, Jon", "archetype": "Mystic Forge Combo", "record": "10-1-0"}....}
    console.log('data', data);

    // Save to local object
    standingsData = data[rank_id];

    // display
    rankText.innerHTML = standingsData['rank'] || '';
    nameText.innerHTML = standingsData['name'] || '';
    archetypeText.innerHTML = standingsData['archetype'] || '';
    recordText.innerHTML = standingsData['record'] || '';

});