import {
    RIFTBOUND_RUNES_OUTLINED as RIFTBOUND_RUNES,
    RIFTBOUND_BATTLEFIELDS_DECK_DISPLAY as RIFTBOUND_BATTLEFIELDS,
    RIFTBOUND_BATTLEFIELDS_DEFAULT_DECK_DISPLAY as RIFTBOUND_BATTLEFIELDS_DEFAULT,
    RIFTBOUND_LEGENDS_CARD_FRAMES,
    RIFTBOUND_LEGENDS_DESCRIPTIONS,
} from './constants.js';

const socket = io();
window.roomManager = new RoomManager(socket);

// Parse URL: /riftbound/display/main/deck/:matchID/:sideID
const pathSegments = window.location.pathname.split('/');
const match_id = pathSegments[5]; // e.g., 'match1'
const side_id = pathSegments[6];  // e.g., 'left' or 'right'

let roundData = {};
let deckData = {};

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
            source: 'deck-display',
            riftboundMeta: {
                legend: matchData[`player-legend-${side_id}`] || '',
                champion: matchData[`player-champion-${side_id}`] || '',
                battlefields: [
                    matchData[`player-battlefield-1-${side_id}`] || '',
                    matchData[`player-battlefield-2-${side_id}`] || '',
                    matchData[`player-battlefield-3-${side_id}`] || ''
                ],
                runeColor1: matchData[`player-rune-color-1-${side_id}`] || '',
                runeQty1: matchData[`player-rune-qty-1-${side_id}`] || '',
                runeColor2: matchData[`player-rune-color-2-${side_id}`] || '',
                runeQty2: matchData[`player-rune-qty-2-${side_id}`] || '',
                runesString: matchData[`player-runes-${side_id}`] || ''
            }
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
    // Build runesString from individual fields or from server-resolved runes array
    let runesString = (matchData['player-runes-' + side_id] || '').trim().toLowerCase();
    if (!runesString && (deckObj.runes || []).length > 0) {
        runesString = deckObj.runes.map(r => r.letter).join('');
    }

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

function getLegendCardFrameUrl(legendName) {
    if (!legendName) return null;
    const lowerInput = legendName.trim().toLowerCase();
    for (const key of Object.keys(RIFTBOUND_LEGENDS_CARD_FRAMES)) {
        if (lowerInput.includes(key.toLowerCase())) return RIFTBOUND_LEGENDS_CARD_FRAMES[key];
    }
    return null;
}

function renderLegend(legendName, legendCards) {
    // Legend card portrait — prefer mp4 video, fall back to card image
    const cardVideo = document.getElementById('rfb-dl-legend-card-video');
    const cardImg = document.getElementById('rfb-dl-legend-card-img');
    const frameUrl = getLegendCardFrameUrl(legendName);

    if (frameUrl && cardVideo) {
        cardVideo.src = frameUrl;
        cardVideo.style.display = 'block';
        if (cardImg) cardImg.style.display = 'none';
    } else {
        if (cardVideo) { cardVideo.src = ''; cardVideo.style.display = 'none'; }
        if (cardImg) {
            const card = legendCards[0];
            if (card?.['card-url']) {
                cardImg.src = card['card-url'];
                cardImg.style.display = 'block';
            } else {
                cardImg.style.display = 'none';
            }
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

    // Build a count map from rune data (server sends {letter, count})
    const runeCountMap = {};
    runeCards.forEach(rune => {
        if (rune.letter) {
            runeCountMap[rune.letter] = rune.count || 0;
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
