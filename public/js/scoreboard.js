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

function retrieveState() {
    console.log('sending request for data');
    const medium = 'scoreboard';
    socket.emit('getSavedControlState', {control_id});
    socket.emit('getArchetypeList');
}

function updateState(data) {
    Object.entries(data).forEach((element) => {
        let [key, value] = element;
        if (document.getElementById(key) != null) {
            if (['player-poison-left', 'player-poison-right'].indexOf(key) >= 0) {
                if (value > 0) {
                    document.getElementById(key).parentElement.style.display = 'inherit';
                } else {
                    document.getElementById(key).parentElement.style.display = 'none';
                }
            }
            document.getElementById(key).innerHTML = value;

            // Update backgrounds based on archetypes
            if (key === 'player-archetype-left') {
                updateBackground('left', value);
            } else if (key === 'player-archetype-right') {
                updateBackground('right', value);
            }

        } else if (['player-wins-left', 'player-wins-right'].indexOf(key) >= 0) {
            let index = '';
            if (key === 'player-wins-left') {
                index += "scorebug-left-life-wins";
            } else {
                index += "scorebug-right-life-wins";
            }

            if (value > 1) {
                document.getElementById(index + "-1").innerHTML = '&#11044;';
                document.getElementById(index + "-2").innerHTML = '&#11044;';
            } else if (value > 0) {
                document.getElementById(index + "-1").innerHTML = '&#11044;';
                document.getElementById(index + "-2").innerHTML = '';
            } else {
                document.getElementById(index + "-1").innerHTML = '';
                document.getElementById(index + "-2").innerHTML = '';
            }
        }
    });
}

// New function to update background
function updateBackground(side, archetypeName) {
    const backgroundElement = document.querySelector(`.background-${side}`);
    const archetype = archetypeList.find(d => d.name.toLowerCase() === archetypeName.toLowerCase());

    if (archetype && archetype.imageUrl) {
        const cacheBuster = new Date().getTime(); // Get the current timestamp
        const newImageUrl = `${archetype.imageUrl}?v=${cacheBuster}`;

        // Preload the image
        const img = new Image();
        //img.src = newImageUrl;

        img.onload = () => {
            // Only set the background image if the image has loaded
            backgroundElement.style.backgroundImage = `url(${newImageUrl})`;
            backgroundElement.style.display = 'block';
        };
    } else {
        backgroundElement.style.backgroundImage = 'none';
        backgroundElement.style.display = 'none';
    }
}

// start

let archetypeList = [];
const socket = io();
// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const control_id = pathSegments[2];
let round_id = '1';
let match_id = 'match1';

console.log('from url - control id', control_id);

// get saved state from server on page load
retrieveState();

// listen for updates from server
socket.on('scoreboard-' + control_id + '-saved-state', (data) => {
    // {data: {}, round_id: '', match_id: '', archetypeList: []}
    console.log('got saved state from server', data);
    archetypeList = data['archetypeList'];
    round_id = data['round_id'];
    match_id = data['match_id'];
    updateState(data['data']);
})

// Listen for header overlay background image update
socket.on('overlayHeaderBackgroundUpdate', (newImageUrl) => {
    console.log('got header overlay from server', newImageUrl);
    const cacheBuster = new Date().getTime(); // Get the current timestamp
    document.querySelector('.header .background').style.backgroundImage = `url(${newImageUrl}?v=${cacheBuster})`;
});

// Listen for footer overlay background image update
socket.on('overlayFooterBackgroundUpdate', (newImageUrl) => {
    console.log('got footer overlay from server', newImageUrl);
    const cacheBuster = new Date().getTime(); // Get the current timestamp
    document.querySelector('.footer .background').style.backgroundImage = `url(${newImageUrl}?v=${cacheBuster})`;
});

// New: Listen for the updated archetype list
socket.on('archetypeListUpdated', (archetypes) => {
    console.log('archetype list updated', archetypes);
    archetypeList = archetypes;
    // get saved state so archetypes will re-render
    const medium = 'scoreboard';
    socket.emit('getSavedControlState', {control_id});
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
        // hide / show display based on show value
        if (matchState.show) {
            timerElement.style.display = 'block';
        } else {
            timerElement.style.display = 'none';
        }
    }
});

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// END TIMER FUNCTIONS

// HANDLE GLOBAL DATA

// request global data on start up
socket.emit('get-match-global-data');

// listen for global event details update from server
socket.on('update-match-global-data', (data) => {
    // let globalMatchData = {'global-commentator-one': null, 'global-commentator-one-subtext': null,...}
    console.log('got global event data from server', data);

    const globalData = data.globalData || {};

    const miscText = globalData['global-event-miscellaneous-details'];
    const eventFormatText = globalData['global-event-format'];
    const eventNameText = globalData['global-event-name'];

    const miscElement = document.getElementById('miscellaneous-details');
    if (miscElement && miscText) {
        miscElement.innerText = miscText;
    }

    const eventFormatElement = document.getElementById('event-format');
    if (eventFormatElement && eventFormatText) {
        eventFormatElement.innerText = eventFormatText;
    }

    const eventNameElement = document.getElementById('event-name');
    if (eventNameElement && eventNameText) {
        eventNameElement.innerText = eventNameText;
    }

})

// END HANDLE GLOBAL DATA