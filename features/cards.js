import {getCardListData as mtgGetCardListData} from "./mtg/cards.js";
import {getCardListData as vibesGetCardListData} from "./vibes/cards.js";
import {getCardListData as riftboundGetCardListData} from "./riftbound/cards.js";
import { emitStarWarsCardView, transformDeckData as starwarsTransformDeckData } from "./starwars/cards.js";
import { RoomUtils } from '../utils/room-utils.js';

// Re-export MTG-specific functions for backward compatibility
export { loadCardListData, getCardListData, emitMTGCardList } from "./mtg/cards.js";

function normalizeName(str, gameType) {
    if (gameType === 'vibes') {
        str = validateName(str, gameType);
    }
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/\s*\(.*?\)$/, '')     // remove set info
        .replace(/^"+|"+$/g, '')        // strip quotes
        .replace(/&/g, 'and')           // replace ampersands
        .trim();
}

//Validate names for cards where publishers don't auto-validate 
//Current use case is for Vibes, Melee (player ingest website) does not auto validate apparently
function validateName(str, gameType) {
    if (gameType === 'vibes') {
        return str
            .replace(/[^\w\s]/g, '')             // remove punctuation
            .replace(/\s+/g, '')                 // remove ALL spaces, not just trim
            .toLowerCase();                      // force lowercase
    } else {
        return str;
    }
}

function createCleanedCardMap(cardsList, gameType) {
    const cleanedMap = {};
    for (const originalName in cardsList) {
        const cleaned = normalizeName(originalName, gameType);
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
        const cleanedName = normalizeName(singleFace, cardSelected['game-id']);

        // Clean the card list data
        const cleanedCardListData = createCleanedCardMap(mtgGetCardListData(), cardSelected['game-id']);

        // get card url from json (case-insensitive lookup)
        const matchedKey = Object.keys(cleanedCardListData).find(
            key => key.toLowerCase() === cleanedName.toLowerCase()
        );
        const cardURL = matchedKey ? cleanedCardListData[matchedKey]?.imageUrl : undefined;

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
    if (cardSelected['game-id'] === 'starwars') {
        // Delegate parsing and emitting to the starwars feature module
        emitStarWarsCardView(io, cardSelected);
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

export function emitTransformedDraftList(deckData, gameType, sideID, matchID, io) {
    let data2send = {
        gameType: gameType,
        deckData: deckData,
        sideID: sideID,
        matchID: matchID
    }
    RoomUtils.emitWithRoomMapping(io, 'transformed-draft-list-data', data2send);
}

function getURLFromCardName(cardName, cardsList, gameType) {
    let cleaned = cardName.includes('//')
        ? cardName.split('//')[0].trim()
        : cardName.trim();

    cleaned = normalizeName(cleaned, gameType);
    if (gameType === 'mtg') {
        // New structure: { imageUrl, manaCost }
        return cardsList[cleaned]?.imageUrl;
    } else if (gameType === 'vibes') {
        return cardsList[cleaned];
    } else {
        return cardsList[cleaned]?.imageUrl;
    }
}

function getManaCostFromCardName(cardName, cardsList, gameType) {
    if (gameType !== 'mtg') return '';

    let cleaned = cardName.includes('//')
        ? cardName.split('//')[0].trim()
        : cardName.trim();

    cleaned = normalizeName(cleaned, gameType);
    return cardsList[cleaned]?.manaCost || '';
}


// use main deck data to get urls, counts and name
export function transformMainDeck(data, io) {
    let cleanedCardsMap = {};
    let gameType = data.gameType;
    let deckArray = data.deckData;
    let sideID = data.sideID;
    let matchID = data.matchID;
    if (gameType === 'starwars') {
        // Delegate deck transformation to starwars feature (handles set-scoped keys)
        const formatted = starwarsTransformDeckData(deckArray);
        emitTransformedMainDeck(formatted, gameType, sideID, matchID, io);
        return;
    }
    if (gameType === 'mtg') {
        cleanedCardsMap = createCleanedCardMap(mtgGetCardListData(), gameType);
    } else if (gameType === 'riftbound') {
        const riftboundCards = riftboundGetCardListData();
        cleanedCardsMap = createCleanedCardMap(riftboundCards, gameType);
    } else if (gameType === 'vibes') {
        const vibesCards = vibesGetCardListData();
        cleanedCardsMap = createCleanedCardMap(vibesCards, gameType);
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
            const manaCost = getManaCostFromCardName(name, cleanedCardsMap, gameType);

            flatDeck.push({
                'card-name': name,
                'card-count': count,
                'card-url': url,
                'mana-cost': manaCost
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
    if (gameType === 'starwars') {
        // Delegate side-deck transformation to starwars feature
        const formatted = starwarsTransformDeckData(deckArray);
        emitTransformedSideDeck(formatted, gameType, sideID, matchID, io);
        return;
    }
    if (gameType === 'mtg') {
        cleanedCardsMap = createCleanedCardMap(mtgGetCardListData(), gameType);
    } else if (gameType === 'riftbound') {
        const riftboundCards = riftboundGetCardListData();
        cleanedCardsMap = createCleanedCardMap(riftboundCards, gameType);
    } else if (gameType === 'vibes') {
        const vibesCards = vibesGetCardListData();
        cleanedCardsMap = createCleanedCardMap(vibesCards, gameType);
    }

    // same flat structure for side deck regardless of game type
    // flat array structure ---
    const flatDeck = [];
    deckArray.forEach(card => {
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
        const count = parseInt(parts[1], 10);
        const name = parts[2];
        const url = getURLFromCardName(name, cleanedCardsMap, gameType);
        const manaCost = getManaCostFromCardName(name, cleanedCardsMap, gameType);

        flatDeck.push({
            'card-name': name,
            'card-count': count,
            'card-url': url,
            'mana-cost': manaCost
        });
    });

    emitTransformedSideDeck(flatDeck, gameType, sideID, matchID, io);
}

// Transform draft list data - similar to main deck but for draft picks
// Pack headers (Pack 1, Pack 2, Pack 3) are passed through without lookup
export function transformDraftList(data, io) {
    let cleanedCardsMap = {};
    let gameType = data.gameType;
    let deckArray = data.deckData; // Array of card lines (same format as main deck)
    let sideID = data.sideID;
    let matchID = data.matchID;

    if (gameType === 'mtg') {
        cleanedCardsMap = createCleanedCardMap(mtgGetCardListData(), gameType);
    } else if (gameType === 'riftbound') {
        const riftboundCards = riftboundGetCardListData();
        cleanedCardsMap = createCleanedCardMap(riftboundCards, gameType);
    }

    const flatDeck = [];
    deckArray.forEach(card => {
        // Handle both "CardName" and "1 CardName" formats
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
        const name = parts[2];
        const cardLower = name.toLowerCase().trim();

        // Check if this is a pack header
        if (cardLower === 'pack 1' || cardLower === 'pack 2' || cardLower === 'pack 3') {
            flatDeck.push({
                'card-name': name,
                'card-count': 0,
                'card-url': '',
                'mana-cost': ''
            });
        } else {
            const url = getURLFromCardName(name, cleanedCardsMap, gameType);
            const manaCost = getManaCostFromCardName(name, cleanedCardsMap, gameType);

            flatDeck.push({
                'card-name': name,
                'card-count': 1, // Always 1 for draft picks
                'card-url': url,
                'mana-cost': manaCost
            });
        }
    });

    emitTransformedDraftList(flatDeck, gameType, sideID, matchID, io);
}
