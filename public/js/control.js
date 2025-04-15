let baseLifePoints = '20';

function scale_element(element, reset = false) {
    element.style.maxWidth = "";
    element.style.transform = "scale(1)";
    let max_width = element.dataset.maxWidth;
    let current_width = element.scrollWidth;
    if (current_width > max_width) {
        let scale = max_width / current_width;
        // scale = 1 - scale;
        // scale = scale * 1;
        // scale = 1 - scale;
        element.style.transform = "scale(" + scale + ",1)";
    }
    if ("maxWidthOrigin" in element.dataset) {
        element.style.transformOrigin = element.dataset.maxWidthOrigin;
    }
    // element.style.maxWidth = max_width + "px";
}

Array.from(document.getElementsByClassName("has-maximum-width")).forEach((element) => {
    scale_element(element);
});

function onLifeTotalChange(element, modifier) {
    let div = document.getElementById(element);
    div.innerHTML = parseInt(div.innerHTML) + modifier;
    armTimeout();
}

function resetLifeTotals() {
    ['player-life-left', 'player-life-right'].forEach(e => document.getElementById(e).innerHTML = baseLifePoints);
    armTimeout();
}

// Add event listeners after DOM is fully loaded
function setupLifeUpdateListeners() {
    // Life Total Buttons (Left)
    document.querySelector('#control-base .life-total-left-minus')?.addEventListener('click', () => onLifeTotalChange('player-life-left', -1));
    document.querySelector('#control-base .life-total-left-plus')?.addEventListener('click', () => onLifeTotalChange('player-life-left', 1));

    // Life Total Buttons (Right)
    document.querySelector('#control-base .life-total-right-minus')?.addEventListener('click', () => onLifeTotalChange('player-life-right', -1));
    document.querySelector('#control-base .life-total-right-plus')?.addEventListener('click', () => onLifeTotalChange('player-life-right', 1));

    // Reset Button
    document.querySelector('#control-base .buttons.reset-life-button button')?.addEventListener('click', resetLifeTotals);
}

setupLifeUpdateListeners();

function sendData() {
    document.querySelectorAll(".dynamic").forEach(element => {
        if (element.tagName === "SELECT") {
            current_state[element.id] = element.value.trim();
        } else {
            current_state[element.id] = element.innerHTML.trim();
        }

    });
    console.log('emitting updated content', match_id, current_state);
    // send data to server
    socket.emit('control-data-updated', {round_id, match_id, current_state});
}

function armTimeout() {
    console.log('arming timeout - ' + delay_value + ' micro seconds');
    clearTimeout(timeout);
    // delay value seconds after last input change - after timeout then emit data
    timeout = setTimeout(() => sendData(), delay_value);
}

document.querySelectorAll(".editable").forEach(editable => editable.addEventListener("input", armTimeout));
document.querySelectorAll(".editable").forEach(editable => editable.addEventListener('keypress', (evt) => {
    if (evt.which === 13) {
        evt.preventDefault();
    }
}));

function loadSavedState(data) {
    Object.entries(data).forEach((element) => {
        let [key, value] = element;
        if (document.getElementById(key) != null) {
            let el = document.getElementById(key);
            if (el.tagName === "SELECT") {
                el.selectedIndex = [...el.options].findIndex(option => option.text === value);
            } else {
                document.getElementById(key).innerHTML = value;
            }
        }
    });
    setupCustomDropdowns(); // Set up dropdowns after loading saved state
}

function setupCustomDropdowns() {
    const archetypeFields = document.querySelectorAll('[id$="player-archetype-left"], [id$="player-archetype-right"]');

    archetypeFields.forEach(field => {
        if (field.parentNode.classList.contains('custom-dropdown')) {
            return; // Skip if already set up
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-dropdown';
        field.parentNode.insertBefore(wrapper, field);
        wrapper.appendChild(field);

        const dropdownList = document.createElement('div');
        dropdownList.className = 'dropdown-list';
        wrapper.appendChild(dropdownList);

        field.addEventListener('input', function () {
            const value = this.textContent.trim().toLowerCase();
            const filteredArchetypes = currentArchetypeList
                .filter(archetype => archetype.name.toLowerCase().includes(value))
                .slice(0, 5); // Limit to top 5 results
            renderDropdownList(dropdownList, filteredArchetypes, field);
        });

        field.addEventListener('focus', function () {
            renderDropdownList(dropdownList, currentArchetypeList, field);
        });

        document.addEventListener('click', function (e) {
            if (!wrapper.contains(e.target)) {
                dropdownList.style.display = 'none';
            }
        });
    });
}

function renderDropdownList(dropdownList, items, field) {
    dropdownList.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item.name;
        div.classList.add('dropdown-item');
        div.addEventListener('click', function () {
            field.textContent = item.name;
            dropdownList.style.display = 'none';
            field.dispatchEvent(new Event('input'));
            field.dispatchEvent(new Event('change')); // Trigger change event
        });
        dropdownList.appendChild(div);
    });
    dropdownList.style.display = items.length > 0 ? 'block' : 'none';
}

