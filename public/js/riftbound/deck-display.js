const socket = io();
window.roomManager = new RoomManager(socket);

// Parse URL: /riftbound/display/main/deck/:matchID/:sideID
const pathSegments = window.location.pathname.split('/');
const match_id = pathSegments[5]; // e.g., 'match1'
const side_id = pathSegments[6];  // e.g., 'left' or 'right'

let roundData = {};
let deckData = {};

// ── CONSTANTS (mirrored from broadcast-round-main-deck.js) ─────────────────

const RIFTBOUND_RUNES = {
    'r': '/assets/images/riftbound/icons/runes-outlined/Fury-outlined.png',
    'g': '/assets/images/riftbound/icons/runes-outlined/Calm-outlined.png',
    'b': '/assets/images/riftbound/icons/runes-outlined/Mind-outlined.png',
    'o': '/assets/images/riftbound/icons/runes-outlined/Body-outlined.png',
    'p': '/assets/images/riftbound/icons/runes-outlined/Chaos-outlined.png',
    'y': '/assets/images/riftbound/icons/runes-outlined/Order-outlined.png',
};

const RIFTBOUND_BATTLEFIELDS_DEFAULT = {
    left: '/assets/images/riftbound/battlefields/_0000_Default180.png',
    right: '/assets/images/riftbound/battlefields/_0000_Default.png',
};

