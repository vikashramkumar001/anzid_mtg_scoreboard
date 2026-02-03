const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let roundData = {};
let detailToDisplay = "";
let selectedGame = "";

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const match_id = pathSegments[4];
const detail_id = pathSegments[5];

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const MANA_SYMBOLS = {
    W: {alt: 'White', src: 'https://svgs.scryfall.io/card-symbols/W.svg'},
    U: {alt: 'Blue', src: 'https://svgs.scryfall.io/card-symbols/U.svg'},
    B: {alt: 'Black', src: 'https://svgs.scryfall.io/card-symbols/B.svg'},
    R: {alt: 'Red', src: 'https://svgs.scryfall.io/card-symbols/R.svg'},
    G: {alt: 'Green', src: 'https://svgs.scryfall.io/card-symbols/G.svg'},
    C: {alt: 'Colorless', src: 'https://svgs.scryfall.io/card-symbols/C.svg'}
};

const SPRITES_MAPPING = {
    'jimmy wong': {alt: 'jimmy wong', src: '/assets/images/sprites/jimmywong_pixel.png'},
    'theasianavenger': {alt: 'theasianavenger', src: '/assets/images/sprites/crim_pixel.png'},
    'curiousjoi': {alt: 'curiousjoi', src: '/assets/images/sprites/curiousjoi_pixel.png'},
    'joel are magic': {alt: 'joel are magic', src: '/assets/images/sprites/joelaremagic_pixel.png'},
    'rachel weeks': {alt: 'rachel weeks', src: '/assets/images/sprites/rachelweeks_pixel.png'},
    'taalia vess': {alt: 'taalia vess', src: '/assets/images/sprites/talia_pixel.png'},
    'fobm4ster': {alt: 'fobm4ster', src: '/assets/images/sprites/fobm4ster_pixel.png'},
    'jarvis johnson': {alt: 'jarvis johnson', src: '/assets/images/sprites/jarvisjohnson_pixel.png'},
    'heybillierae': {alt: 'heybillierae', src: '/assets/images/sprites/heybillierae_pixel.png'},
    'voxy': {alt: 'voxy', src: '/assets/images/sprites/voxy_single.png'},
    'reynad': {alt: 'reynad', src: '/assets/images/sprites/reynad_pixel.png'},
    'brodin': {alt: 'brodin', src: '/assets/images/sprites/brodinplett_pixel.png'},
    'olivia gobert-hicks': {alt: 'olivia gobert-hicks', src: '/assets/images/sprites/olivia_pixel.png'},
    'aims': {alt: 'aims', src: '/assets/images/sprites/aims_pixel.png'},
    'ls': {alt: 'ls', src: '/assets/images/sprites/LS_pixel.png'},
    'atrioc': {alt: 'atrioc', src: '/assets/images/sprites/atrioc_pixel.png'}
}

console.log('match, detail', match_id, detail_id);

const playerDetail = document.getElementById('player-detail');

// ask for global match data to get font family
socket.emit('get-match-global-data');

// Listen for deck data to display
socket.on('broadcast-round-data', (data) => {
    // {match1:{}, match2:{},...}}
    console.log('data', data);

    // Save to local object
    roundData = data;
    if (data[match_id]) {
        roundData = data;

        if (data[match_id][detail_id]) {
            detailToDisplay = `${data[match_id][detail_id]}`;
        } else if (detail_id === 'player-sprite-left' || detail_id === 'player-sprite-right') {
            // We don't need to set detailToDisplay for sprite; just call renderDetails
            detailToDisplay = null;
        } else if (detail_id === 'winner-left' || detail_id === 'winner-right') {
            // Winner display - combines background, name, and archetype
            detailToDisplay = null;
        } else {
            return; // detail_id doesn't exist and isn't a sprite, so exit
        }

        renderDetails(detailToDisplay);
    }
});

// Listen for global data update
socket.on('update-match-global-data', (data) => {
    console.log('global data', data);
    // specifically checking for font family change
    checkFontFamily(data['globalData']['global-font-family'], data['globalData']['global-game-selection']);
})

// Get game selection on load
socket.emit('get-game-selection');

socket.on('server-current-game-selection', ({gameSelection}) => {
    selectedGame = gameSelection?.toLowerCase() || '';
    if (selectedGame === 'mtg') {
        document.documentElement.style.setProperty('--dynamic-font', 'Gotham Narrow');
    }
});

socket.on('game-selection-updated', ({gameSelection}) => {
    selectedGame = gameSelection?.toLowerCase() || '';
    if (selectedGame === 'mtg') {
        document.documentElement.style.setProperty('--dynamic-font', 'Gotham Narrow');
    }
})

