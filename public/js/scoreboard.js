// scoreboard.js - Optimized Version

let lastState = {};
let archetypeList = [];
const socket = io();

const pathSegments = window.location.pathname.split('/');
const control_id = pathSegments[2];
let round_id = '1';
let match_id = 'match1';

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

console.log('from url - control id', control_id);

function updateElementText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (lastState[id] !== value) {
        el.innerHTML = value;
        lastState[id] = value;
    }
}

function updateState(data) {
    Object.entries(data).forEach(([key, value]) => {
        const el = document.getElementById(key);

        if (el) {
            if (["player-poison-left", "player-poison-right"].includes(key)) {
                const parent = el.parentElement;
                const shouldShow = value > 0;
                if (lastState[key + '_display'] !== shouldShow) {
                    parent.style.display = shouldShow ? 'inherit' : 'none';
                    lastState[key + '_display'] = shouldShow;
                }
            }

            updateElementText(key, value);

            if (key === 'player-archetype-left') {
                updateBackground('left', value);
            } else if (key === 'player-archetype-right') {
                updateBackground('right', value);
            }
        } else if (["player-wins-left", "player-wins-right"].includes(key)) {
            const prefix = key === 'player-wins-left' ? "scorebug-left-life-wins" : "scorebug-right-life-wins";

            if (value > 1) {
                updateElementText(prefix + "-1", "&#11044;");
                updateElementText(prefix + "-2", "&#11044;");
            } else if (value > 0) {
                updateElementText(prefix + "-1", "&#11044;");
                updateElementText(prefix + "-2", "");
            } else {
                updateElementText(prefix + "-1", "");
                updateElementText(prefix + "-2", "");
            }
        } else if (["player-mana-symbols-left", "player-mana-symbols-right"].includes(key)) {
            if (key === 'player-mana-symbols-left') {
                console.log(key, value)
                renderManaSymbols(value, 'player-mana-symbols-left-symbols');
            }
            if (key === 'player-mana-symbols-right') {
                console.log(key, value)
                renderManaSymbols(value, 'player-mana-symbols-right-symbols');
            }
        }
    });
}

function updateBackground(side, archetypeName) {
    const backgroundElement = document.querySelector(`.background-${side}`);
    const archetype = archetypeList.find(d => d.name.toLowerCase() === archetypeName.toLowerCase());
    if (!backgroundElement) return;

    if (archetype && archetype.imageUrl) {
        const newUrl = archetype.imageUrl;
        const currentBg = lastState[`background-${side}`];

        if (currentBg !== newUrl) {
            const cacheBuster = new Date().getTime();
            const finalUrl = `${newUrl}?v=${cacheBuster}`;

            const img = new Image();
            img.onload = () => {
                backgroundElement.style.backgroundImage = `url(${finalUrl})`;
                backgroundElement.style.display = 'block';
                lastState[`background-${side}`] = newUrl;
            };
            // turning off archetypes image change for now
            // if img src is not set - img.onload is not run
            // img.src = finalUrl;
        }
    } else {
        if (lastState[`background-${side}`] !== 'none') {
            backgroundElement.style.backgroundImage = 'none';
            backgroundElement.style.display = 'none';
            lastState[`background-${side}`] = 'none';
        }
    }
}

// INITIAL STATE
console.log('sending request for data');
socket.emit('getSavedControlState', {control_id});
socket.emit('getArchetypeList');

socket.on('scoreboard-' + control_id + '-saved-state', (data) => {
    console.log('got saved state from server', data);
    archetypeList = data['archetypeList'];
    round_id = data['round_id'];
    match_id = data['match_id'];
    updateState(data['data']);
});

socket.on('overlayHeaderBackgroundUpdate', (newImageUrl) => {
    console.log('got header overlay from server', newImageUrl);
    const last = lastState['header-background'];
    if (last !== newImageUrl) {
        const cacheBuster = new Date().getTime();
        document.querySelector('.header .background').style.backgroundImage = `url(${newImageUrl}?v=${cacheBuster})`;
        lastState['header-background'] = newImageUrl;
    }
});

socket.on('overlayFooterBackgroundUpdate', (newImageUrl) => {
    console.log('got footer overlay from server', newImageUrl);
    const last = lastState['footer-background'];
    if (last !== newImageUrl) {
        const cacheBuster = new Date().getTime();
        document.querySelector('.footer .background').style.backgroundImage = `url(${newImageUrl}?v=${cacheBuster})`;
        lastState['footer-background'] = newImageUrl;
    }
});

socket.on('archetypeListUpdated', (archetypes) => {
    console.log('archetype list updated', archetypes);
    archetypeList = archetypes;
    socket.emit('getSavedControlState', {control_id});
});

// TIMER
socket.emit('get-all-timer-states');

socket.on('current-all-timer-states', ({timerState}) => {
    const matchState = timerState[round_id][match_id];
    if (matchState) {
        const timerElement = document.querySelector(`#timer`);
        timerElement.innerText = matchState.time > 0 ? formatTime(matchState.time) : 'TURNS';
        timerElement.style.display = matchState.show ? 'block' : 'none';
    }
});

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// GLOBAL DATA
socket.emit('get-match-global-data');

socket.on('update-match-global-data', (data) => {
    console.log('got global event data from server', data);

    const globalData = data.globalData || {};

    const miscText = globalData['global-event-miscellaneous-details'];
    const eventFormatText = globalData['global-event-format'];
    const eventNameText = globalData['global-event-name'];

    if (miscText) updateElementText('miscellaneous-details', miscText);
    if (eventFormatText) updateElementText('event-format', eventFormatText);
    if (eventNameText) updateElementText('event-name', eventNameText);
});

// SCOREBOARD STATE DATA

// call for scoreboard state - for now its wins show check
socket.emit('get-scoreboard-state');

// Listen for updated scoreboard state from server
socket.on('scoreboard-state-data', ({scoreboardState}) => {
    console.log('got server scoreboard state', scoreboardState);
    const matchState = scoreboardState[round_id][match_id];
    if (matchState) {
        const winsDisplays = document.querySelectorAll('#scorebug-right-life-wins-1, #scorebug-right-life-wins-2, #scorebug-left-life-wins-1, #scorebug-left-life-wins-2');
        winsDisplays.forEach(el => {
            el.style.display = matchState.showWins ? 'block' : 'none';
        });
    }
});

// MANA SYMBOLS

function renderManaSymbols(inputStr, containerId, scenario = {}) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear existing symbols

    const presentSymbols = new Set(
        inputStr.toUpperCase().split('').filter(char => MANA_SYMBOLS[char])
    );

    // If there are no valid symbols, hide the container and exit early
    console.log(inputStr)
    console.log(presentSymbols.size)
    if (presentSymbols.size === 0) {
        container.style.display = 'none';
        return;
    }

    // Otherwise, make sure it's visible
    container.style.display = 'flex';

    let symbolsToRender = MANA_ORDER.filter(symbol => presentSymbols.has(symbol));
    if (scenario.reverse === true) {
        symbolsToRender.reverse();
    }

    symbolsToRender.forEach(symbol => {
        const img = document.createElement('img');
        img.className = 'mana-symbols';
        img.src = MANA_SYMBOLS[symbol].src;
        img.alt = MANA_SYMBOLS[symbol].alt;
        container.appendChild(img);
    });
}

