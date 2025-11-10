// scoreboard.js - Optimized Version

let lastState = {};
let archetypeList = [];
const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);

const pathSegments = window.location.pathname.split('/');
const control_id = pathSegments[2];
let round_id = '1';
let match_id = 'match1';
let selectedGame = '';  // global game type, e.g., 'mtg' or 'riftbound'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

// Riftbound Battlefields Dictionary
// Maps battlefield names to their left and right side image URLs
// Files with "180" are for left side, files without "180" are for right side
const RIFTBOUND_BATTLEFIELDS = {
    'Altar to Unity': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0000_Altar-to-Unity180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0024_Altar-to-Unity.png'
    },
    'Aspirant\'s Climb': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0001_Aspirant_s-Climb180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0025_Aspirant_s-Climb.png'
    },
    'Back Alley Bar': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0002_Back-Alley-Bar180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0026_Back-Alley-Bar.png'
    },
    'Bandle Tree': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0003_Bandle-Tree180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0027_Bandle-Tree.png'
    },
    'Fortified Position': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0004_Fortified-Position180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0028_Fortified-Position.png'
    },
    'Grove of the God Willow': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0005_Grove-of-the-God-Willow180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0029_Grove-of-the-God-Willow.png'
    },
    'Hallowed Tomb': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0006_Hallowed-Tomb180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0030_Hallowed-Tomb.png'
    },
    'Monastery of Hirana': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0007_Monastery-of-Hirana180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0031_Monastery-of-Hirana.png'
    },
    'Navori Fighting Pit': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0008_Navori-Fighting-Pit180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0032_Navori-Fighting-Pit.png'
    },
    'Obelisk of Power': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0009_Obelisk-of-Power180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0033_Obelisk-of-Power.png'
    },
    'Reaver\'s Row': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0010_Reaver_s-Row180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0034_Reaver_s-Row.png'
    },
    'Reckoner\'s Arena': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0011_Reckoner_s-Arena180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0035_Reckoner_s-Arena.png'
    },
    'Sigil of the Storm': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0012_Sigil-of-the-Storm180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0036_Sigil-of-the-Storm.png'
    },
    'Startipped Peak': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0013_Startipped-Peak180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0037_Startipped-Peak.png'
    },
    'Targon\'s Peak': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0014_Targon_s-Peak180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0038_Targon_s-Peak.png'
    },
    'The Arena\'s Greatest': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0015_The-Arena_s-Greatest180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0039_The-Arena_s-Greatest.png'
    },
    'The Dreaming Tree': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0016_The-Dreaming-Tree180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0040_The-Dreaming-Tree.png'
    },
    'The Grand Plaza': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0017_The-Grand-Plaza180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0041_The-Grand-Plaza.png'
    },
    'Trifarian War Camp': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0018_Trifarian-War-Camp180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0042_Trifarian-War-Camp.png'
    },
    'Vilemaw\'s Lair': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0019_Vilemaw_s-Lair180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0043_Vilemaw_s-Lair.png'
    },
    'Void Gate': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0020_Void-Gate180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0044_Void-Gate.png'
    },
    'Windswept Hillock': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0021_Windswept-Hillock180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0045_Windswept-Hillock.png'
    },
    'Zaun Warrens': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0022_Zaun-Warrens180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0046_Zaun-Warrens.png'
    },
    'The Candlelit Sanctum': {
        left: '/assets/images/riftbound/scoreboard/battlefields/_0023_The-Candlelit-Sanctum180.png',
        right: '/assets/images/riftbound/scoreboard/battlefields/_0047_The-Candlelit-Sanctum.png'
    }
};

console.log('from url - control id', control_id);

