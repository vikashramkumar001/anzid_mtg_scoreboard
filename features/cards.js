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
            const url = cardSelected['variant-url'] || riftboundCards[cardName]?.imageUrl;
            const cardData = {
                name: cardName,
                url,
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

function resolveRiftboundLegendUrl(legendTitle, cleanedCardsMap, gameType) {
    // Try exact match first (e.g. "Glorious Executioner" typed directly)
    let url = getURLFromCardName(legendTitle, cleanedCardsMap, gameType);
    if (url) return url;

    // Strip character name: "Draven, Glorious Executioner" → "Glorious Executioner"
    const commaIdx = legendTitle.indexOf(',');
    if (commaIdx !== -1) {
        const suffix = legendTitle.substring(commaIdx + 1).trim();
        url = getURLFromCardName(suffix, cleanedCardsMap, gameType);
        if (url) return url;

        // Starter deck legends: "Dark Child" → "Dark Child - Starter"
        url = getURLFromCardName(suffix + ' - Starter', cleanedCardsMap, gameType);
        if (url) return url;
    }

    return '';
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
    // Legend, champion, battlefields, runes are resolved from master control fields (riftboundMeta).
    // The textarea is filtered to only "other" cards (units, spells, gear).
    if (gameType === 'riftbound') {
        const meta = data.riftboundMeta || {};
        console.log(`[Riftbound Debug] transform-main-deck-data from SOURCE="${data.source || 'UNKNOWN'}" matchID=${matchID} sideID=${sideID}`);
        console.log(`[Riftbound Debug] riftboundMeta keys: ${Object.keys(meta).join(', ') || 'EMPTY'}, legend="${meta.legend || ''}", champion="${meta.champion || ''}"`);
        console.log(`[Riftbound Debug] deckData: ${Array.isArray(deckArray) ? deckArray.length + ' cards' : 'not array'}`);

        // Resolve image URLs for legend and champion from master control field names
        // Legend titles like "Draven, Glorious Executioner" → card data key is "Glorious Executioner"
        const legendImageUrl = meta.legend ? resolveRiftboundLegendUrl(meta.legend, cleanedCardsMap, gameType) : '';
        const championImageUrl = meta.champion ? getURLFromCardName(meta.champion, cleanedCardsMap, gameType) || '' : '';

        // Battlefields from master control fields (filter out empty strings)
        const battlefields = (meta.battlefields || [])
            .filter(name => name && name.trim())
            .map(name => ({ name: name.trim() }));

        // Runes from master control fields (individual color/qty fields, or fallback to runesString)
        const runes = [];
        if (meta.runeColor1) {
            runes.push({ letter: meta.runeColor1.toLowerCase(), count: parseInt(meta.runeQty1, 10) || 0 });
            if (meta.runeColor2) runes.push({ letter: meta.runeColor2.toLowerCase(), count: parseInt(meta.runeQty2, 10) || 0 });
        } else if (meta.runesString) {
            // Fallback: parse runesString (e.g. "gp" → [{letter:'g'}, {letter:'p'}])
            const letters = meta.runesString.toLowerCase().split('').filter(ch => 'rgbopy'.includes(ch));
            const unique = [...new Set(letters)];
            unique.forEach(letter => runes.push({ letter, count: 0 }));
        }

        // Filter textarea to only "other" cards (skip Legend, Rune, Battlefield types)
        const other = [];
        let runeCountFallback = [];
        deckArray.forEach(card => {
            const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
            const count = parseInt(parts[1], 10);
            const name = parts[2];
            const url = getURLFromCardName(name, cleanedCardsMap, gameType);
            const type = cleanedCardsMap[name]?.type || 'Other';

            if (type === 'Legend' || type === 'Battlefield') {
                // Skip — sourced from master control fields
            } else if (type === 'Rune') {
                // Track for fallback rune counts if master control qty fields are empty
                runeCountFallback.push({ name, count });
            } else {
                other.push({ 'card-name': name, 'card-count': count, 'card-url': url });
            }
        });

        // Fallback: if rune qty fields were empty, use counts parsed from textarea
        if (runes.length > 0 && runes.every(r => r.count === 0) && runeCountFallback.length > 0) {
            const runeLetterToName = { 'g': 'calm', 'p': 'chaos', 'r': 'fury', 'b': 'mind', 'y': 'order', 'o': 'body' };
            for (const rune of runes) {
                const runeName = runeLetterToName[rune.letter];
                if (runeName) {
                    const match = runeCountFallback.find(rc => rc.name.toLowerCase().includes(runeName));
                    if (match) rune.count = match.count;
                }
            }
        }

        const categorizedDeck = {
            legendImageUrl,
            championImageUrl,
            battlefields,
            runes,
            runesString: meta.runesString || '',
            other
        };

        console.log('[Riftbound Debug] Resolved categorizedDeck:');
        console.log('  Legend:', meta.legend, '→', legendImageUrl ? 'URL found' : 'NO URL');
        console.log('  Champion:', meta.champion, '→', championImageUrl ? 'URL found' : 'NO URL');
        console.log('  Battlefields:', battlefields.map(b => b.name));
        console.log('  Runes:', runes);
        console.log('  Other cards:', other.length);

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
