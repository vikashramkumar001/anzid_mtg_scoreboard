import { promises as fs } from 'fs';
import path from 'path';
import { cardDataDir } from '../../config/starwars/constants.js';
import { RoomUtils } from '../../utils/room-utils.js';

let cardListData = {}; // { SETCODE: { cardKey: { name, type, image } } }

function normalizeKey(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function loadCardListData() {
    cardListData = {};
    try {
        const files = await fs.readdir(cardDataDir);
        files.sort();
        for (const file of files) {
            if (!file.toLowerCase().endsWith('.json')) continue;
            const setCode = path.basename(file, '.json').toUpperCase();
            try {
                const raw = await fs.readFile(path.join(cardDataDir, file), 'utf8');
                const parsed = JSON.parse(raw);
                cardListData[setCode] = {};
                for (const key in parsed) {
                    const entry = parsed[key] || {};
                    // Use normalized key (recompute from original name to be safe)
                    const normalized = normalizeKey(entry.name || key);
                    cardListData[setCode][normalized] = {
                        name: entry.name || key,
                        type: entry.type || '',
                        image: entry.image || ''
                    };
                }
            } catch (e) {
                console.error('Error reading/parsing starwars set file', file, e.message);
            }
        }
        console.log('Star Wars card list data loaded from', cardDataDir);
    } catch (e) {
        console.error('Error loading Star Wars card data directory', cardDataDir, e.message);
        cardListData = {};
    }
}

function getCardListData() {
    return cardListData;
}

function emitStarWarsCardList(io) {
    RoomUtils.emitWithRoomMapping(io, 'starwars-card-list-data', { cardListData });
}

function parseSetAndName(input) {
    if (!input || typeof input !== 'string') return { set: null, name: '' };
    input = input.trim();
    // Pattern: SET:Name or SET|Name or SET - Name
    let m = input.match(/^([A-Za-z0-9]{2,6})[:|\-]\s*(.+)$/);
    if (m) return { set: m[1].toUpperCase(), name: m[2].trim() };
    // Pattern: Name (SET)
    m = input.match(/^(.+?)\s*\((\w{2,6})\)\s*$/);
    if (m) return { set: m[2].toUpperCase(), name: m[1].trim() };
    // Pattern: SET Name (leading set)
    m = input.match(/^([A-Za-z0-9]{2,6})\s+\s*(.+)$/);
    if (m && /^[A-Za-z0-9]{2,6}$/.test(m[1])) return { set: m[1].toUpperCase(), name: m[2].trim() };
    return { set: null, name: input };
}

function buildImageUrl(entry, setCode, normalizedKey) {
    if (!entry) return '';

    // Build a local filename from the provided image or fallback to the normalized key.
    // Strip any query parameters or fragment identifiers to keep filenames clean.
    let base = '';
    if (entry.image) {
        base = entry.image.split(/\\|\//).pop();
    } else {
        base = normalizedKey;
    }

    // Strip query params and fragments (e.g., foo.png?size=1 -> foo.png)
    base = base.split('?')[0].split('#')[0];

    if (!/\.[a-z0-9]+$/i.test(base)) base = base + '.png';
    return `/assets/images/cards/starwars/${setCode}/${base}`;
}

function emitStarWarsCardView(io, cardSelected) {
    // cardSelected expected to include set code with the name (see parseSetAndName)
    const raw = cardSelected['card-selected'];
    const { set, name } = parseSetAndName(raw);
    const cardId = cardSelected['card-id'];

    if (!set) {
        // No set provided, emit empty to indicate not found
        RoomUtils.emitWithRoomMapping(io, 'starwars-card-view-card-selected', { name: '', url: '', 'card-id': cardId });
        return;
    }

    const setMap = cardListData[set];
    if (!setMap) {
        RoomUtils.emitWithRoomMapping(io, 'starwars-card-view-card-selected', { name: '', url: '', 'card-id': cardId });
        return;
    }

    const key = normalizeKey(name);
    const entry = setMap[key];
    if (entry) {
        const url = buildImageUrl(entry, set, key);
        RoomUtils.emitWithRoomMapping(io, 'starwars-card-view-card-selected', { name: entry.name, url, 'card-id': cardId });
    } else {
        RoomUtils.emitWithRoomMapping(io, 'starwars-card-view-card-selected', { name: '', url: '', 'card-id': cardId });
    }
}

// Transform incoming deck list data to create deck object
export function transformDeckData(deckListData) {
    const deckObject = [];
    deckListData.forEach(card => {
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
        const cardCount = parseInt(parts[1], 10);
        const rawName = parts[2];
        const { set, name } = parseSetAndName(rawName);
        let found = null;
        if (set && cardListData[set]) {
            const key = normalizeKey(name);
            if (cardListData[set][key]) {
                found = { set, key, entry: cardListData[set][key] };
            }
        } else {
            // Search across sets; prefer first match
            for (const s of Object.keys(cardListData)) {
                const key = normalizeKey(name);
                if (cardListData[s][key]) {
                    found = { set: s, key, entry: cardListData[s][key] };
                    break;
                }
            }
        }

        if (found) {
            const url = buildImageUrl(found.entry, found.set, found.key);
            deckObject.push({ 'card-name': found.entry.name, 'card-count': cardCount, 'card-url': url });
        } else {
            deckObject.push({ 'card-name': rawName, 'card-count': cardCount, 'card-url': '' });
        }
    });
    return deckObject;
}

export function handleStarWarsIncomingDeckData(io, deckListData) {
    try {
        if (!deckListData || typeof deckListData !== 'object') {
            console.error('Invalid deckListData received:', deckListData);
            return;
        }

        const deckData = Array.isArray(deckListData['deckList']) ? deckListData['deckList'] : [];
        const index = typeof deckListData['index'] === 'number' ? deckListData['index'] : null;
        if (index === null) {
            console.error('Invalid index received:', index);
            return;
        }
        if (deckData.length === 0) {
            console.warn('Empty deck data received for index:', index);
            return;
        }

        const formattedData = transformDeckData(deckData);
        if (!formattedData || typeof formattedData !== 'object') {
            console.error('Failed to transform deck data:', deckData);
            return;
        }

        const data2send = { index: index, data: formattedData };
        RoomUtils.emitWithRoomMapping(io, 'starwars-deck-data-from-server', data2send);
        console.log('StarWars deck data sent successfully for index:', index);
    } catch (error) {
        console.error('Error in handleStarWarsIncomingDeckData:', error);
    }
}

export { loadCardListData, getCardListData, emitStarWarsCardList, emitStarWarsCardView };

