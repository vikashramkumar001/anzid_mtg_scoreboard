// scoreboard.js - Optimized Version
import {
    RIFTBOUND_RUNES_BG as RIFTBOUND_RUNES,
    RIFTBOUND_BATTLEFIELD_NAMES,
    RIFTBOUND_BATTLEFIELDS_BASE,
    RIFTBOUND_LEGENDS,
    RIFTBOUND_LEGENDS_DEFAULT,
} from './riftbound/constants.js';

// Auto-scale text to fit within a max width (consistent with other broadcast views)
function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return maxFontSize;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerHTML = element.innerHTML;
    document.body.appendChild(temp);

    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';
    document.body.removeChild(temp);
    return currentSize;
}

// Sync a paired group of riftbound elements to the smallest calculated size
function autoScalePaired(selectors, maxFontSize, minFontSize, maxWidth) {
    const rfb = document.getElementById('scoreboard-riftbound');
    if (!rfb) return;
    const els = selectors.map(sel => rfb.querySelector(sel)).filter(Boolean);
    if (els.length === 0) return;
    const sizes = els.map(el => autoScaleText(el, maxFontSize, minFontSize, maxWidth));
    const minSize = Math.min(...sizes);
    els.forEach(el => el.style.fontSize = minSize + 'px');
}

function autoScaleRiftboundNames() {
    const root = document.documentElement;
    const maxFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-name-max-font') || '20', 10);
    const maxWidth = parseInt(getComputedStyle(root).getPropertyValue('--rb-name-max-width') || '220', 10);
    autoScalePaired(['#player-name-left', '#player-name-right'], maxFont, 10, maxWidth);
}

function autoScaleRiftboundDetails() {
    autoScalePaired([
        '#player-legend-left', '#player-legend-right',
        '#player-champion-left', '#player-champion-right',
        '#player-battlefield-left', '#player-battlefield-right'
    ], 13.5, 8, 251);
}

function autoScaleRiftboundRecords() {
    const root = document.documentElement;
    const maxFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-record-max-font') || '14', 10);
    const minFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-record-min-font') || '10', 10);
    const maxWidth = parseInt(getComputedStyle(root).getPropertyValue('--rb-record-max-width') || '60', 10);
    autoScalePaired(['#player-record-left', '#player-record-right'], maxFont, minFont, maxWidth);
}

function autoScaleRiftboundPoints() {
    const root = document.documentElement;
    const maxFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-points-max-font') || '28', 10);
    const minFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-points-min-font') || '20', 10);
    const maxWidth = parseInt(getComputedStyle(root).getPropertyValue('--rb-points-max-width') || '60', 10);
    const left = document.querySelector('#scoreboard-riftbound #player-life-left');
    const right = document.querySelector('#scoreboard-riftbound #player-life-right');
    if (left) autoScaleText(left, maxFont, minFont, maxWidth);
    if (right) autoScaleText(right, maxFont, minFont, maxWidth);
}

let lastState = {};
let archetypeList = [];
const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);

const pathSegments = window.location.pathname.split('/');
const isBroadcastMode = window.location.pathname.includes('/broadcast/round/scoreboard/');

let control_id, match_id, round_id;
if (isBroadcastMode) {
    match_id = pathSegments[4]; // e.g. 'match1'
    round_id = null; // set when server sends broadcast-scoreboard-round-id
    control_id = null;
} else {
    control_id = pathSegments[2];
    round_id = '1';
    match_id = 'match1';
}

let selectedGame = '';  // global game type, e.g., 'mtg' or 'riftbound'
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: '/assets/images/mtg/icons/mana/W.svg'},
    U: {alt: 'Blue', src: '/assets/images/mtg/icons/mana/U.svg'},
    B: {alt: 'Black', src: '/assets/images/mtg/icons/mana/B.svg'},
    R: {alt: 'Red', src: '/assets/images/mtg/icons/mana/R.svg'},
    G: {alt: 'Green', src: '/assets/images/mtg/icons/mana/G.svg'},
    C: {alt: 'Colorless', src: '/assets/images/mtg/icons/mana/C.svg'}
};

// Star Wars Unlimited Aspects Dictionary
const SWU_ASPECTS = {
    'aggression': '/assets/images/starwars/icons/Aggression.png',
    'command': '/assets/images/starwars/icons/Command.png',
    'cunning': '/assets/images/starwars/icons/Cunning.png',
    'heroism': '/assets/images/starwars/icons/Heroism.png',
    'vigilance': '/assets/images/starwars/icons/Vigilance.png',
    'villainy': '/assets/images/starwars/icons/Villainy.png'
};
// SWU Leaders and Bases: empty for now, populated when card images are added
const SWU_LEADERS = {};
const SWU_BASES = {};

// Helper: find a matching key in a dictionary (case-insensitive, partial match)
function findDictMatch(name, dict) {
    if (!name) return null;
    const nameLower = name.toLowerCase();
    // Exact match first
    for (const key in dict) {
        if (key.toLowerCase() === nameLower) return key;
    }
    // Partial match: input contains key OR key contains input
    for (const key in dict) {
        const keyLower = key.toLowerCase();
        if (nameLower.includes(keyLower) || keyLower.includes(nameLower)) return key;
    }
    return null;
}