const RIFTBOUND_BATTLEFIELDS = {
    'default': { left: '/assets/images/riftbound/battlefields/_0000_Default180.png', right: '/assets/images/riftbound/battlefields/_0000_Default.png' },
    'Altar to Unity': { left: '/assets/images/riftbound/battlefields/_0000_Altar-to-Unity180.png', right: '/assets/images/riftbound/battlefields/_0024_Altar-to-Unity.png' },
    'Aspirant\'s Climb': { left: '/assets/images/riftbound/battlefields/_0001_Aspirant_s-Climb180.png', right: '/assets/images/riftbound/battlefields/_0025_Aspirant_s-Climb.png' },
    'Back-Alley Bar': { left: '/assets/images/riftbound/battlefields/_0002_Back-Alley-Bar180.png', right: '/assets/images/riftbound/battlefields/_0026_Back-Alley-Bar.png' },
    'Bandle Tree': { left: '/assets/images/riftbound/battlefields/_0003_Bandle-Tree180.png', right: '/assets/images/riftbound/battlefields/_0027_Bandle-Tree.png' },
    'Fortified Position': { left: '/assets/images/riftbound/battlefields/_0004_Fortified-Position180.png', right: '/assets/images/riftbound/battlefields/_0028_Fortified-Position.png' },
    'Grove of the God-Willow': { left: '/assets/images/riftbound/battlefields/_0005_Grove-of-the-God-Willow180.png', right: '/assets/images/riftbound/battlefields/_0029_Grove-of-the-God-Willow.png' },
    'Hallowed Tomb': { left: '/assets/images/riftbound/battlefields/_0006_Hallowed-Tomb180.png', right: '/assets/images/riftbound/battlefields/_0030_Hallowed-Tomb.png' },
    'Monastery of Hirana': { left: '/assets/images/riftbound/battlefields/_0007_Monastery-of-Hirana180.png', right: '/assets/images/riftbound/battlefields/_0031_Monastery-of-Hirana.png' },
    'Navori Fighting Pit': { left: '/assets/images/riftbound/battlefields/_0008_Navori-Fighting-Pit180.png', right: '/assets/images/riftbound/battlefields/_0032_Navori-Fighting-Pit.png' },
    'Obelisk of Power': { left: '/assets/images/riftbound/battlefields/_0009_Obelisk-of-Power180.png', right: '/assets/images/riftbound/battlefields/_0033_Obelisk-of-Power.png' },
    'Reaver\'s Row': { left: '/assets/images/riftbound/battlefields/_0010_Reaver_s-Row180.png', right: '/assets/images/riftbound/battlefields/_0034_Reaver_s-Row.png' },
    'Reckoner\'s Arena': { left: '/assets/images/riftbound/battlefields/_0011_Reckoner_s-Arena180.png', right: '/assets/images/riftbound/battlefields/_0035_Reckoner_s-Arena.png' },
    'Sigil of the Storm': { left: '/assets/images/riftbound/battlefields/_0012_Sigil-of-the-Storm180.png', right: '/assets/images/riftbound/battlefields/_0036_Sigil-of-the-Storm.png' },
    'Startipped Peak': { left: '/assets/images/riftbound/battlefields/_0013_Startipped-Peak180.png', right: '/assets/images/riftbound/battlefields/_0037_Startipped-Peak.png' },
    'Targon\'s Peak': { left: '/assets/images/riftbound/battlefields/_0014_Targon_s-Peak180.png', right: '/assets/images/riftbound/battlefields/_0038_Targon_s-Peak.png' },
    'The Arena\'s Greatest': { left: '/assets/images/riftbound/battlefields/_0015_The-Arena_s-Greatest180.png', right: '/assets/images/riftbound/battlefields/_0039_The-Arena_s-Greatest.png' },
    'The Dreaming Tree': { left: '/assets/images/riftbound/battlefields/_0016_The-Dreaming-Tree180.png', right: '/assets/images/riftbound/battlefields/_0040_The-Dreaming-Tree.png' },
    'The Grand Plaza': { left: '/assets/images/riftbound/battlefields/_0017_The-Grand-Plaza180.png', right: '/assets/images/riftbound/battlefields/_0041_The-Grand-Plaza.png' },
    'Trifarian War Camp': { left: '/assets/images/riftbound/battlefields/_0018_Trifarian-War-Camp180.png', right: '/assets/images/riftbound/battlefields/_0042_Trifarian-War-Camp.png' },
    'Vilemaw\'s Lair': { left: '/assets/images/riftbound/battlefields/_0019_Vilemaw_s-Lair180.png', right: '/assets/images/riftbound/battlefields/_0043_Vilemaw_s-Lair.png' },
    'Void Gate': { left: '/assets/images/riftbound/battlefields/_0020_Void-Gate180.png', right: '/assets/images/riftbound/battlefields/_0044_Void-Gate.png' },
    'Windswept Hillock': { left: '/assets/images/riftbound/battlefields/_0021_Windswept-Hillock180.png', right: '/assets/images/riftbound/battlefields/_0045_Windswept-Hillock.png' },
    'Zaun Warrens': { left: '/assets/images/riftbound/battlefields/_0022_Zaun-Warrens180.png', right: '/assets/images/riftbound/battlefields/_0046_Zaun-Warrens.png' },
    'The Candlelit Sanctum': { left: '/assets/images/riftbound/battlefields/_0023_The-Candlelit-Sanctum180.png', right: '/assets/images/riftbound/battlefields/_0047_The-Candlelit-Sanctum.png' },
    'Emperor\'s Dais': { left: '/assets/images/riftbound/battlefields/_0048_Emperor_s-Dais180.png', right: '/assets/images/riftbound/battlefields/_0072_Emperor_s-Dais.png' },
    'Forge of the Fluft': { left: '/assets/images/riftbound/battlefields/_0049_Forge-of-the-Fluft180.png', right: '/assets/images/riftbound/battlefields/_0073_Forge-of-the-Fluft.png' },
    'Forgotten Monument': { left: '/assets/images/riftbound/battlefields/_0050_Forgotten-Monument180.png', right: '/assets/images/riftbound/battlefields/_0074_Forgotten-Monument.png' },
    'Hall of Legends': { left: '/assets/images/riftbound/battlefields/_0051_Hall-of-Legends180.png', right: '/assets/images/riftbound/battlefields/_0075_Hall-of-Legends.png' },
    'Marai Spire': { left: '/assets/images/riftbound/battlefields/_0052_Marai-Spire180.png', right: '/assets/images/riftbound/battlefields/_0076_Marai-Spire.png' },
    'Minefield': { left: '/assets/images/riftbound/battlefields/_0053_Minefield180.png', right: '/assets/images/riftbound/battlefields/_0077_Minefield.png' },
    'Ornn\'s Forge': { left: '/assets/images/riftbound/battlefields/_0054_Ornn_s-Forge180.png', right: '/assets/images/riftbound/battlefields/_0078_Ornn_s-Forge.png' },
    'Power Nexus': { left: '/assets/images/riftbound/battlefields/_0055_Power-Nexus180.png', right: '/assets/images/riftbound/battlefields/_0079_Power-Nexus.png' },
    'Ravenbloom Conservatory': { left: '/assets/images/riftbound/battlefields/_0056_Ravenbloom-Conservatory180.png', right: '/assets/images/riftbound/battlefields/_0080_Ravenbloom-Conservatory.png' },
    'Rockfall Path': { left: '/assets/images/riftbound/battlefields/_0057_Rockfall-Path180.png', right: '/assets/images/riftbound/battlefields/_0081_Rockfall-Path.png' },
    'Seat of Power': { left: '/assets/images/riftbound/battlefields/_0058_Seat-of-Power180.png', right: '/assets/images/riftbound/battlefields/_0082_Seat-of-Power.png' },
    'Sunken Temple': { left: '/assets/images/riftbound/battlefields/_0059_Sunken-Temple180.png', right: '/assets/images/riftbound/battlefields/_0083_Sunken-Temple.png' },
    'The Papertree': { left: '/assets/images/riftbound/battlefields/_0060_The-Papertree180.png', right: '/assets/images/riftbound/battlefields/_0084_The-Papertree.png' },
    'Treasure Hoard': { left: '/assets/images/riftbound/battlefields/_0061_Treasure-Hoard180.png', right: '/assets/images/riftbound/battlefields/_0085_Treasure-Hoard.png' },
    'Veiled Temple': { left: '/assets/images/riftbound/battlefields/_0062_Veiled-Temple180.png', right: '/assets/images/riftbound/battlefields/_0086_Veiled-Temple.png' },
};