function updateElementText(id, value) {
    // Update element in both MTG and Riftbound sections if they exist
    // This ensures data is ready when switching between games
    const mtgContainer = document.getElementById('scoreboard-mtg');
    const riftboundContainer = document.getElementById('scoreboard-riftbound');
    
    let updated = false;
    
    // Update MTG section
    if (mtgContainer) {
        const mtgEl = mtgContainer.querySelector(`#${id}`);
        if (mtgEl && lastState[id] !== value) {
            mtgEl.innerHTML = value;
            updated = true;
        }
    }
    
    // Update Riftbound section
    if (riftboundContainer) {
        const riftboundEl = riftboundContainer.querySelector(`#${id}`);
        if (riftboundEl && lastState[id] !== value) {
            riftboundEl.innerHTML = value;
            updated = true;
        }
    }
    
    // Fallback: if not found in containers, try global search (for elements that don't exist in both sections)
    if (!updated) {
        const el = document.getElementById(id);
        if (el && lastState[id] !== value) {
            el.innerHTML = value;
            updated = true;
        }
    }
    
    if (updated) {
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
            // Handle MTG wins display
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
            
            // Handle Riftbound wins display with pip images (always update so data is ready when switching)
            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                if (key === 'player-wins-left') {
                    const pip1 = riftboundContainer.querySelector('#riftbound-wins-left-1');
                    const pip2 = riftboundContainer.querySelector('#riftbound-wins-left-2');
                    if (pip1 && pip2) {
                        if (value > 1) {
                            pip1.style.display = 'block';
                            pip2.style.display = 'block';
                        } else if (value > 0) {
                            pip1.style.display = 'block';
                            pip2.style.display = 'none';
                        } else {
                            pip1.style.display = 'none';
                            pip2.style.display = 'none';
                        }
                    }
                } else if (key === 'player-wins-right') {
                    const pip1 = riftboundContainer.querySelector('#riftbound-wins-right-1');
                    const pip2 = riftboundContainer.querySelector('#riftbound-wins-right-2');
                    if (pip1 && pip2) {
                        if (value > 1) {
                            pip1.style.display = 'block';
                            pip2.style.display = 'block';
                        } else if (value > 0) {
                            pip1.style.display = 'block';
                            pip2.style.display = 'none';
                        } else {
                            pip1.style.display = 'none';
                            pip2.style.display = 'none';
                        }
                    }
                }
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
        } else if (["player-battlefield-left", "player-battlefield-right"].includes(key)) {
            // Handle Riftbound battlefield background images (always update so images are ready when switching)
            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                const side = key === 'player-battlefield-left' ? 'left' : 'right';
                const backgroundDiv = riftboundContainer.querySelector(`.riftbound-player-battlefield-background.riftbound-player-battlefield-background-${side}`);
                
                if (backgroundDiv) {
                    if (value && value.trim()) {
                        const battlefieldName = value.trim();
                        const battlefieldData = RIFTBOUND_BATTLEFIELDS[battlefieldName];
                        
                        if (battlefieldData && battlefieldData[side]) {
                            const imageUrl = battlefieldData[side];
                            const currentBg = lastState[`battlefield-${side}`];
                            
                            if (currentBg !== imageUrl) {
                                backgroundDiv.style.backgroundImage = `url(${imageUrl})`;
                                lastState[`battlefield-${side}`] = imageUrl;
                            }
                        } else {
                            // Clear background if battlefield name doesn't match
                            if (lastState[`battlefield-${side}`]) {
                                backgroundDiv.style.backgroundImage = 'none';
                                lastState[`battlefield-${side}`] = null;
                            }
                        }
                    } else {
                        // Clear background if value is empty
                        if (lastState[`battlefield-${side}`]) {
                            backgroundDiv.style.backgroundImage = 'none';
                            lastState[`battlefield-${side}`] = null;
                        }
                    }
                }
            }
            
            // Still update the text content
            updateElementText(key, value);
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
        const timerText = matchState.time > 0 ? formatTime(matchState.time) : 'TURNS';
        const shouldShow = matchState.show;
        
        // Update MTG timer
        const mtgContainer = document.getElementById('scoreboard-mtg');
        if (mtgContainer) {
            const mtgTimer = mtgContainer.querySelector('#timer');
            if (mtgTimer) {
                mtgTimer.innerText = timerText;
                mtgTimer.style.display = shouldShow ? 'block' : 'none';
            }
        }
        
        // Update Riftbound timer
        const riftboundContainer = document.getElementById('scoreboard-riftbound');
        if (riftboundContainer) {
            const riftboundTimer = riftboundContainer.querySelector('#timer');
            if (riftboundTimer) {
                riftboundTimer.innerText = timerText;
                riftboundTimer.style.display = shouldShow ? 'block' : 'none';
            }
        }
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
            el.style.display = matchState.showWins ? 'flex' : 'none';
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

// game selection logic
function handleGameSelectionUpdate(gameSelection) {
    const normalized = gameSelection?.toLowerCase();
    if (!normalized || normalized === selectedGame) return;

    // Remove previous game class if it exists
    if (selectedGame) {
        document.body.classList.remove(selectedGame);
    }

    selectedGame = normalized;
    console.log('Game selection updated:', selectedGame);

    // Add game type class to body
    document.body.classList.add(selectedGame);

    // Show/hide appropriate scoreboard containers
    const mtgScoreboard = document.getElementById('scoreboard-mtg');
    const riftboundScoreboard = document.getElementById('scoreboard-riftbound');

    if (selectedGame === 'mtg') {
        console.log('Switching to MTG mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'block';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
    } else if (selectedGame === 'riftbound') {
        console.log('Switching to Riftbound mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'block';
        
        // Apply battlefield images if data already exists
        const riftboundContainer = document.getElementById('scoreboard-riftbound');
        if (riftboundContainer) {
            const battlefieldLeftEl = riftboundContainer.querySelector('#player-battlefield-left');
            const battlefieldRightEl = riftboundContainer.querySelector('#player-battlefield-right');
            
            if (battlefieldLeftEl && battlefieldLeftEl.textContent.trim()) {
                const battlefieldName = battlefieldLeftEl.textContent.trim();
                const battlefieldData = RIFTBOUND_BATTLEFIELDS[battlefieldName];
                if (battlefieldData && battlefieldData.left) {
                    const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-battlefield-background.riftbound-player-battlefield-background-left');
                    if (backgroundDiv) {
                        backgroundDiv.style.backgroundImage = `url(${battlefieldData.left})`;
                        lastState['battlefield-left'] = battlefieldData.left;
                    }
                }
            }
            
            if (battlefieldRightEl && battlefieldRightEl.textContent.trim()) {
                const battlefieldName = battlefieldRightEl.textContent.trim();
                const battlefieldData = RIFTBOUND_BATTLEFIELDS[battlefieldName];
                if (battlefieldData && battlefieldData.right) {
                    const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-battlefield-background.riftbound-player-battlefield-background-right');
                    if (backgroundDiv) {
                        backgroundDiv.style.backgroundImage = `url(${battlefieldData.right})`;
                        lastState['battlefield-right'] = battlefieldData.right;
                    }
                }
            }
        }
    } else {
        // Default: hide both if unknown game type
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
    }
}

socket.emit('get-game-selection');

socket.on('game-selection-updated', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
});

// If this is the first time receiving it (like on initial load):
socket.on('server-current-game-selection', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
});

// end game selection logic
