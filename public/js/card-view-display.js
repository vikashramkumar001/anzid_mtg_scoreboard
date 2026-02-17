const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);

// Game-specific configuration
const GAME_CONFIG = {
    mtg: {
        event: 'card-view-card-selected',
        fallback: '/assets/images/mtg/cards/magic-card-back.jpg',
        bodyClass: 'game-mtg',
        checksGameId: true
    },
    vibes: {
        event: 'vibes-card-view-card-selected',
        fallback: '/assets/images/vibes/cards/vibes-card-back.png',
        bodyClass: 'game-vibes',
        checksGameId: false
    },
    riftbound: {
        event: 'riftbound-card-view-card-selected',
        fallback: '/assets/images/riftbound/cards/riftbound-card-back.jpg',
        bodyClass: 'game-riftbound',
        checksGameId: false
    },
    starwars: {
        event: 'starwars-card-view-card-selected',
        fallback: '/assets/images/starwars/cards/starwars-card-back.png',
        bodyClass: 'game-starwars',
        checksGameId: false
    }
};

let currentGame = 'mtg';
let cardName = null;

// Get card_id from last URL segment (e.g., /display/card/view/1 → "1")
const pathSegments = window.location.pathname.split('/');
const card_id = pathSegments[pathSegments.length - 1];

function getFallbackUrl() {
    return GAME_CONFIG[currentGame]?.fallback || GAME_CONFIG.mtg.fallback;
}

function applyGameTheme(game) {
    // Remove all game- classes
    Object.values(GAME_CONFIG).forEach(config => {
        document.body.classList.remove(config.bodyClass);
    });
    // Add current game class
    const config = GAME_CONFIG[game];
    if (config) {
        document.body.classList.add(config.bodyClass);
    }
}

// Listen for ALL game card selection events
Object.entries(GAME_CONFIG).forEach(([game, config]) => {
    socket.on(config.event, (data) => {
        // Only render if event matches current game selection
        if (game !== currentGame) return;

        // Check card-id matches this display instance
        if (data['card-id']?.toString() !== card_id) return;

        // For MTG, also verify game-id in data
        if (config.checksGameId && data['game-id'] && data['game-id'].toString() !== game) return;

        cardName = data['name'];
        renderCard(data);
    });
});

// Crossfade render (ported from MTG, applied to all games)
function renderCard(data) {
    const container = document.getElementById('card-view-container');
    const oldImg = container.querySelector('img');

    const newImg = new Image();
    newImg.className = 'card-src fade-image';
    newImg.style.opacity = '0';
    newImg.onload = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'main-card-display';
        wrapper.appendChild(newImg);

        if (oldImg) {
            const overlay = document.createElement('div');
            overlay.className = 'image-overlay';
            overlay.appendChild(oldImg);
            overlay.appendChild(newImg);

            container.innerHTML = '';
            wrapper.appendChild(overlay);
            container.appendChild(wrapper);

            requestAnimationFrame(() => {
                oldImg.style.opacity = '0';
                newImg.style.opacity = '1';
            });

            setTimeout(() => {
                if (overlay.contains(oldImg)) {
                    overlay.removeChild(oldImg);
                }
            }, 300);
        } else {
            container.innerHTML = '';
            container.appendChild(wrapper);

            requestAnimationFrame(() => {
                newImg.style.opacity = '1';
            });
        }
    };

    newImg.onerror = () => {
        console.warn('Image failed to load:', data.url);
        newImg.src = getFallbackUrl();
    };

    newImg.src = data.url || getFallbackUrl();
}

// Handle game selection changes
function onGameSelectionChanged(gameSelection) {
    const oldGame = currentGame;
    currentGame = gameSelection;
    applyGameTheme(currentGame);

    if (oldGame !== currentGame) {
        // Clear display and show new game's fallback
        renderCard({ url: '' });
    }
}

socket.on('server-current-game-selection', ({ gameSelection }) => {
    onGameSelectionChanged(gameSelection);
});

socket.on('game-selection-updated', ({ gameSelection }) => {
    onGameSelectionChanged(gameSelection);
});

// Request current game selection on load
socket.emit('get-game-selection');

// Initial render with default fallback
applyGameTheme(currentGame);
renderCard({ url: '' });