const RIFTBOUND_LEGENDS_DESCRIPTIONS = {
    'default': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0000_default.png',
    'Kai\'sa': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0001_Kaisa, Daughter of the Void.png',
    'Volibear': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0002_Volibear, Relentless Storm.png',
    'Sett': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0003_Sett, The Boss.png',
    'Viktor': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0004_Viktor, Herald of the Arcane.png',
    'Teemo': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0005_Teemo, Swift Scout.png',
    'Leona': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0006_Leona, Radiant Dawn.png',
    'Yasuo': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0007_Yasuo, Unforgiven.png',
    'Yas': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0007_Yasuo, Unforgiven.png',
    'Lee Sin': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0008_Lee Sin, Blind Monk.png',
    'Ahri': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0009_Ahri, Nine-Tailed Fox.png',
    'Darius': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0010_Darius, Hand of Noxus.png',
    'Jinx': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0011_Jinx, Loose Cannon.png',
    'Miss Fortune': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0012_Miss Fortune, Bounty Hunter.png',
    'Garen': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0013_Garen, Might of Demacia.png',
    'Lux': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0014_Lux, Lady of Luminosity.png',
    'Annie': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0015_Annie, Dark Child.png',
    'Master Yi': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0016_Master Yi, Wuju Bladesman.png',
    'Rumble': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0017_Rumble, Mechanized Menace.png',
    'Lucian': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0018_Lucian, Purifier.png',
    'Draven': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0019_Draven, Glorious Executioner.png',
    'Rek\'Sai': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0020_Reksai, Void Burrower.png',
    'Ornn': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0021_Ornn, Fire Below the Mountain.png',
    'Jax': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0022_Jax, Grandmaster at Arms.png',
    'Irelia': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0023_Irelia, Blade Dancer.png',
    'Azir': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0024_Azir, Emperor of the Sands.png',
    'Ezreal': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0025_Ezreal, Prodigal Explorer.png',
    'Renata Glasc': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0026_Renata Glasc, Chem-Baroness.png',
    'Sivir': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0027_Sivir, Battle Mistress.png',
    'Fiora': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0028_Fiora, Grand Duelist.png',
};

// ── SOCKET EVENTS ───────────────────────────────────────────────────────────

