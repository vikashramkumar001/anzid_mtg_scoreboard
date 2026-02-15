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
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

// Star Wars Unlimited Aspects Dictionary
const SWU_ASPECTS = {
    'aggression': '/assets/images/starwars/scoreboard/icons/Aggression.png',
    'command': '/assets/images/starwars/scoreboard/icons/Command.png',
    'cunning': '/assets/images/starwars/scoreboard/icons/Cunning.png',
    'heroism': '/assets/images/starwars/scoreboard/icons/Heroism.png',
    'vigilance': '/assets/images/starwars/scoreboard/icons/Vigilance.png',
    'villainy': '/assets/images/starwars/scoreboard/icons/Villainy.png'
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
    // Partial match (value contains key)
    for (const key in dict) {
        if (nameLower.includes(key.toLowerCase())) return key;
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
// Default image is used as fallback when a battlefield is not found or empty
const RIFTBOUND_BATTLEFIELDS_DEFAULT = {
    left: '/assets/images/riftbound/battlefields/_0000_Default.png',
    right: '/assets/images/riftbound/battlefields/_0000_Default.png'
};

const RIFTBOUND_BATTLEFIELDS = {
    'default': {
        left: '/assets/images/riftbound/battlefields/_0000_Default180.png',
        right: '/assets/images/riftbound/battlefields/_0000_Default.png'
    },
    'Altar to Unity': {
        left: '/assets/images/riftbound/battlefields/_0000_Altar-to-Unity180.png',
        right: '/assets/images/riftbound/battlefields/_0024_Altar-to-Unity.png'
    },
    'Aspirant\'s Climb': {
        left: '/assets/images/riftbound/battlefields/_0001_Aspirant_s-Climb180.png',
        right: '/assets/images/riftbound/battlefields/_0025_Aspirant_s-Climb.png'
    },
    'Back Alley Bar': {
        left: '/assets/images/riftbound/battlefields/_0002_Back-Alley-Bar180.png',
        right: '/assets/images/riftbound/battlefields/_0026_Back-Alley-Bar.png'
    },
    'Bandle Tree': {
        left: '/assets/images/riftbound/battlefields/_0003_Bandle-Tree180.png',
        right: '/assets/images/riftbound/battlefields/_0027_Bandle-Tree.png'
    },
    'Fortified Position': {
        left: '/assets/images/riftbound/battlefields/_0004_Fortified-Position180.png',
        right: '/assets/images/riftbound/battlefields/_0028_Fortified-Position.png'
    },
    'Grove of the God Willow': {
        left: '/assets/images/riftbound/battlefields/_0005_Grove-of-the-God-Willow180.png',
        right: '/assets/images/riftbound/battlefields/_0029_Grove-of-the-God-Willow.png'
    },
    'Hallowed Tomb': {
        left: '/assets/images/riftbound/battlefields/_0006_Hallowed-Tomb180.png',
        right: '/assets/images/riftbound/battlefields/_0030_Hallowed-Tomb.png'
    },
    'Monastery of Hirana': {
        left: '/assets/images/riftbound/battlefields/_0007_Monastery-of-Hirana180.png',
        right: '/assets/images/riftbound/battlefields/_0031_Monastery-of-Hirana.png'
    },
    'Navori Fighting Pit': {
        left: '/assets/images/riftbound/battlefields/_0008_Navori-Fighting-Pit180.png',
        right: '/assets/images/riftbound/battlefields/_0032_Navori-Fighting-Pit.png'
    },
    'Obelisk of Power': {
        left: '/assets/images/riftbound/battlefields/_0009_Obelisk-of-Power180.png',
        right: '/assets/images/riftbound/battlefields/_0033_Obelisk-of-Power.png'
    },
    'Reaver\'s Row': {
        left: '/assets/images/riftbound/battlefields/_0010_Reaver_s-Row180.png',
        right: '/assets/images/riftbound/battlefields/_0034_Reaver_s-Row.png'
    },
    'Reckoner\'s Arena': {
        left: '/assets/images/riftbound/battlefields/_0011_Reckoner_s-Arena180.png',
        right: '/assets/images/riftbound/battlefields/_0035_Reckoner_s-Arena.png'
    },
    'Sigil of the Storm': {
        left: '/assets/images/riftbound/battlefields/_0012_Sigil-of-the-Storm180.png',
        right: '/assets/images/riftbound/battlefields/_0036_Sigil-of-the-Storm.png'
    },
    'Startipped Peak': {
        left: '/assets/images/riftbound/battlefields/_0013_Startipped-Peak180.png',
        right: '/assets/images/riftbound/battlefields/_0037_Startipped-Peak.png'
    },
    'Targon\'s Peak': {
        left: '/assets/images/riftbound/battlefields/_0014_Targon_s-Peak180.png',
        right: '/assets/images/riftbound/battlefields/_0038_Targon_s-Peak.png'
    },
    'The Arena\'s Greatest': {
        left: '/assets/images/riftbound/battlefields/_0015_The-Arena_s-Greatest180.png',
        right: '/assets/images/riftbound/battlefields/_0039_The-Arena_s-Greatest.png'
    },
    'The Dreaming Tree': {
        left: '/assets/images/riftbound/battlefields/_0016_The-Dreaming-Tree180.png',
        right: '/assets/images/riftbound/battlefields/_0040_The-Dreaming-Tree.png'
    },
    'The Grand Plaza': {
        left: '/assets/images/riftbound/battlefields/_0017_The-Grand-Plaza180.png',
        right: '/assets/images/riftbound/battlefields/_0041_The-Grand-Plaza.png'
    },
    'Trifarian War Camp': {
        left: '/assets/images/riftbound/battlefields/_0018_Trifarian-War-Camp180.png',
        right: '/assets/images/riftbound/battlefields/_0042_Trifarian-War-Camp.png'
    },
    'Vilemaw\'s Lair': {
        left: '/assets/images/riftbound/battlefields/_0019_Vilemaw_s-Lair180.png',
        right: '/assets/images/riftbound/battlefields/_0043_Vilemaw_s-Lair.png'
    },
    'Void Gate': {
        left: '/assets/images/riftbound/battlefields/_0020_Void-Gate180.png',
        right: '/assets/images/riftbound/battlefields/_0044_Void-Gate.png'
    },
    'Windswept Hillock': {
        left: '/assets/images/riftbound/battlefields/_0021_Windswept-Hillock180.png',
        right: '/assets/images/riftbound/battlefields/_0045_Windswept-Hillock.png'
    },
    'Zaun Warrens': {
        left: '/assets/images/riftbound/battlefields/_0022_Zaun-Warrens180.png',
        right: '/assets/images/riftbound/battlefields/_0046_Zaun-Warrens.png'
    },
    'The Candlelit Sanctum': {
        left: '/assets/images/riftbound/battlefields/_0023_The-Candlelit-Sanctum180.png',
        right: '/assets/images/riftbound/battlefields/_0047_The-Candlelit-Sanctum.png'
    }
};

// Riftbound Legends Dictionary
// Maps legend names to their left and right side image URLs
// Files with "_F_" are for right side, files without "_F_" are for left side
// Default images are used as fallback when a legend is not found
const RIFTBOUND_LEGENDS_DEFAULT = {
    left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0000_Default.png',
    right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0000_F_Default.png'
};

const RIFTBOUND_LEGENDS = {
    'Kai\'sa': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0001_Kaisa, Daughter of the Void.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0001_F_Kaisa, Daughter of the Void.png'
    },
    'Volibear': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0002_Volibear, Relentless Storm.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0002_F_Volibear, Relentless Storm.png'
    },
    'Sett': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0003_Sett, The Boss.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0003_F_Sett, The Boss.png'
    },
    'Viktor': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0004_Viktor, Herald of the Arcane.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0004_F_Viktor, Herald of the Arcane.png'
    },
    'Teemo': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0005_Teemo, Swift Scout.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0005_F_Teemo, Swift Scout.png'
    },
    'Leona': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0006_Leona, Radiant Dawn.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0006_F_Leona, Radiant Dawn.png'
    },
    'Yasuo': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0007_Yasuo, Unforgiven.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0007_F_Yasuo, Unforgiven.png'
    },
    'Yas': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0007_Yasuo, Unforgiven.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0007_F_Yasuo, Unforgiven.png'
    },
    'Lee Sin': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0008_Lee Sin, Blind Monk.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0008_F_Lee Sin, Blind Monk.png'
    },
    'Ahri': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0009_Ahri, Nine-Tailed Fox.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0009_F_Ahri, Nine-Tailed Fox.png'
    },
    'Darius': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0010_Darius, Hand of Noxus.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0010_F_Darius, Hand of Noxus.png'
    },
    'Jinx': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0011_Jinx, Loose Cannon.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0011_F_Jinx, Loose Cannon.png'
    },
    'Miss Fortune': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0012_Miss Fortune, Bounty Hunter.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0012_F_Miss Fortune, Bounty Hunter.png'
    },
    'Garen': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0013_Garen, Might of Demacia.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0013_F_Garen, Might of Demacia.png'
    },
    'Lux': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0014_Lux, Lady of Luminosity.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0014_F_Lux, Lady of Luminosity.png'
    },
    'Annie': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0015_Annie, Dark Child.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0015_F_Annie, Dark Child.png'
    },
    'Master Yi': {
        left: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0016_Master Yi, Wuju Bladesman.png',
        right: '/assets/images/riftbound/scoreboard/legend-portraits/LegendPortrait_0016_F_Master Yi, Wuju Bladesman.png'
    }
};