// start

const socket = io();
let timeout = null;
let current_state = {};
// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const control_id = pathSegments[2];
let round_id = '1';
let match_id = 'match1';
const delay_value = Number(pathSegments[3]) || 10;        // This should be the delay - used for timeou

console.log('from url - control id - delay', control_id, delay_value);

// Send the match ID to the server when the client connects - will send back saved data if control already exists
socket.emit('getSavedControlState', {control_id});

let currentArchetypeList = []; // To store the current archetype list

// Request the archetype list from the server when the page loads
socket.emit('getArchetypeList');

// listen for saved state from server
socket.on('control-' + control_id + '-saved-state', (data) => {
    console.log('got saved state from server', data);
    round_id = data['round_id'];
    match_id = data['match_id'];
    current_state = data['data'];
    loadSavedState(data['data']);
})

// Listen for the archetype list from the server
socket.on('archetypeListUpdated', (archetypes) => {
    currentArchetypeList = archetypes;
    setupCustomDropdowns(); // Set up dropdowns after receiving the archetype list
});

// Initial setup when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setupCustomDropdowns();
});

// player poison controls
function attachPoisonControlListeners() {
    // Select poison controls
    const poisonControls = {
        left: {
            plus: document.querySelector('.player-poison .player-poison-control.left .btn.plus'),
            minus: document.querySelector('.player-poison .player-poison-control.left .btn.minus'),
            value: document.querySelector('#player-poison-left')
        },
        right: {
            plus: document.querySelector('.player-poison .player-poison-control.right .btn.plus'),
            minus: document.querySelector('.player-poison .player-poison-control.right .btn.minus'),
            value: document.querySelector('#player-poison-right')
        }
    };

    // Generic function to update poison value
    function updatePoisonValue(poisonField, increment) {
        let value = poisonField.innerText.trim(); // Get the innerText and trim whitespace
        let numericValue = parseInt(value, 10); // Convert to number
        if (isNaN(numericValue)) {
            numericValue = 0; // Default to 0 if invalid
        }
        numericValue += increment; // Add or subtract the increment
        if (numericValue < 0) {
            numericValue = 0; // Prevent negative values
        }
        poisonField.innerText = numericValue; // Update the field
        // send updated data to server
        armTimeout();
    }

    // Attach listeners
    poisonControls.left.plus.addEventListener('click', () => updatePoisonValue(poisonControls.left.value, 1));
    poisonControls.left.minus.addEventListener('click', () => updatePoisonValue(poisonControls.left.value, -1));
    poisonControls.right.plus.addEventListener('click', () => updatePoisonValue(poisonControls.right.value, 1));
    poisonControls.right.minus.addEventListener('click', () => updatePoisonValue(poisonControls.right.value, -1));
}

attachPoisonControlListeners();

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

// HANDLE GLOBAL DATA

// request global data on start up
socket.emit('get-match-global-data');

// listen for global event details update from server
socket.on('update-match-global-data', (data) => {
    // let globalMatchData = {'global-commentator-one': null, 'global-commentator-one-subtext': null,...}
    console.log('got global event data from server', data);
    // update the base life points from server
    if ('global-event-base-life-points' in data['globalData']) {
        baseLifePoints = data['globalData']['global-event-base-life-points'] ? data['globalData']['global-event-base-life-points'] : '20';
    }

    const globalData = data.globalData || {};

    const eventFormatText = globalData['global-event-format'];
    const eventNameText = globalData['global-event-name'];
    const globalBaseLifePoints = globalData['global-event-base-life-points'];

    const eventFormatElement = document.getElementById('event-format');
    if (eventFormatElement && eventFormatText) {
        eventFormatElement.innerText = eventFormatText;
    }

    const eventNameElement = document.getElementById('event-name');
    if (eventNameElement && eventNameText) {
        eventNameElement.innerText = eventNameText;
    }

    if (globalBaseLifePoints) {
        baseLifePoints = globalBaseLifePoints;
    }

})

// END HANDLE GLOBAL DATA