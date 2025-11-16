// animation-display.js - Riftbound Animation Display

const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);

// Get URL parameters
const pathSegments = window.location.pathname.split('/');
const orientation = pathSegments[pathSegments.length - 3]; // portrait or landscape
const side = pathSegments[pathSegments.length - 2]; // left or right
const control_id = pathSegments[pathSegments.length - 1]; // control ID (1-4)

// Normalize side parameter
const normalizedSide = side?.toLowerCase() === 'right' ? 'right' : 'left';

let selectedGame = '';
let currentLegend = '';
let lastControlData = null; // Store last received control data

// Riftbound Legends Animation Dictionary
// Maps legend simplified names to their animation file paths
// L = Landscape, P = Portrait
const RIFTBOUND_LEGEND_ANIMATIONS = {
    'Kai\'sa': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0001_P_Kai_sa, Daughter of the Void.mp4.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0001_L_Kai_sa, Daughter of the Void.mp4.mp4'
    },
    'Volibear': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0002_P_Volibear, Relentless Storm.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0002_L_Volibear, Relentless Storm.mp4'
    },
    'Viktor': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0004_P_Viktor, Herald of the Arcane.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0004_L_Viktor, Herald of the Arcane.mp4.mp4'
    },
    'Leona': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0006_P_Leona, Radiant Dawn.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0006_L_Leona, Radiant Dawn.mp4.mp4'
    },
    'Lee Sin': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0008_P_Lee Sin, Blind Monk.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0008_L_Lee Sin, Blind Monk.mp4'
    },
    'Ahri': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0009_P_Ahri, Nine-Tailed Fox.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0009_L_Ahri, Nine-Tailed Fox.mp4'
    },
    'Darius': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0010_P_Darius, Hand of Noxus.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0010_L_Darius, Hand of Noxus.mp4'
    },
    'Jinx': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0011_P_Jinx, Loose Cannon.mp4.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0011_L_Jinx, Loose Cannon.mp4'
    },
    'Miss Fortune': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0012_P_Miss Fortune, Bounty Hunter.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0012_L_Miss Fortune, Bounty Hunter.mp4'
    },
    'Garen': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0013_P_Garen, Might of Demacia.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0013_L_Garen, Might of Demacia.mp4'
    },
    'Lux': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0014_P_Lux, Lady of Luminosity.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0014_L_Lux, Lady of Luminosity.mp4'
    }
};

// Get DOM elements
const animationVideo = document.getElementById('animation-video');
const animationContainer = document.getElementById('animation-container');

// Normalize orientation parameter
const normalizedOrientation = orientation?.toLowerCase() === 'portrait' ? 'portrait' : 'landscape';

console.log('Animation Display initialized');
console.log('Control ID:', control_id);
console.log('Orientation:', normalizedOrientation);
console.log('Side:', normalizedSide);

// Function to find legend key from value (similar to scoreboard logic)
function findLegendKey(legendValue) {
    if (!legendValue) return null;
    
    const legendValueLower = legendValue.trim().toLowerCase();
    
    // First try exact case-insensitive match
    for (const legendKey in RIFTBOUND_LEGEND_ANIMATIONS) {
        if (legendKey.toLowerCase() === legendValueLower) {
            return legendKey;
        }
    }
    
    // If no exact match, check if the value contains any of the legend dictionary keys
    // This handles cases like "Jinx, Loose Cannon" matching "Jinx"
    for (const legendKey in RIFTBOUND_LEGEND_ANIMATIONS) {
        const legendKeyLower = legendKey.toLowerCase();
        if (legendValueLower.includes(legendKeyLower)) {
            return legendKey;
        }
    }
    
    return null;
}

