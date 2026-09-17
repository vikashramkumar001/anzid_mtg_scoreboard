import {promises as fs} from 'fs';
import {cardListDataPath, RIFTBOUND_CARD_NAME_ALIASES} from '../../config/riftbound/constants.js';
import { RoomUtils } from '../../utils/room-utils.js';

let cardListData = {};

// Load card list from file
export async function loadCardListData() {
    try {
        const data = await fs.readFile(cardListDataPath, 'utf8');
        cardListData = JSON.parse(data);
        console.log('Riftbound Card list data loaded.', Object.keys(cardListData).length, 'cards');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Card list file not found. Starting with empty list.');
            cardListData = {};
        } else {
            console.error('Error loading card list data:', error);
            cardListData = {};
        }
    }
}

// Get the current card list
export function getCardListData() {
    return cardListData;
}

// ── Tolerant name lookup ────────────────────────────────────────────────────
// Every server feature that needs a card BY NAME goes through here instead of
// indexing cardListData directly, so one place knows that a name can arrive
// with the wrong capitalisation (an operator typing, Carde.io's "Ivern, Friend
// to all"), with curly apostrophes, under another platform's spelling
// (RIFTBOUND_CARD_NAME_ALIASES), or — for the four starter legends — without
// the " - Starter" the DB keys them by. Returns { name, card } where `name` is
// the DB key, or null. Never fuzzy: a near miss is a miss.
const foldName = (s) => String(s || '')
    .trim()
    .replace(/[\u2018\u2019\u02BC]/g, "'")            // curly / modifier apostrophes
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // accents
    .replace(/\s+/g, ' ')
    .toLowerCase();

// Rebuilt when the card list is replaced (loadCardListData reassigns, never mutates).
let nameIndex = { source: null, byFolded: new Map() };
const aliasByFolded = new Map(Object.entries(RIFTBOUND_CARD_NAME_ALIASES).map(([from, to]) => [foldName(from), to]));

export function findRiftboundCard(name) {
    const raw = String(name || '').trim();
    if (!raw) return null;
    if (cardListData[raw]) return { name: raw, card: cardListData[raw] };

    if (nameIndex.source !== cardListData) {
        const byFolded = new Map();
        for (const key of Object.keys(cardListData)) {
            const folded = foldName(key);
            if (!byFolded.has(folded)) byFolded.set(folded, key);
        }
        nameIndex = { source: cardListData, byFolded };
    }

    const folded = foldName(raw);
    const alias = aliasByFolded.get(folded);
    for (const candidate of [folded, alias && foldName(alias), `${folded} - starter`]) {
        const key = candidate && nameIndex.byFolded.get(candidate);
        if (key) return { name: key, card: cardListData[key] };
    }
    return null;
}

// Emit full card list to clients
export function emitRiftboundCardList(io) {
    RoomUtils.emitWithRoomMapping(io, 'riftbound-card-list-data', {cardListData});
}

// Emit selected card for viewing
export function emitRiftboundCardView(io, cardSelected) {
    // check if card selected is in the list
    const cardName = Object.keys(cardListData).find(
        name => name.toLowerCase() === cardSelected['card-selected'].toLowerCase()
    )
    let foundCard = {
        name: '',
        url: '',
        type: '',
        'card-id': cardSelected['card-id']
    }
    if (cardName) {
        const url = cardSelected['variant-url'] || cardListData[cardName]?.imageUrl;
        foundCard = {
            name: cardName,
            url,
            type: cardListData[cardName]?.type,
            'card-id': cardSelected['card-id']
        }
    }
    RoomUtils.emitWithRoomMapping(io, 'riftbound-card-view-card-selected', foundCard);
}

// transform incoming deck list data to create deck object
export function transformDeckData(deckListData) {
    const deckObject = [];
    deckListData.forEach(card => {
        // Split the card string into count and name
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card]; // Default count to 1 if no number is found
        const cardCount = parseInt(parts[1], 10); // Get the count
        const _cardName = parts[2]; // Get the card name
        const cardName = Object.keys(cardListData).find(
            name => name.toLowerCase() === _cardName.toLowerCase()
        )
        if (cardName) {
            deckObject.push({
                'card-name': cardName,
                'card-count': cardCount,
                'card-url': cardListData[cardName]
            });
        }
    });
    return deckObject;
}

// handle incoming deck list data and emit to formatted object to listeners
export function handleRiftboundIncomingDeckData(io, deckListData) {
    try {
        // Validate deckListData structure
        if (!deckListData || typeof deckListData !== 'object') {
            console.error('Invalid deckListData received:', deckListData);
            return;
        }

        const deckData = Array.isArray(deckListData['deckList']) ? deckListData['deckList'] : [];
        const index = typeof deckListData['index'] === 'number' ? deckListData['index'] : null;

        // Validate index and deckData
        if (index === null) {
            console.error('Invalid index received:', index);
            return;
        }

        if (deckData.length === 0) {
            console.warn('Empty deck data received for index:', index);
            return;
        }

        // Transform deck data
        const formattedData = transformDeckData(deckData);

        // Validate formatted data
        if (!formattedData || typeof formattedData !== 'object') {
            console.error('Failed to transform deck data:', deckData);
            return;
        }

        const data2send = {
            index: index,
            data: formattedData
        };

        // Emit only if data is properly formatted
        RoomUtils.emitWithRoomMapping(io, 'riftbound-deck-data-from-server', data2send);
        console.log('Deck data sent successfully for index:', index);

    } catch (error) {
        console.error('Error in handleRiftboundIncomingDeckData:', error);
    }
}
