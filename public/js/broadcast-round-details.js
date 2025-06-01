const socket = io();
let roundData = {};
let detailToDisplay = "";

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
    if (data[match_id] && data[match_id][detail_id]) {
        detailToDisplay = `${data[match_id][detail_id]}`;
        // Call a function to render the round details
        renderDetails(detailToDisplay);
    }
});

// Listen for global data update
socket.on('update-match-global-data', (data) => {
    console.log('global data', data);
    // specifically checking for font family change
    checkFontFamily(data['globalData']['global-font-family']);
})

// Function to check if font family needs updating
function checkFontFamily(globalFont) {
    if (globalFont) {
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

        // Default: just show the detail as text
    } else {
        playerDetail.textContent = detail;
    }
}

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