socket.on('broadcast-round-data', (data) => {
    roundData = data;

    const matchData = data[match_id];
    if (!matchData) return;

    if (matchData['player-main-deck-' + side_id]?.length) {
        socket.emit('transform-main-deck-data', {
            deckData: matchData['player-main-deck-' + side_id],
            gameType: 'riftbound',
            sideID: side_id,
            matchID: match_id,
        });
    }

    if (matchData['player-side-deck-' + side_id]?.length) {
        socket.emit('transform-side-deck-data', {
            deckData: matchData['player-side-deck-' + side_id],
            gameType: 'riftbound',
            sideID: side_id,
            matchID: match_id,
        });
    }

    // Re-render player info / runes if deck already loaded
    if (deckData.mainDeck) {
        renderAll();
    }
});

socket.on('transformed-main-deck-data', (data) => {
    if (data.sideID !== side_id || data.gameType !== 'riftbound' || data.matchID !== match_id) return;
    deckData.mainDeck = data.deckData;
    renderAll();
});

socket.on('transformed-side-deck-data', (data) => {
    if (data.sideID !== side_id || data.gameType !== 'riftbound' || data.matchID !== match_id) return;
    deckData.sideDeck = data.deckData;
    renderAll();
});

// ── RENDER ORCHESTRATOR ─────────────────────────────────────────────────────

function renderAll() {
    const deckObj = deckData.mainDeck;
    if (!deckObj || typeof deckObj !== 'object') return;

    const matchData = roundData[match_id] || {};
    const playerName   = matchData['player-name-'     + side_id] || '';
    const legendName   = matchData['player-legend-'   + side_id] || '';
    const championName = matchData['player-champion-' + side_id] || '';
    const runesString  = (matchData['player-runes-'   + side_id] || '').trim().toLowerCase();

    renderPlayerName(playerName);
    renderLegend(legendName, deckObj.legend || []);

    // Separate champion card from main deck cards
    const championCard = findCardByName(championName, deckObj.other || []);
    renderChampion(championCard);
    const mainCards = (deckObj.other || []).filter(c => c !== championCard);

    renderMainDeck(mainCards);
    renderSideboard(deckData.sideDeck || []);
    renderBattlefields(deckObj.battlefields || []);
    renderRunes(runesString, deckObj.runes || []);
}

// ── RENDER FUNCTIONS ────────────────────────────────────────────────────────

function renderPlayerName(name) {
    const el = document.getElementById('rfb-dl-player-name');
    if (el) el.textContent = name.toUpperCase();
}

function renderLegend(legendName, legendCards) {
    // Legend card portrait
    const cardImg = document.getElementById('rfb-dl-legend-card-img');
    if (cardImg) {
        const card = legendCards[0];
        if (card?.['card-url']) {
            cardImg.src = card['card-url'];
            cardImg.style.display = 'block';
        } else {
            cardImg.style.display = 'none';
        }
    }

    // Legend description image (ability text box)
    const descImg = document.getElementById('rfb-dl-legend-desc-img');
    if (descImg) {
        const imageUrl = getLegendDescriptionUrl(legendName);
        if (imageUrl) {
            descImg.src = encodeURI(imageUrl) + '?v=' + Date.now();
            descImg.style.display = 'block';
        } else {
            descImg.style.display = 'none';
        }
    }
}

function getLegendDescriptionUrl(legendName) {
    if (!legendName) return RIFTBOUND_LEGENDS_DESCRIPTIONS['default'];
    const lowerInput = legendName.trim().toLowerCase();

    // Exact match first
    for (const key of Object.keys(RIFTBOUND_LEGENDS_DESCRIPTIONS)) {
        if (key.toLowerCase() === lowerInput) return RIFTBOUND_LEGENDS_DESCRIPTIONS[key];
    }
    // Partial match (e.g. "Jinx, Loose Cannon" → "Jinx")
    for (const key of Object.keys(RIFTBOUND_LEGENDS_DESCRIPTIONS)) {
        if (lowerInput.includes(key.toLowerCase())) return RIFTBOUND_LEGENDS_DESCRIPTIONS[key];
    }
    return RIFTBOUND_LEGENDS_DESCRIPTIONS['default'];
}

