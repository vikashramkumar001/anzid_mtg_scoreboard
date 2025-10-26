// start

const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let timeout = null;
let current_state = {};
// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const control_id = pathSegments[2];
let round_id = '1';
let match_id = 'match1';

console.log('from url - control id - delay', control_id);

// Send the match ID to the server when the client connects - will send back saved data if control already exists
socket.emit('getSavedControlState', {control_id});

// listen for saved state from server - listen for scoreboard update - scoreboard is always updated regardless of source
socket.on('scoreboard-' + control_id + '-saved-state', (data) => {
    console.log('got saved state from server', data);
    round_id = data['round_id'];
    match_id = data['match_id'];
    current_state = data['data'];
    loadSavedState(data['data']);
})

// START TIMER FUNCTIONS

// at the start, ask for all timer states from the server
socket.emit('get-all-timer-states');

// handle getting all timer states
socket.on('current-all-timer-states', ({timerState}) => {
    // console.log('got all timer states', timerState);
    const matchState = timerState[round_id][match_id];
    // console.log(matchState)
    if (matchState) {
        const timerElement = document.querySelector(`#timer`);
        timerElement.innerText = matchState.time > 0 ? formatTime(matchState.time) : 'TURNS';
    }
});

function updateTimerState(round_id, match_id, action) {
    console.log('update time state', round_id, match_id, action)
    socket.emit('update-timer-state', {round_id, match_id, action});
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// Add event listeners for reset life buttons
function attachMatchTimerButtonListeners() {
    const startButton = document.querySelector(`#timer-start`);
    const addButton = document.querySelector(`#timer-add`);
    const minusButton = document.querySelector(`#timer-minus`);
    const pauseButton = document.querySelector(`#timer-pause`);
    const resetButton = document.querySelector(`#timer-reset`);
    startButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'start');
    });
    addButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'add');
    });
    minusButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'minus');
    });
    pauseButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'pause');
    });
    resetButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'reset');
    });
}


// attach button listeners for timers
attachMatchTimerButtonListeners();

// END TIMER FUNCTIONS