// Helper: render SWU aspect icons into a container from comma-separated string
function renderAspectIcons(value, container) {
    container.innerHTML = '';
    if (!value) return;
    const aspects = value.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
    aspects.forEach(aspect => {
        const iconUrl = SWU_ASPECTS[aspect];
        if (iconUrl) {
            const img = document.createElement('img');
            img.src = iconUrl;
            img.alt = aspect;
            img.className = 'swu-aspect-icon';
            container.appendChild(img);
        }
    });
}

// Riftbound Battlefields Dictionary
// Maps battlefield names to their left and right side image URLs
// Files with "180" are for left side, files without "180" are for right side
// Build battlefield lookup from shared names + base path (left/right use same image)
const RIFTBOUND_BATTLEFIELDS_DEFAULT = {
    left: '/assets/images/riftbound/battlefields/_0000_Default.png',
    right: '/assets/images/riftbound/battlefields/_0000_Default.png'
};
const RIFTBOUND_BATTLEFIELDS = {};
RIFTBOUND_BATTLEFIELD_NAMES.forEach(name => {
    const url = `${RIFTBOUND_BATTLEFIELDS_BASE}/${name}.png`;
    RIFTBOUND_BATTLEFIELDS[name] = { left: url, right: url };
});

function updateElementText(id, value) {
    // Update element in both MTG and Riftbound sections if they exist
    // This ensures data is ready when switching between games
    const mtgContainer = document.getElementById('scoreboard-mtg');
    const riftboundContainer = document.getElementById('scoreboard-riftbound');
    const vibesContainer = document.getElementById('scoreboard-vibes');
    const starwarsContainer = document.getElementById('scoreboard-starwars');

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

    // Update Vibes section
    if (vibesContainer) {
        const vibesEl = vibesContainer.querySelector(`#${id}`);
        if (vibesEl && lastState[id] !== value) {
            vibesEl.innerHTML = value;
            updated = true;
        }
    }

    // Update Star Wars section
    if (starwarsContainer) {
        const starwarsEl = starwarsContainer.querySelector(`#${id}`);
        if (starwarsEl && lastState[id] !== value) {
            if (id === 'event-round') {
                starwarsEl.innerHTML = value.replace(/\s+of\s+\d+/i, '');
            } else if (id !== 'player-leader-left' && id !== 'player-leader-right') {
                starwarsEl.innerHTML = value;
            }
            updated = true;
        }
        // Leader name formatting: always apply (split on comma, en-dash, em-dash, or spaced hyphen)
        if (starwarsEl && (id === 'player-leader-left' || id === 'player-leader-right')) {
            const raw = value ? value.trim() : '';
            const splitMatch = raw.match(/^(.+?)(?:\s*[,\u2013\u2014]\s*|\s+[-]\s+)(.+)$/);
            if (splitMatch) {
                starwarsEl.innerHTML = splitMatch[1] + '<br><span class="swu-leader-subtitle">' + splitMatch[2] + '</span>';
            } else {
                starwarsEl.innerHTML = raw;
            }
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
        // Handle runes (player-rune-color-1/2-left/right → render icons)
        if (/^player-rune-color-[12]-(left|right)$/.test(key)) {
            const side = key.endsWith('-left') ? 'left' : 'right';
            const slot = key.includes('-1-') ? 0 : 1;
            if (!lastState._runeColors) lastState._runeColors = {};
            const newVal = value ? value.trim().toLowerCase() : '';
            if (lastState._runeColors[`${side}-${slot}`] === newVal) return;
            lastState._runeColors[`${side}-${slot}`] = newVal;

            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                const runesContainer = riftboundContainer.querySelector(`#player-runes-${side}`);
                if (runesContainer) {
                    runesContainer.innerHTML = '';
                    for (let i = 0; i < 2; i++) {
                        const letter = lastState._runeColors[`${side}-${i}`];
                        const runeUrl = letter && RIFTBOUND_RUNES[letter];
                        if (runeUrl) {
                            const img = document.createElement('img');
                            img.src = runeUrl;
                            img.alt = `Rune ${letter}`;
                            img.className = 'riftbound-rune-icon';
                            runesContainer.appendChild(img);
                        }
                    }
                }
            }
            return;
        }
        
        // Handle legend backgrounds BEFORE general element handling
        if (["player-legend-left", "player-legend-right"].includes(key)) {
            // Handle Riftbound legend background images (only update if value changed)
            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                const side = key === 'player-legend-left' ? 'left' : 'right';
                const currentValue = lastState[`legend-value-${side}`];
                const newValue = value ? value.trim() : '';
                
                // Only update if the value actually changed
                if (currentValue !== newValue) {
                    const backgroundDiv = riftboundContainer.querySelector(`.riftbound-player-legend-background.riftbound-player-legend-background-${side}`);
                    
                    if (backgroundDiv) {
                        if (newValue) {
                            const legendValueLower = newValue.toLowerCase();
                            let matchedLegendKey = null;
                            
                            // First try exact case-insensitive match
                            for (const legendKey in RIFTBOUND_LEGENDS) {
                                if (legendKey.toLowerCase() === legendValueLower) {
                                    matchedLegendKey = legendKey;
                                    break;
                                }
                            }
                            
                            // If no exact match, check if the value contains any of the legend dictionary keys
                            // This handles cases like "Jinx, Loose Cannon" matching "Jinx"
                            if (!matchedLegendKey) {
                                for (const legendKey in RIFTBOUND_LEGENDS) {
                                    const legendKeyLower = legendKey.toLowerCase();
                                    // Check if the incoming value contains the legend key (e.g., "jinx, loose cannon" contains "jinx")
                                    if (legendValueLower.includes(legendKeyLower)) {
                                        matchedLegendKey = legendKey;
                                        break;
                                    }
                                }
                            }
                            
                            if (matchedLegendKey) {
                                const legendData = RIFTBOUND_LEGENDS[matchedLegendKey];
                                if (legendData && legendData[side]) {
                                    const imageUrl = legendData[side];
                                    // Encode the URL to handle spaces and special characters in filenames
                                    const encodedUrl = encodeURI(imageUrl);
                                    // Add cache buster to force browser to reload image
                                    const cacheBuster = new Date().getTime();
                                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                    backgroundDiv.style.backgroundSize = '';
                                    backgroundDiv.style.backgroundPosition = '';
                                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                    backgroundDiv.style.display = 'block';
                                    lastState[`legend-${side}`] = imageUrl;
                                    lastState[`legend-value-${side}`] = newValue;
                                } else {
                                }
                            } else {
                                // Use default images if legend name doesn't match
                                const defaultImageUrl = RIFTBOUND_LEGENDS_DEFAULT[side];
                                const encodedUrl = encodeURI(defaultImageUrl);
                                const cacheBuster = new Date().getTime();
                                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                backgroundDiv.style.backgroundSize = '';
                                backgroundDiv.style.backgroundPosition = '';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                backgroundDiv.style.display = 'block';
                                lastState[`legend-${side}`] = defaultImageUrl;
                                lastState[`legend-value-${side}`] = newValue;
                            }
                        } else {
                            // Show default image if value is empty
                            const defaultImageUrl = RIFTBOUND_LEGENDS_DEFAULT[side];
                            const encodedUrl = encodeURI(defaultImageUrl);
                            const cacheBuster = new Date().getTime();
                            const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                            backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                            backgroundDiv.style.backgroundSize = '';
                            backgroundDiv.style.backgroundPosition = '';
                            backgroundDiv.style.backgroundRepeat = 'no-repeat';
                            backgroundDiv.style.display = 'block';
                            lastState[`legend-${side}`] = defaultImageUrl;
                            lastState[`legend-value-${side}`] = '';
                        }
                    }
                }
            }
        }
        
        // Handle battlefield backgrounds BEFORE general element handling
        if (["player-battlefield-left", "player-battlefield-right"].includes(key)) {
            // Handle Riftbound battlefield background images (only update if value changed)
            const riftboundContainer = document.getElementById('scoreboard-riftbound');
            if (riftboundContainer) {
                const side = key === 'player-battlefield-left' ? 'left' : 'right';
                const currentValue = lastState[`battlefield-value-${side}`];
                const newValue = value ? value.trim() : '';

                // Only update if the value actually changed
                if (currentValue !== newValue) {
                    const backgroundDiv = riftboundContainer.querySelector(`.riftbound-player-battlefield-background.riftbound-player-battlefield-background-${side}`);
                    
                    if (backgroundDiv) {
                        if (newValue) {
                            // Try exact match first
                            let battlefieldData = RIFTBOUND_BATTLEFIELDS[newValue];
                            
                            // If no exact match, try case-insensitive match
                            if (!battlefieldData) {
                                const battlefieldNameLower = newValue.toLowerCase();
                                for (const key in RIFTBOUND_BATTLEFIELDS) {
                                    if (key.toLowerCase() === battlefieldNameLower) {
                                        battlefieldData = RIFTBOUND_BATTLEFIELDS[key];
                                        break;
                                    }
                                }
                            }
                            
                            if (battlefieldData && battlefieldData[side]) {
                                const imageUrl = battlefieldData[side];
                                // Encode the URL to handle spaces and special characters in filenames
                                const encodedUrl = encodeURI(imageUrl);
                                // Add cache buster to force browser to reload image
                                const cacheBuster = new Date().getTime();
                                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                backgroundDiv.style.backgroundSize = '';
                                backgroundDiv.style.backgroundPosition = '';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                backgroundDiv.style.display = 'block';
                                lastState[`battlefield-${side}`] = imageUrl;
                                lastState[`battlefield-value-${side}`] = newValue;
                            } else {
                                // Use default image if battlefield name doesn't match
                                const defaultImageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT[side];
                                const encodedUrl = encodeURI(defaultImageUrl);
                                const cacheBuster = new Date().getTime();
                                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                backgroundDiv.style.backgroundSize = '';
                                backgroundDiv.style.backgroundPosition = '';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                backgroundDiv.style.display = 'block';
                                lastState[`battlefield-${side}`] = defaultImageUrl;
                                lastState[`battlefield-value-${side}`] = newValue;
                            }
                        } else {
                            // Show default image if value is empty
                            const defaultImageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT[side];
                            const encodedUrl = encodeURI(defaultImageUrl);
                            const cacheBuster = new Date().getTime();
                            const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                            backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                            backgroundDiv.style.backgroundSize = '';
                            backgroundDiv.style.backgroundPosition = '';
                            backgroundDiv.style.backgroundRepeat = 'no-repeat';
                            backgroundDiv.style.display = 'block';
                            lastState[`battlefield-${side}`] = defaultImageUrl;
                            lastState[`battlefield-value-${side}`] = '';
                        }
                    }
                }
            }
        }
        
        // Handle MTG-specific event round and event name
        if (key === 'event-round') {
            const mtgEventRound = document.getElementById('mtg-event-round');
            if (mtgEventRound && lastState['mtg-event-round'] !== value) {
                mtgEventRound.textContent = value;
                lastState['mtg-event-round'] = value;
            }
        }
        if (key === 'event-name') {
            const mtgEventName = document.getElementById('mtg-event-name');
            if (mtgEventName && lastState['mtg-event-name'] !== value) {
                mtgEventName.textContent = value;
                lastState['mtg-event-name'] = value;
            }
        }

        // Handle Star Wars base damage/HP composite display (uses player-life for damage)
        if (["player-life-left", "player-life-right", "player-base-hp-left", "player-base-hp-right"].includes(key)) {
            const side = key.includes('left') ? 'left' : 'right';
            // Use current value directly; fall back to lastState for the other field
            const damage = key.includes('player-life') ? value : (lastState[`player-life-${side}`] || '0');
            const hp = key.includes('player-base-hp') ? value : (lastState[`player-base-hp-${side}`] || '30');
            const composite = `${String(damage).padStart(2, '0')}/${hp}`;
            const statsEl = document.getElementById(`swu-base-stats-${side}`);
            if (statsEl) {
                statsEl.textContent = composite;
            }
        }

        // Handle Star Wars leader image lookup + name formatting
        if (["player-leader-left", "player-leader-right"].includes(key)) {
            const side = key === 'player-leader-left' ? 'left' : 'right';
            const starwarsContainer = document.getElementById('scoreboard-starwars');
            if (starwarsContainer) {
                const imgEl = starwarsContainer.querySelector(`#swu-leader-image-${side}`);
                if (imgEl) {
                    const leaderName = value ? value.trim() : '';
                    const matchedKey = findDictMatch(leaderName, SWU_LEADERS);
                    if (matchedKey && SWU_LEADERS[matchedKey]) {
                        imgEl.src = SWU_LEADERS[matchedKey];
                        imgEl.style.display = 'block';
                    } else {
                        imgEl.src = '';
                        imgEl.style.display = 'none';
                    }
                }
                // Leader name formatting moved to after updateElementText to avoid overwrite
            }
        }

        // Handle Star Wars base image lookup
        if (["player-base-left", "player-base-right"].includes(key)) {
            const side = key === 'player-base-left' ? 'left' : 'right';
            const starwarsContainer = document.getElementById('scoreboard-starwars');
            if (starwarsContainer) {
                const imgEl = starwarsContainer.querySelector(`#swu-base-image-${side}`);
                if (imgEl) {
                    const baseName = value ? value.trim() : '';
                    const matchedKey = findDictMatch(baseName, SWU_BASES);
                    if (matchedKey && SWU_BASES[matchedKey]) {
                        imgEl.src = SWU_BASES[matchedKey];
                        imgEl.style.display = 'block';
                    } else {
                        imgEl.src = '';
                        imgEl.style.display = 'none';
                    }
                }
            }
        }

        // Handle Star Wars leader aspects (two separate fields)
        if (["player-leader-aspect-1-left", "player-leader-aspect-1-right",
             "player-leader-aspect-2-left", "player-leader-aspect-2-right"].includes(key)) {
            const side = key.includes('left') ? 'left' : 'right';
            lastState[key] = value;
            const container = document.getElementById(`swu-leader-aspects-${side}`);
            if (container) {
                const a1 = lastState[`player-leader-aspect-1-${side}`] || '';
                const a2 = lastState[`player-leader-aspect-2-${side}`] || '';
                const combined = [a1, a2].filter(Boolean).join(', ');
                renderAspectIcons(combined, container);
            }
        }

        // Handle Star Wars base aspects
        if (["player-base-aspects-left", "player-base-aspects-right"].includes(key)) {
            const side = key.includes('left') ? 'left' : 'right';
            const container = document.getElementById(`swu-base-aspects-${side}`);
            if (container) {
                renderAspectIcons(value, container);
            }
            lastState[key] = value;
        }

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

            // Auto-scale riftbound text after updates
            if (['player-name-left', 'player-name-right'].includes(key)) {
                autoScaleRiftboundNames();
            }
            if (['player-record-left', 'player-record-right'].includes(key)) {
                autoScaleRiftboundRecords();
            }
            if (['player-life-left', 'player-life-right'].includes(key)) {
                autoScaleRiftboundPoints();
            }
            if (['player-legend-left', 'player-legend-right',
                 'player-champion-left', 'player-champion-right',
                 'player-battlefield-left', 'player-battlefield-right'].includes(key)) {
                autoScaleRiftboundDetails();
            }

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

            // Handle Star Wars wins display with pip images (block/none like Riftbound)
            const starwarsContainer = document.getElementById('scoreboard-starwars');
            if (starwarsContainer) {
                const swuSide = key === 'player-wins-left' ? 'left' : 'right';
                const swuPip1 = starwarsContainer.querySelector(`#swu-wins-${swuSide}-1`);
                const swuPip2 = starwarsContainer.querySelector(`#swu-wins-${swuSide}-2`);
                if (swuPip1 && swuPip2) {
                    if (value > 1) {
                        swuPip1.style.display = 'block';
                        swuPip2.style.display = 'block';
                    } else if (value > 0) {
                        swuPip1.style.display = 'block';
                        swuPip2.style.display = 'none';
                    } else {
                        swuPip1.style.display = 'none';
                        swuPip2.style.display = 'none';
                    }
                }
            }
        } else if (["player-mana-symbols-left", "player-mana-symbols-right"].includes(key)) {
            if (key === 'player-mana-symbols-left') {
                renderManaSymbols(value, 'player-mana-symbols-left-symbols');
            }
            if (key === 'player-mana-symbols-right') {
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
if (isBroadcastMode) {
    // Broadcast mode: request current broadcast data
    socket.emit('get-broadcast-scoreboard-data');
    socket.emit('getArchetypeList');

    // Listen for round_id from broadcast tracker
    socket.on('broadcast-scoreboard-round-id', ({ round_id: rid }) => {
        round_id = rid;
        // Re-request timer and scoreboard state now that we know round_id
        socket.emit('get-all-timer-states');
        socket.emit('get-scoreboard-state');
    });

    // Listen for broadcast-round-data
    socket.on('broadcast-round-data', (data) => {
        if (data[match_id]) {
            updateState(data[match_id]);
        }
    });
} else {
    // Control mode: original behavior
    socket.emit('getSavedControlState', {control_id});
    socket.emit('getArchetypeList');

    socket.on('scoreboard-' + control_id + '-saved-state', (data) => {
        try {
            archetypeList = data['archetypeList'];
            round_id = data['round_id'];
            match_id = data['match_id'];
            updateState(data['data']);
        } catch (e) {
            console.error('Error in saved-state handler:', e);
        }
    });
}

socket.on('overlayHeaderBackgroundUpdate', (newImageUrl) => {
    const last = lastState['header-background'];
    if (last !== newImageUrl) {
        const cacheBuster = new Date().getTime();
        const el = document.querySelector(`#scoreboard-${currentGame} .header .background`);
        if (el) el.style.backgroundImage = `url(${newImageUrl}?v=${cacheBuster})`;
        lastState['header-background'] = newImageUrl;
    }
});

socket.on('overlayFooterBackgroundUpdate', (newImageUrl) => {
    const last = lastState['footer-background'];
    if (last !== newImageUrl) {
        const cacheBuster = new Date().getTime();
        const el = document.querySelector(`#scoreboard-${currentGame} .footer .background`);
        if (el) el.style.backgroundImage = `url(${newImageUrl}?v=${cacheBuster})`;
        lastState['footer-background'] = newImageUrl;
    }
});

socket.on('archetypeListUpdated', (archetypes) => {
    archetypeList = archetypes;
    if (!isBroadcastMode) {
        socket.emit('getSavedControlState', {control_id});
    }
});

// TIMER
socket.emit('get-all-timer-states');

socket.on('current-all-timer-states', ({timerState}) => {
    if (!round_id) return; // Not ready yet in broadcast mode
    const matchState = timerState[round_id]?.[match_id];
    if (matchState) {
        // For count up mode, always show the time (never show TURNS)
        // For count down mode, show TURNS when time reaches 0
        const timerText = matchState.countUp
            ? formatTime(matchState.time)
            : (matchState.time > 0 ? formatTime(matchState.time) : `TURN ${matchState.turnCount ?? 0}`);
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
                const root = document.documentElement;
                const maxFont = parseInt(getComputedStyle(root).getPropertyValue('--rb-timer-font-size') || '36', 10);
                const maxWidth = parseInt(getComputedStyle(root).getPropertyValue('--rb-timer-max-width') || '140', 10);
                autoScaleText(riftboundTimer, maxFont, 20, maxWidth);
            }
        }

        // Update Vibes timer
        const vibesContainer = document.getElementById('scoreboard-vibes');
        if (vibesContainer) {
            const vibesTimer = vibesContainer.querySelector('#timer');
            if (vibesTimer) {
                vibesTimer.innerText = timerText;
                vibesTimer.style.display = shouldShow ? 'block' : 'none';
            }
        }

        // Update Star Wars timer
        const starwarsContainer = document.getElementById('scoreboard-starwars');
        if (starwarsContainer) {
            const swuTimer = starwarsContainer.querySelector('#timer');
            if (swuTimer) {
                swuTimer.innerText = timerText;
                swuTimer.style.display = shouldShow ? 'block' : 'none';
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
    const globalData = data.globalData || {};

    const miscText = globalData['global-event-miscellaneous-details'];
    const eventFormatText = globalData['global-event-format'];
    const eventNameText = globalData['global-event-name'];
    const eventRoundText = globalData['global-event-round'];

    if (miscText) updateElementText('miscellaneous-details', miscText);
    if (eventFormatText) updateElementText('event-format', eventFormatText);
    if (eventNameText) {
        updateElementText('event-name', eventNameText);
        // Also update MTG-specific event name element
        const mtgEventName = document.getElementById('mtg-event-name');
        if (mtgEventName) mtgEventName.textContent = eventNameText;
    }
    if (eventRoundText) {
        updateElementText('event-round', eventRoundText);
        // Also update MTG-specific event round element
        const mtgEventRound = document.getElementById('mtg-event-round');
        if (mtgEventRound) mtgEventRound.textContent = eventRoundText;
    }
});

// SCOREBOARD STATE DATA

// call for scoreboard state - for now its wins show check
socket.emit('get-scoreboard-state');

// Listen for updated scoreboard state from server
socket.on('scoreboard-state-data', ({scoreboardState}) => {
    if (!round_id) return; // Not ready yet in broadcast mode
    const matchState = scoreboardState[round_id]?.[match_id];
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
function updateTheme(game, vendor, playerCount) {
    const normalized = game?.toLowerCase();
    if (!normalized) return;

    // --- Game switch (only when game actually changes) ---
    if (normalized !== selectedGame) {
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
    const vibesScoreboard = document.getElementById('scoreboard-vibes');
    const starwarsScoreboard = document.getElementById('scoreboard-starwars');

    if (selectedGame === 'mtg') {
        console.log('Switching scoreboard to MTG mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'block';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
        if (vibesScoreboard) vibesScoreboard.style.display = 'none';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'none';
    } else if (selectedGame === 'riftbound') {
        console.log('Switching scoreboard to Riftbound mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'block';
        if (vibesScoreboard) vibesScoreboard.style.display = 'none';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'none';
        
        // Apply battlefield images - always set a background (use default if empty or not found)
        const riftboundContainer = document.getElementById('scoreboard-riftbound');
        if (riftboundContainer) {
            const battlefieldLeftEl = riftboundContainer.querySelector('#player-battlefield-left');
            const battlefieldRightEl = riftboundContainer.querySelector('#player-battlefield-right');
            
            if (battlefieldLeftEl) {
                const battlefieldName = battlefieldLeftEl.textContent ? battlefieldLeftEl.textContent.trim() : '';
                let battlefieldData = null;
                
                if (battlefieldName) {
                    // Try exact match first
                    battlefieldData = RIFTBOUND_BATTLEFIELDS[battlefieldName];
                    
                    // If no exact match, try case-insensitive match
                    if (!battlefieldData) {
                        const battlefieldNameLower = battlefieldName.toLowerCase();
                        for (const key in RIFTBOUND_BATTLEFIELDS) {
                            if (key.toLowerCase() === battlefieldNameLower) {
                                battlefieldData = RIFTBOUND_BATTLEFIELDS[key];
                                break;
                            }
                        }
                    }
                }
                
                const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-battlefield-background.riftbound-player-battlefield-background-left');
                if (backgroundDiv) {
                    let imageUrl;
                    if (battlefieldData && battlefieldData.left) {
                        imageUrl = battlefieldData.left;
                    } else {
                        imageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT.left;
                    }
                    const encodedUrl = encodeURI(imageUrl);
                    const cacheBuster = new Date().getTime();
                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                    backgroundDiv.style.backgroundSize = '';
                    backgroundDiv.style.backgroundPosition = '';
                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                    backgroundDiv.style.display = 'block';
                    lastState['battlefield-left'] = imageUrl;
                }
            }
            
            if (battlefieldRightEl) {
                const battlefieldName = battlefieldRightEl.textContent ? battlefieldRightEl.textContent.trim() : '';
                let battlefieldData = null;
                
                if (battlefieldName) {
                    // Try exact match first
                    battlefieldData = RIFTBOUND_BATTLEFIELDS[battlefieldName];
                    
                    // If no exact match, try case-insensitive match
                    if (!battlefieldData) {
                        const battlefieldNameLower = battlefieldName.toLowerCase();
                        for (const key in RIFTBOUND_BATTLEFIELDS) {
                            if (key.toLowerCase() === battlefieldNameLower) {
                                battlefieldData = RIFTBOUND_BATTLEFIELDS[key];
                                break;
                            }
                        }
                    }
                }
                
                const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-battlefield-background.riftbound-player-battlefield-background-right');
                if (backgroundDiv) {
                    let imageUrl;
                    if (battlefieldData && battlefieldData.right) {
                        imageUrl = battlefieldData.right;
                    } else {
                        imageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT.right;
                    }
                    const encodedUrl = encodeURI(imageUrl);
                    const cacheBuster = new Date().getTime();
                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                    backgroundDiv.style.backgroundSize = '';
                    backgroundDiv.style.backgroundPosition = '';
                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                    backgroundDiv.style.display = 'block';
                    lastState['battlefield-right'] = imageUrl;
                }
            }
            
            // Apply legend images - always set a background (use default if empty)
            const legendLeftEl = riftboundContainer.querySelector('#player-legend-left');
            const legendRightEl = riftboundContainer.querySelector('#player-legend-right');
            
            if (legendLeftEl) {
                const legendValue = legendLeftEl.textContent ? legendLeftEl.textContent.trim().toLowerCase() : '';
                let matchedLegendKey = null;
                
                if (legendValue) {
                    // First try exact case-insensitive match
                    for (const legendKey in RIFTBOUND_LEGENDS) {
                        if (legendKey.toLowerCase() === legendValue) {
                            matchedLegendKey = legendKey;
                            break;
                        }
                    }
                    
                    // If no exact match, check if the value contains any of the legend dictionary keys
                    if (!matchedLegendKey) {
                        for (const legendKey in RIFTBOUND_LEGENDS) {
                            if (legendValue.includes(legendKey.toLowerCase())) {
                                matchedLegendKey = legendKey;
                                break;
                            }
                        }
                    }
                }
                
                const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-legend-background.riftbound-player-legend-background-left');
                if (backgroundDiv) {
                    let imageUrl;
                    if (matchedLegendKey) {
                        const legendData = RIFTBOUND_LEGENDS[matchedLegendKey];
                        imageUrl = legendData && legendData.left ? legendData.left : RIFTBOUND_LEGENDS_DEFAULT.left;
                    } else {
                        imageUrl = RIFTBOUND_LEGENDS_DEFAULT.left;
                    }
                    const encodedUrl = encodeURI(imageUrl);
                    const cacheBuster = new Date().getTime();
                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                    backgroundDiv.style.backgroundSize = '';
                    backgroundDiv.style.backgroundPosition = '';
                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                    backgroundDiv.style.display = 'block';
                    lastState['legend-left'] = imageUrl;
                }
            }
            
            if (legendRightEl) {
                const legendValue = legendRightEl.textContent ? legendRightEl.textContent.trim().toLowerCase() : '';
                let matchedLegendKey = null;
                
                if (legendValue) {
                    // First try exact case-insensitive match
                    for (const legendKey in RIFTBOUND_LEGENDS) {
                        if (legendKey.toLowerCase() === legendValue) {
                            matchedLegendKey = legendKey;
                            break;
                        }
                    }
                    
                    // If no exact match, check if the value contains any of the legend dictionary keys
                    if (!matchedLegendKey) {
                        for (const legendKey in RIFTBOUND_LEGENDS) {
                            if (legendValue.includes(legendKey.toLowerCase())) {
                                matchedLegendKey = legendKey;
                                break;
                            }
                        }
                    }
                }
                
                const backgroundDiv = riftboundContainer.querySelector('.riftbound-player-legend-background.riftbound-player-legend-background-right');
                if (backgroundDiv) {
                    let imageUrl;
                    if (matchedLegendKey) {
                        const legendData = RIFTBOUND_LEGENDS[matchedLegendKey];
                        imageUrl = legendData && legendData.right ? legendData.right : RIFTBOUND_LEGENDS_DEFAULT.right;
                    } else {
                        imageUrl = RIFTBOUND_LEGENDS_DEFAULT.right;
                    }
                    const encodedUrl = encodeURI(imageUrl);
                    const cacheBuster = new Date().getTime();
                    const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                    backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                    backgroundDiv.style.backgroundSize = '';
                    backgroundDiv.style.backgroundPosition = '';
                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                    backgroundDiv.style.display = 'block';
                    lastState['legend-right'] = imageUrl;
                }
            }
        }
    } else if (selectedGame === 'vibes') {
        console.log('Scoreboard switching to Vibes mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
        if (vibesScoreboard) vibesScoreboard.style.display = 'block';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'none';
    } else if (selectedGame === 'starwars') {
        console.log('Switching scoreboard to Star Wars mode...');
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
        if (vibesScoreboard) vibesScoreboard.style.display = 'none';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'block';
    } else {
        // Default: hide all if unknown game type
        if (mtgScoreboard) mtgScoreboard.style.display = 'none';
        if (riftboundScoreboard) riftboundScoreboard.style.display = 'none';
        if (vibesScoreboard) vibesScoreboard.style.display = 'none';
        if (starwarsScoreboard) starwarsScoreboard.style.display = 'none';
    }
    } // end game-switch block

    // --- Vendor overrides (always run) ---
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        // Clear all previous vendor overrides so defaults kick in
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
        // Apply new vendor overrides
        const overrides = vc.getOverrides(normalized, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });

        // Update scoreboard frame — try mp4 first, fallback to PNG
        const frameSelectors = {
            mtg: '#scoreboard-mtg .mtg-frame',
            riftbound: '#scoreboard-riftbound .riftbound-frame',
            vibes: '#scoreboard-vibes .vibes-frame',
            starwars: '#scoreboard-starwars .starwars-frame',
        };
        const frameSelector = frameSelectors[normalized];
        if (frameSelector) {
            const frameEl = document.querySelector(frameSelector);
            if (frameEl) {
                const framePath = vc.getAssetPath(`/assets/images/${normalized}/scoreboard/frame/${normalized}-scoreboard-frame.png`, vendor, playerCount);
                frameEl.style.backgroundImage = `url("${framePath}")`;
            }
        }

        // Riftbound: try animated mp4 frame, fallback to PNG
        if (normalized === 'riftbound') {
            const v = vendor || 'default';
            const p = playerCount || '1v1';
            const videoEl = document.getElementById('riftbound-frame-video');
            const bgVideoContainer = document.querySelector('#scoreboard-riftbound .riftbound-bg-video');
            if (videoEl && bgVideoContainer) {
                const mp4Path = `/assets/animations/riftbound/scoreboard/frame/riftbound-scoreboard-frame-${v}-${p}.mp4`;
                const maskPath = `/assets/animations/riftbound/scoreboard/frame/riftbound-scoreboard-frame-${v}-${p}-mask.png`;
                videoEl.oncanplay = () => {
                    bgVideoContainer.style.display = 'block';
                    bgVideoContainer.style.webkitMaskImage = `url("${maskPath}")`;
                    bgVideoContainer.style.maskImage = `url("${maskPath}")`;
                };
                videoEl.onerror = () => {
                    bgVideoContainer.style.display = 'none';
                };
                videoEl.src = mp4Path;
            }

            // Set riftbound pip images dynamically based on vendor + playerCount
            const leftPipPath = `/assets/images/riftbound/scoreboard/pips/scoreboard-pips-${v}-${p}-left.png`;
            const rightPipPath = `/assets/images/riftbound/scoreboard/pips/scoreboard-pips-${v}-${p}-right.png`;
            document.documentElement.style.setProperty('--rb-pip-left-url', `url("${leftPipPath}")`);
            document.documentElement.style.setProperty('--rb-pip-right-url', `url("${rightPipPath}")`);

            // Re-scale names/details after vendor switch (font size limits may have changed)
            autoScaleRiftboundNames();
            autoScaleRiftboundDetails();
            autoScaleRiftboundRecords();
            autoScaleRiftboundPoints();
        }
    }
}

socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('starwars-get-leaders-and-bases');

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

socket.on('starwars-leaders-and-bases', ({ leaders, bases }) => {
    leaders.forEach(l => { SWU_LEADERS[l.name] = l.image; });
    bases.forEach(b => { SWU_BASES[b.name] = b.image; });
});

// end game selection logic

// ─── Card View Overlay on Scoreboard ───
// card-id 1 = left, card-id 2 = right
const CARD_VIEW_EVENTS = [
    'card-view-card-selected',
    'vibes-card-view-card-selected',
    'riftbound-card-view-card-selected',
    'starwars-card-view-card-selected'
];

// Elements to hide per side when card overlay is shown (Star Wars)
const SWU_LEADER_BASE_CLASSES = [
    'swu-leader-name', 'swu-leader-image',
    'swu-base-name', 'swu-base-image'
];

function setSwuOverlayVisibility(side, visible) {
    const display = visible ? '' : 'none';
    for (const cls of SWU_LEADER_BASE_CLASSES) {
        const el = document.querySelector(`#scoreboard-starwars .${cls}-${side}`);
        if (el) el.style.display = display;
    }
}

function handleCardViewOnScoreboard(data) {
    console.log('[CardView] received:', data, 'currentGame:', currentGame);
    const side = data['card-id']?.toString() === '1' ? 'left' : 'right';

    // Determine overlay prefix based on current game
    const prefix = currentGame === 'riftbound' ? 'riftbound' : 'swu';
    const overlay = document.getElementById(`${prefix}-card-overlay-${side}`);
    const img = document.getElementById(`${prefix}-card-overlay-img-${side}`);
    console.log('[CardView] prefix:', prefix, 'overlay:', overlay, 'img:', img);
    if (!overlay || !img) return;

    if (data.url) {
        img.src = data.url;
        overlay.style.display = 'block';
        // Star Wars: hide leader/base underneath
        if (currentGame === 'starwars') {
            setSwuOverlayVisibility(side, false);
        }
    } else {
        // Reset: show card back for riftbound, hide overlay for others
        if (currentGame === 'riftbound') {
            img.src = '/assets/images/riftbound/cards/riftbound-card-back.jpg';
        } else {
            img.src = '';
            overlay.style.display = 'none';
            if (currentGame === 'starwars') {
                setSwuOverlayVisibility(side, true);
            }
        }
    }
}

CARD_VIEW_EVENTS.forEach(event => {
    socket.on(event, handleCardViewOnScoreboard);
});