// Riftbound Runes Dictionary
// Maps rune letters to their icon image URLs
// COMMENTED OUT FOR LATER USE - Not currently displayed in scoreboard
/*
const RIFTBOUND_RUNES = {
    'g': '/assets/images/riftbound/icons/runes/Calm2.png',
    'p': '/assets/images/riftbound/icons/runes/Chaos2.png',
    'r': '/assets/images/riftbound/icons/runes/Fury2.png',
    'b': '/assets/images/riftbound/icons/runes/Mind.png',
    'y': '/assets/images/riftbound/icons/runes/Order2.png',
    'o': '/assets/images/riftbound/icons/runes/Body2.png'
};
*/

console.log('from url - control id', control_id);

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
            starwarsEl.innerHTML = value;
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
    console.log('updateState called with keys:', Object.keys(data));
    Object.entries(data).forEach(([key, value]) => {
        if (key.includes('legend')) {
            console.log(`Found legend-related key: ${key} = ${value}`);
        }
        // COMMENTED OUT FOR LATER USE - Runes logic not currently displayed in scoreboard
        // Handle runes first (before general element handling)
        /*
        if (["player-runes-left", "player-runes-right"].includes(key)) {
            // Handle Riftbound runes display with icons (only update if value changed)
            const side = key === 'player-runes-left' ? 'left' : 'right';
            const currentValue = lastState[`runes-value-${side}`];
            const newValue = value ? value.trim().toLowerCase() : '';
            
            // Only update if the value actually changed
            if (currentValue !== newValue) {
                const riftboundContainer = document.getElementById('scoreboard-riftbound');
                if (riftboundContainer) {
                    const runesContainer = riftboundContainer.querySelector(`#player-runes-${side}`);
                    
                    if (runesContainer) {
                        // Clear existing content
                        runesContainer.innerHTML = '';
                        
                        if (newValue) {
                            // Create icon for each letter in the string
                            for (let i = 0; i < newValue.length; i++) {
                                const letter = newValue[i];
                                const runeUrl = RIFTBOUND_RUNES[letter];
                                
                                if (runeUrl) {
                                    const img = document.createElement('img');
                                    img.src = runeUrl;
                                    img.alt = `Rune ${letter}`;
                                    img.className = 'riftbound-rune-icon';
                                    runesContainer.appendChild(img);
                                }
                            }
                        }
                        
                        // Update the stored value
                        lastState[`runes-value-${side}`] = newValue;
                    }
                }
            }
            return; // Exit early for runes
        }
        */
        
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
                    
                    if (!backgroundDiv) {
                        console.log(`Background div not found for ${side}`);
                    }
                    
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
                                    backgroundDiv.style.backgroundSize = 'cover';
                                    backgroundDiv.style.backgroundPosition = 'center';
                                    backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                    backgroundDiv.style.display = 'block';
                                    lastState[`legend-${side}`] = imageUrl;
                                    lastState[`legend-value-${side}`] = newValue;
                                    console.log(`Legend background set for ${side}: ${matchedLegendKey} -> ${imageUrl}`);
                                    console.log(`Final URL: ${finalUrl}`);
                                    console.log(`Background div computed style:`, window.getComputedStyle(backgroundDiv).backgroundImage);
                                } else {
                                    console.log(`Legend data found but no ${side} image for: ${matchedLegendKey}`);
                                }
                            } else {
                                // Use default images if legend name doesn't match
                                console.log(`No legend match found for: ${newValue}, using default`);
                                const defaultImageUrl = RIFTBOUND_LEGENDS_DEFAULT[side];
                                const encodedUrl = encodeURI(defaultImageUrl);
                                const cacheBuster = new Date().getTime();
                                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                backgroundDiv.style.backgroundSize = 'cover';
                                backgroundDiv.style.backgroundPosition = 'center';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                backgroundDiv.style.display = 'block';
                                lastState[`legend-${side}`] = defaultImageUrl;
                                lastState[`legend-value-${side}`] = newValue;
                            }
                        } else {
                            // Show default image if value is empty
                            console.log(`Legend value is empty for ${side}, using default`);
                            const defaultImageUrl = RIFTBOUND_LEGENDS_DEFAULT[side];
                            const encodedUrl = encodeURI(defaultImageUrl);
                            const cacheBuster = new Date().getTime();
                            const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                            backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                            backgroundDiv.style.backgroundSize = 'cover';
                            backgroundDiv.style.backgroundPosition = 'center';
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
                                backgroundDiv.style.backgroundSize = 'cover';
                                backgroundDiv.style.backgroundPosition = 'center';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                backgroundDiv.style.display = 'block';
                                lastState[`battlefield-${side}`] = imageUrl;
                                lastState[`battlefield-value-${side}`] = newValue;
                            } else {
                                // Use default image if battlefield name doesn't match
                                console.log(`Battlefield not found for: ${newValue}, using default`);
                                const defaultImageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT[side];
                                const encodedUrl = encodeURI(defaultImageUrl);
                                const cacheBuster = new Date().getTime();
                                const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                                backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                                backgroundDiv.style.backgroundSize = 'cover';
                                backgroundDiv.style.backgroundPosition = 'center';
                                backgroundDiv.style.backgroundRepeat = 'no-repeat';
                                backgroundDiv.style.display = 'block';
                                lastState[`battlefield-${side}`] = defaultImageUrl;
                                lastState[`battlefield-value-${side}`] = newValue;
                            }
                        } else {
                            // Show default image if value is empty
                            console.log(`Battlefield value is empty for ${side}, using default`);
                            const defaultImageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT[side];
                            const encodedUrl = encodeURI(defaultImageUrl);
                            const cacheBuster = new Date().getTime();
                            const finalUrl = `${encodedUrl}?v=${cacheBuster}`;
                            backgroundDiv.style.backgroundImage = `url("${finalUrl}")`;
                            backgroundDiv.style.backgroundSize = 'cover';
                            backgroundDiv.style.backgroundPosition = 'center';
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

        // Handle Star Wars base damage/HP composite display
        if (["player-base-damage-left", "player-base-damage-right", "player-base-hp-left", "player-base-hp-right"].includes(key)) {
            const side = key.includes('left') ? 'left' : 'right';
            // Store the raw value
            lastState[key] = value;
            // Get both values (use stored or default)
            const damage = lastState[`player-base-damage-${side}`] || '0';
            const hp = lastState[`player-base-hp-${side}`] || '30';
            const composite = `${String(damage).padStart(2, '0')}/${hp}`;
            const statsEl = document.getElementById(`swu-base-stats-${side}`);
            if (statsEl) {
                statsEl.textContent = composite;
            }
        }

        // Handle Star Wars leader image lookup
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

            // Handle Star Wars wins display with pip filled toggle
            const starwarsContainer = document.getElementById('scoreboard-starwars');
            if (starwarsContainer) {
                const swuSide = key === 'player-wins-left' ? 'left' : 'right';
                const swuPip1 = starwarsContainer.querySelector(`#swu-wins-${swuSide}-1`);
                const swuPip2 = starwarsContainer.querySelector(`#swu-wins-${swuSide}-2`);
                if (swuPip1 && swuPip2) {
                    swuPip1.classList.toggle('filled', value > 0);
                    swuPip2.classList.toggle('filled', value > 1);
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
        const el = document.querySelector(`#scoreboard-${currentGame} .header .background`);
        if (el) el.style.backgroundImage = `url(${newImageUrl}?v=${cacheBuster})`;
        lastState['header-background'] = newImageUrl;
    }
});