function findCardByName(name, cards) {
    if (!name || !cards.length) return null;
    const lowerName = name.trim().toLowerCase();
    return cards.find(c => {
        const cardLower = (c['card-name'] || '').toLowerCase();
        return cardLower.includes(lowerName) || lowerName.includes(cardLower);
    }) || null;
}

function renderChampion(championCard) {
    const img = document.getElementById('rfb-dl-champion-card-img');
    if (!img) return;
    if (championCard?.['card-url']) {
        img.src = championCard['card-url'];
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
}

function renderMainDeck(cards) {
    const container = document.getElementById('rfb-dl-maindeck');
    if (!container) return;
    container.innerHTML = '';

    cards.forEach(card => {
        if (!card['card-url']) return;
        const el = document.createElement('div');
        el.className = 'rfb-dl-main-card';
        el.innerHTML = `
            <img src="${card['card-url']}" alt="${card['card-name'] || ''}">
            <div class="rfb-dl-card-count">${card['card-count']}</div>
        `;
        container.appendChild(el);
    });
}

function renderSideboard(cards) {
    const container = document.getElementById('rfb-dl-sideboard');
    if (!container) return;
    container.innerHTML = '';

    cards.forEach(card => {
        if (!card['card-url']) return;
        const el = document.createElement('div');
        el.className = 'rfb-dl-side-card';
        el.innerHTML = `
            <img src="${card['card-url']}" alt="${card['card-name'] || ''}">
            <div class="rfb-dl-side-count">${card['card-count']}</div>
        `;
        container.appendChild(el);
    });
}

function renderBattlefields(battlefields) {
    const container = document.getElementById('rfb-dl-battlefields');
    if (!container) return;
    container.innerHTML = '';

    // Always show 3 slots
    for (let i = 0; i < 3; i++) {
        const el = document.createElement('div');
        el.className = 'rfb-dl-battlefield';

        const bf = battlefields[i];
        const bfName = bf?.['card-name']?.trim() || '';
        let imageUrl = RIFTBOUND_BATTLEFIELDS_DEFAULT.right;

        if (bfName) {
            let bfData = RIFTBOUND_BATTLEFIELDS[bfName];
            if (!bfData) {
                const lower = bfName.toLowerCase();
                for (const key of Object.keys(RIFTBOUND_BATTLEFIELDS)) {
                    if (key.toLowerCase() === lower) { bfData = RIFTBOUND_BATTLEFIELDS[key]; break; }
                }
            }
            if (bfData) imageUrl = bfData.right;
        }

        const finalUrl = encodeURI(imageUrl) + '?v=' + Date.now();
        el.style.backgroundImage = `url("${finalUrl}")`;
        container.appendChild(el);
    }
}

function renderRunes(runesString, runeCards) {
    const container = document.getElementById('rfb-dl-runes');
    if (!container) return;
    container.innerHTML = '';

    if (!runesString) return;

    // Build a count map from rune card data
    const runeLetterToName = { 'g': 'Calm', 'p': 'Chaos', 'r': 'Fury', 'b': 'Mind', 'y': 'Order', 'o': 'Body' };
    const runeCountMap = {};
    runeCards.forEach(card => {
        const name = (card['card-name'] || '').toLowerCase();
        for (const [letter, runeName] of Object.entries(runeLetterToName)) {
            if (name.includes(runeName.toLowerCase())) {
                runeCountMap[letter] = card['card-count'] || 0;
                break;
            }
        }
    });

    // Render first 2 runes
    const runesToShow = runesString.slice(0, 2);
    for (const letter of runesToShow) {
        const iconUrl = RIFTBOUND_RUNES[letter];
        if (!iconUrl) continue;

        const item = document.createElement('div');
        item.className = 'rfb-dl-rune-item';
        item.innerHTML = `
            <img class="rfb-dl-rune-icon" src="${iconUrl}" alt="Rune ${letter}">
            <span class="rfb-dl-rune-count">x${runeCountMap[letter] ?? 0}</span>
        `;
        container.appendChild(item);
    }
}
