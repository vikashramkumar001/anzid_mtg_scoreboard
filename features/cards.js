import {promises as fs} from 'fs';
import {cardListDataPath} from '../config/constants.js';
import {getCardListData as vibesGetCardListData} from "./vibes/cards.js";
import {getCardListData as riftboundGetCardListData} from "./riftbound/cards.js";
import { RoomUtils } from '../utils/room-utils.js';

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
    RoomUtils.emitWithRoomMapping(io, 'mtg-card-list-data', {cardListData});
}

function normalizeName(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/\s*\(.*?\)$/, '')     // remove set info
        .replace(/^"+|"+$/g, '')        // strip quotes
        .replace(/&/g, 'and')           // replace ampersands
        .trim();
}

function createCleanedCardMap(cardsList) {
    const cleanedMap = {};
    for (const originalName in cardsList) {
        const cleaned = normalizeName(originalName);
        // Only store the first match for a cleaned name
        if (!cleanedMap[cleaned]) {
            cleanedMap[cleaned] = cardsList[originalName];
        }
        // add original name as well
        cleanedMap[originalName] = cardsList[originalName];
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
            RoomUtils.emitWithRoomMapping(io, 'vibes-card-view-card-selected', cardData);
        } else {
            const cardData = {
                name: '',
                url: '',
                'card-id': cardSelected['card-id'],
                'game-id': cardSelected['game-id']
            }
            RoomUtils.emitWithRoomMapping(io, 'vibes-card-view-card-selected', cardData);
        }
    }
    if (cardSelected['game-id'] === 'mtg') {
        // For double-faced cards, use only the first face name before the "//"
        const singleFace = cardSelected['card-selected'].includes('//')
            ? cardSelected['card-selected'].split('//')[0].trim()
            : cardSelected['card-selected'].trim();

        // Remove leading/trailing quotes and sanitize
        const cleanedName = normalizeName(singleFace);

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
        RoomUtils.emitWithRoomMapping(io, 'card-view-card-selected', cardData);
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
            RoomUtils.emitWithRoomMapping(io, 'riftbound-card-view-card-selected', cardData);
        } else {
            const cardData = {
                name: '',
                url: '',
                type: '',
                'card-id': cardSelected['card-id'],
                'game-id': cardSelected['game-id']
            }
            RoomUtils.emitWithRoomMapping(io, 'riftbound-card-view-card-selected', cardData);
        }
    }
}

// emit card main / side deck
export function emitTransformedMainDeck(deckData, gameType, sideID, matchID, io) {
    let data2send = {
        gameType: gameType,
        deckData: deckData,
        sideID: sideID,
        matchID: matchID
    }
    RoomUtils.emitWithRoomMapping(io, 'transformed-main-deck-data', data2send);
}
export function emitTransformedSideDeck(deckData, gameType, sideID, matchID, io) {
    let data2send = {
        gameType: gameType,
        deckData: deckData,
        sideID: sideID,
        matchID: matchID
    }
    RoomUtils.emitWithRoomMapping(io, 'transformed-side-deck-data', data2send);
}

function getURLFromCardName(cardName, cardsList, gameType) {
    let cleaned = cardName.includes('//')
        ? cardName.split('//')[0].trim()
        : cardName.trim();

    cleaned = normalizeName(cleaned);

    if (gameType === 'mtg') {
        return cardsList[cleaned];
    } else {
        return cardsList[cleaned]?.imageUrl;
    }
}


// use main deck data to get urls, counts and name
export function transformMainDeck(data, io) {
    let cleanedCardsMap = {};
    let gameType = data.gameType;
    let deckArray = data.deckData;
    let sideID = data.sideID;
    let matchID = data.matchID;
    if (gameType === 'mtg') {
        cleanedCardsMap = createCleanedCardMap(cardListData);
    } else if (gameType === 'riftbound') {
        const riftboundCards = riftboundGetCardListData();
        cleanedCardsMap = createCleanedCardMap(riftboundCards);
    }

    // --- Riftbound: categorized structure ---
    if (gameType === 'riftbound') {
        const categorizedDeck = {
            legend: [],
            runes: [],
            battlefields: [],
            other: []
        };

        deckArray.forEach(card => {
            const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
            const count = parseInt(parts[1], 10);
            const name = parts[2];
            const url = getURLFromCardName(name, cleanedCardsMap, gameType);
            const type = cleanedCardsMap[name]?.type || 'Other';

            const cardEntry = {
                'card-name': name,
                'card-count': count,
                'card-url': url
            };

            if (type === 'Legend') {
                categorizedDeck.legend.push(cardEntry);
            } else if (type === 'Rune') {
                categorizedDeck.runes.push(cardEntry);
            } else if (type === 'Battlefield') {
                categorizedDeck.battlefields.push(cardEntry);
            } else {
                categorizedDeck.other.push(cardEntry);
            }
        });

        emitTransformedMainDeck(categorizedDeck, gameType, sideID, matchID, io);
    } else {
        // --- MTG and others: flat array structure ---
        const flatDeck = [];
        deckArray.forEach(card => {
            const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
            const count = parseInt(parts[1], 10);
            const name = parts[2];
            const url = getURLFromCardName(name, cleanedCardsMap, gameType);

            flatDeck.push({
                'card-name': name,
                'card-count': count,
                'card-url': url
            });
        });

        emitTransformedMainDeck(flatDeck, gameType, sideID, matchID, io);
    }
}

// use side deck data to get urls, counts and name
export function transformSideDeck(data, io) {
    let cleanedCardsMap = {};
    let gameType = data.gameType;
    let deckArray = data.deckData;
    let sideID = data.sideID;
    let matchID = data.matchID;
    if (gameType === 'mtg') {
        cleanedCardsMap = createCleanedCardMap(cardListData);
    } else if (gameType === 'riftbound') {
        const riftboundCards = riftboundGetCardListData();
        cleanedCardsMap = createCleanedCardMap(riftboundCards);
    }

    // same flat structure for side deck regardless of game type
    // flat array structure ---
    const flatDeck = [];
    deckArray.forEach(card => {
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
        const count = parseInt(parts[1], 10);
        const name = parts[2];
        const url = getURLFromCardName(name, cleanedCardsMap, gameType);

        flatDeck.push({
            'card-name': name,
            'card-count': count,
            'card-url': url
        });
    });

    emitTransformedSideDeck(flatDeck, gameType, sideID, matchID, io);
}