// Function to check if font family needs updating
function checkFontFamily(globalFont, gameSelection) {
    // Use Gotham Narrow for MTG
    if (gameSelection?.toLowerCase() === 'mtg') {
        document.documentElement.style.setProperty('--dynamic-font', 'Gotham Narrow');
    } else if (globalFont) {
        document.documentElement.style.setProperty('--dynamic-font', globalFont);
    }
}

// Function to render the round details on the page
function renderDetails(detail) {
    // Clear the container
    playerDetail.innerHTML = '';

    // Case 1: Mana symbols only (replace text)
    if (detail_id.startsWith('player-mana-symbols-')) {
        const span = document.createElement('span');
        span.id = 'player-mana-symbols';
        span.className = 'mana-symbols-container';
        playerDetail.appendChild(span);
        renderManaSymbols(detail, 'player-mana-symbols');

        // Case 2: Archetype with mana symbols prepended
    } else if (detail_id.startsWith('player-archetype-')) {
        const container = document.createElement('div');
        const span = document.createElement('span');
        span.id = 'player-mana-symbols';
        span.className = 'mana-symbols-container';
        container.appendChild(span);

        const text = document.createElement('span');
        text.className = 'archetype-text';
        text.textContent = ' ' + detail;
        container.appendChild(text);

        playerDetail.appendChild(container);
        renderManaSymbols(roundData[match_id][`player-mana-symbols-${detail_id.endsWith('left') ? 'left' : 'right'}`] || '', 'player-mana-symbols');

        // Player sprite rendering
    } else if (detail_id === 'player-sprite-left' || detail_id === 'player-sprite-right') {
        const side = detail_id.endsWith('left') ? 'left' : 'right';
        const playerNameKey = `player-name-${side}`;
        const rawName = roundData[match_id]?.[playerNameKey];
        const playerName = rawName?.toLowerCase();

        playerDetail.innerHTML = '';

        if (playerName && SPRITES_MAPPING.hasOwnProperty(playerName)) {
            const img = document.createElement('img');
            img.className = 'player-sprite';
            img.src = SPRITES_MAPPING[playerName].src;
            img.alt = SPRITES_MAPPING[playerName].alt;
            playerDetail.appendChild(img);
        } else {
            const fallbackImg = document.createElement('img');
            fallbackImg.className = 'player-sprite fallback';
            fallbackImg.src = '/assets/images/sprites/fallback.png'; // or any subtle, soft image
            playerDetail.appendChild(fallbackImg);
        }

        // Winner display - background image with player name and archetype
    } else if (detail_id === 'winner-left' || detail_id === 'winner-right') {
        const side = detail_id.endsWith('left') ? 'left' : 'right';
        const playerName = roundData[match_id]?.[`player-name-${side}`] || '';
        const archetype = roundData[match_id]?.[`player-archetype-${side}`] || '';

        playerDetail.innerHTML = '';
        playerDetail.className = `winner-display ${selectedGame}`;

        // Background image container (contains name and archetype like commentator)
        const bgImage = document.createElement('div');
        bgImage.className = 'winner-bg-image';

        // Player name (inside bg container)
        const nameEl = document.createElement('div');
        nameEl.className = 'winner-name';
        nameEl.textContent = playerName;
        bgImage.appendChild(nameEl);

        // Archetype container (inside bg container)
        const archetypeContainer = document.createElement('div');
        archetypeContainer.className = 'winner-archetype';

        // Archetype text
        const archetypeText = document.createElement('span');
        archetypeText.className = 'winner-archetype-text';
        archetypeText.textContent = archetype;
        archetypeContainer.appendChild(archetypeText);

        // Mana symbols (to the right of archetype)
        const manaSpan = document.createElement('span');
        manaSpan.id = 'winner-mana-symbols';
        manaSpan.className = 'winner-mana-symbols-container';
        archetypeContainer.appendChild(manaSpan);

        bgImage.appendChild(archetypeContainer);

        playerDetail.appendChild(bgImage);

        // Render mana symbols
        const manaSymbols = roundData[match_id]?.[`player-mana-symbols-${side}`] || '';
        renderManaSymbols(manaSymbols, 'winner-mana-symbols');

        // Wait for fonts to load before scaling text
        document.fonts.ready.then(() => {
            // MTG uses 48px max, riftbound/vibes use 40px max
            const maxFontSize = selectedGame === 'mtg' ? 48 : 40;
            autoScaleText(nameEl, maxFontSize, 24, 465);
        });

        // Default: just show the detail as text
    } else {
        playerDetail.textContent = detail;
    }
}

// Auto-scale font size to fit container width
function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    // Create a temporary span to measure text width accurately
    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerHTML = element.innerHTML;
    document.body.appendChild(temp);

    // Reduce font size until text fits
    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';
    document.body.removeChild(temp);
}

// render mana symbols
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
    container.style.display = 'inline-block';

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