socket.on('overlayFooterBackgroundUpdate', (newImageUrl) => {
    console.log('got footer overlay from server', newImageUrl);
    const last = lastState['footer-background'];
    if (last !== newImageUrl) {
        const cacheBuster = new Date().getTime();
        const el = document.querySelector(`#scoreboard-${currentGame} .footer .background`);
        if (el) el.style.backgroundImage = `url(${newImageUrl}?v=${cacheBuster})`;
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
        // For count up mode, always show the time (never show TURNS)
        // For count down mode, show TURNS when time reaches 0
        const timerText = matchState.countUp
            ? formatTime(matchState.time)
            : (matchState.time > 0 ? formatTime(matchState.time) : 'TURNS');
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

        // Update Vibes timer
        const vibesContainer = document.getElementById('scoreboard-vibes');
        if (vibesContainer) {
            console.log('ping2timer');
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
    console.log('got global event data from server', data);

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
                    backgroundDiv.style.backgroundSize = 'cover';
                    backgroundDiv.style.backgroundPosition = 'center';
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
                    backgroundDiv.style.backgroundSize = 'cover';
                    backgroundDiv.style.backgroundPosition = 'center';
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
                    backgroundDiv.style.backgroundSize = 'cover';
                    backgroundDiv.style.backgroundPosition = 'center';
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
                    backgroundDiv.style.backgroundSize = 'cover';
                    backgroundDiv.style.backgroundPosition = 'center';
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

        // Update scoreboard frame image dynamically
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
    }
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

// end game selection logic
