import {promises as fs} from 'fs';
import {cardListDataPath} from '../../config/vibes/constants.js';

let cardListData = [];

// Load card list from file
export async function loadCardListData() {
    try {
        const data = await fs.readFile(cardListDataPath, 'utf8');
        cardListData = JSON.parse(data);
        console.log('Vibes Card list data loaded.');
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
export function emitVibesCardList(io) {
    io.emit('vibes-card-list-data', {cardListData});
}

// Emit selected card for viewing
export function emitVibesCardView(io, cardSelected) {
    // check if card selected is in the list
    const cardName = Object.keys(cardListData).find(
        name => name.toLowerCase() === cardSelected['card-selected'].toLowerCase()
    )
    if (cardName) {
        const foundCard = {
            name: cardName,
            url: cardListData[cardName],
            'card-id': cardSelected['card-id']
        }
        io.emit('vibes-card-view-card-selected', foundCard);
    }
}
