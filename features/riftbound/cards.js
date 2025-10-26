import {promises as fs} from 'fs';
import {cardListDataPath} from '../../config/riftbound/constants.js';
import { RoomUtils } from '../../utils/room-utils.js';

let cardListData = [];

// Load card list from file
export async function loadCardListData() {
    try {
        const data = await fs.readFile(cardListDataPath, 'utf8');
        cardListData = JSON.parse(data);
        console.log('Riftbound Card list data loaded.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Card list file not found. Starting with empty list.');
            cardListData = [];
        } else {
            console.error('Error loading card list data:', error);
            cardListData = [];
        }
    }
}

// Get the current card list
export function getCardListData() {
    return cardListData;
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
        foundCard = {
            name: cardName,
            url: cardListData[cardName]?.imageUrl,
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
