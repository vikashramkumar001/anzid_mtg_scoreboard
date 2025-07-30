import {promises as fs} from 'fs';
import {cardListDataPath} from '../config/constants.js';
import {getCardListData as vibesGetCardListData} from "./vibes/cards.js";
import {getCardListData as riftboundGetCardListData} from "./riftbound/cards.js";

let cardListData = [];

// Load card list from file
export async function loadCardListData() {
    try {
        const data = await fs.readFile(cardListDataPath, 'utf8');
        cardListData = JSON.parse(data);
        console.log('Card list data loaded.');
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
export function emitMTGCardList(io) {
    io.emit('mtg-card-list-data', {cardListData});
}

function createCleanedCardMap(cardsList) {
    const cleanedMap = {};

    for (const originalName in cardsList) {
        const cleaned = originalName
            .replace(/\s*\(.*?\)$/, '') // remove trailing (set info)
            .replace(/^"+|"+$/g, '')    // remove quotes
            .replace(/&/g, 'and')       // replace &
            .trim();

        // Only store the first match for a cleaned name
        if (!cleanedMap[cleaned]) {
            cleanedMap[cleaned] = cardsList[originalName];
        }
    }

    return cleanedMap;
}

// Emit selected card for viewing
export function emitCardView(io, cardSelected) {
    // this should cater for game id being passed - mtg / vibes
    // we want process the card selected and send the url to frontend to display only - no computation on frontend
    if (cardSelected['game-id'] === 'vibes') {
        const vibesCards = vibesGetCardListData();
        // check if card selected is in the list
        const cardName = Object.keys(vibesCards).find(
            name => name.toLowerCase() === cardSelected['card-selected'].toLowerCase()
        )
        if (cardName) {
            const cardData = {
                name: cardName,
                url: vibesCards[cardName],
                'card-id': cardSelected['card-id'],
                'game-id': cardSelected['game-id']
            }
            io.emit('vibes-card-view-card-selected', cardData);
        } else {
            const cardData = {
                name: '',
                url: '',
                'card-id': cardSelected['card-id'],
                'game-id': cardSelected['game-id']
            }
            io.emit('vibes-card-view-card-selected', cardData);
        }
    }
    if (cardSelected['game-id'] === 'mtg') {
        // For double-faced cards, use only the first face name before the "//"
        const singleFace = cardSelected['card-selected'].includes('//')
            ? cardSelected['card-selected'].split('//')[0].trim()
            : cardSelected['card-selected'].trim();

        // Remove leading/trailing quotes and sanitize
        const cleanedName = singleFace.replace(/^"+|"+$/g, '').replace(/&/g, 'and');

        // Clean the card list data
        const cleanedCardListData = createCleanedCardMap(cardListData);

        // get card url from json
        const cardURL = cleanedCardListData[cleanedName];

        const cardData = {
            name: cardSelected['card-selected'],
            url: cardURL,
            'card-id': cardSelected['card-id'],
            'game-id': cardSelected['game-id']
        }
        console.log(cardData)
        io.emit('card-view-card-selected', cardData);
    }
    if (cardSelected['game-id'] === 'riftbound') {
        const riftboundCards = riftboundGetCardListData();
        // check if card selected is in the list
        const cardName = Object.keys(riftboundCards).find(
            name => name.toLowerCase() === cardSelected['card-selected'].toLowerCase()
        )
        if (cardName) {
            const cardData = {
                name: cardName,
                url: riftboundCards[cardName]?.imageUrl,
                type: riftboundCards[cardName]?.type,
                'card-id': cardSelected['card-id'],
                'game-id': cardSelected['game-id']
            }
            io.emit('riftbound-card-view-card-selected', cardData);
        } else {
            const cardData = {
                name: '',
                url: '',
                type: '',
                'card-id': cardSelected['card-id'],
                'game-id': cardSelected['game-id']
            }
            io.emit('riftbound-card-view-card-selected', cardData);
        }
    }
}