// Function to update animation based on legend
function updateAnimation(legendValue) {
    const legendKey = findLegendKey(legendValue);
    
    if (!legendKey) {
        console.log('No legend match found for:', legendValue);
        hideAnimation();
        return;
    }
    
    const animationData = RIFTBOUND_LEGEND_ANIMATIONS[legendKey];
    if (!animationData) {
        console.log('No animation data found for legend:', legendKey);
        hideAnimation();
        return;
    }
    
    const animationPath = animationData[normalizedOrientation];
    if (!animationPath) {
        console.log('No animation path found for orientation:', normalizedOrientation);
        hideAnimation();
        return;
    }
    
    // Only update if legend changed
    if (currentLegend === legendKey) {
        return;
    }
    
    currentLegend = legendKey;
    console.log('Updating animation:', animationPath);
    
    // Set video source - properly encode the URL to handle spaces and special characters
    // Split path and encode each segment separately to handle commas and spaces properly
    const pathParts = animationPath.split('/');
    const encodedParts = pathParts.map((part, index) => {
        // Don't encode the first empty string (leading slash)
        if (index === 0 && part === '') return '';
        // Encode each path segment
        return encodeURIComponent(part);
    });
    const encodedPath = encodedParts.join('/');
    console.log('Encoded path:', encodedPath);
    animationVideo.src = encodedPath;
    animationVideo.load();
    
    // Show video
    animationVideo.classList.add('active');
    
    // Play video
    animationVideo.play().catch(err => {
        console.error('Error playing video:', err);
    });
}

// Function to hide animation
function hideAnimation() {
    animationVideo.classList.remove('active');
    animationVideo.pause();
    currentLegend = '';
}

// Function to handle game selection update
function handleGameSelectionUpdate(gameSelection) {
    const normalized = gameSelection?.toLowerCase();
    if (normalized === selectedGame) return;
    
    selectedGame = normalized;
    console.log('Game selection updated:', selectedGame);
    
    // If game type is not riftbound, hide animation
    if (selectedGame !== 'riftbound') {
        hideAnimation();
    } else {
        // If game type changed to riftbound, reprocess the last control data
        if (lastControlData) {
            console.log('Game changed to riftbound, reprocessing control data');
            processControlData(lastControlData);
        }
    }
}

// Function to process control data
function processControlData(data) {
    if (!data) {
        console.log('No control data received');
        return;
    }
    
    // Store the control data for later reprocessing
    lastControlData = data;
    
    console.log('Processing control data:', data);
    
    // Check if game type is riftbound
    const gameSelection = data['game-selection'];
    if (gameSelection) {
        handleGameSelectionUpdate(gameSelection);
    }
    
    // Only proceed if game type is riftbound
    if (selectedGame !== 'riftbound') {
        hideAnimation();
        return;
    }
    
    // Get legend value from control data based on the side parameter
    const legendKey = `player-legend-${normalizedSide}`;
    let legendValue = data[legendKey];
    
    if (legendValue) {
        console.log(`Legend value for ${normalizedSide} side:`, legendValue);
        updateAnimation(legendValue);
    } else {
        console.log(`No legend value found in control data for ${normalizedSide} side (key: ${legendKey})`);
        hideAnimation();
    }
}

// INITIAL STATE - Request control data
console.log('Requesting control data for control ID:', control_id);
socket.emit('getSavedControlState', {control_id: control_id});

// Listen for saved state from server
socket.on('scoreboard-' + control_id + '-saved-state', (data) => {
    console.log('Received saved state from server:', data);
    if (data && data.data) {
        processControlData(data.data);
    }
});

// Listen for game selection updates
socket.emit('get-game-selection');

socket.on('game-selection-updated', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
});

socket.on('server-current-game-selection', ({gameSelection}) => {
    handleGameSelectionUpdate(gameSelection);
});

// Handle video errors
animationVideo.addEventListener('error', (e) => {
    console.error('Video error:', e);
    console.error('Video src:', animationVideo.src);
    hideAnimation();
});

// Handle video load
animationVideo.addEventListener('loadeddata', () => {
    console.log('Video loaded successfully:', animationVideo.src);
});

