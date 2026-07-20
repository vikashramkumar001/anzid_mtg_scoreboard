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

// Riftbound deck ordering: Units, then Spells, then Gears (anything else after),
// and within each card type by energy ascending (name as a final tiebreak).
// Cards must carry `type` and `energy` (string) — attached during transform.
const RIFTBOUND_TYPE_ORDER = { Unit: 0, Spell: 1, Gear: 2 };
function sortRiftboundDeckCards(cards) {
    return cards.sort((a, b) => {
        const ta = RIFTBOUND_TYPE_ORDER[a.type] ?? 99;
        const tb = RIFTBOUND_TYPE_ORDER[b.type] ?? 99;
        if (ta !== tb) return ta - tb;
        const ea = parseInt(a.energy, 10);
        const eb = parseInt(b.energy, 10);
        const eaN = Number.isNaN(ea) ? 99 : ea;
        const ebN = Number.isNaN(eb) ? 99 : eb;
        if (eaN !== ebN) return eaN - ebN;
        return String(a['card-name'] || '').localeCompare(String(b['card-name'] || ''));
    });
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
        // Prefer a variant URL if the operator picked a specific printing
        // from the Scryfall prints thumbnail grid; fall back to the default
        // art stored in the local card list.
        const cardURL = cardSelected['variant-url']
            || (matchedKey ? cleanedCardListData[matchedKey]?.imageUrl : undefined);

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

    // Full-name starter card: some starter legends are keyed by the FULL legend
    // name + " - Starter" (e.g. "Annie, Dark Child" → "Annie, Dark Child - Starter"),
    // not just the title suffix — try that before stripping the character name.
    url = getURLFromCardName(legendTitle + ' - Starter', cleanedCardsMap, gameType);
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


// Pure transform: returns { deckData, gameType, sideID, matchID } without emitting
export function transformMainDeckPure(data) {
    let cleanedCardsMap = {};
    let gameType = data.gameType;
    let deckArray = data.deckData;
    let sideID = data.sideID;
    let matchID = data.matchID;
    if (gameType === 'starwars') {
        const formatted = starwarsTransformDeckData(deckArray);
        return { deckData: formatted, gameType, sideID, matchID };
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

    if (gameType === 'riftbound') {
        const meta = data.riftboundMeta || {};
        const legendImageUrl = meta.legend ? resolveRiftboundLegendUrl(meta.legend, cleanedCardsMap, gameType) : '';
        const championImageUrl = meta.champion ? getURLFromCardName(meta.champion, cleanedCardsMap, gameType) || '' : '';
        const battlefields = (meta.battlefields || [])
            .filter(name => name && name.trim())
            .map(name => ({ name: name.trim() }));
        const runes = [];
        if (meta.runeColor1) {
            runes.push({ letter: meta.runeColor1.toLowerCase(), count: parseInt(meta.runeQty1, 10) || 0 });
            if (meta.runeColor2) runes.push({ letter: meta.runeColor2.toLowerCase(), count: parseInt(meta.runeQty2, 10) || 0 });
        } else if (meta.runesString) {
            const letters = meta.runesString.toLowerCase().split('').filter(ch => 'rgbopy'.includes(ch));
            const unique = [...new Set(letters)];
            unique.forEach(letter => runes.push({ letter, count: 0 }));
        }
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
                runeCountFallback.push({ name, count });
            } else {
                other.push({ 'card-name': name, 'card-count': count, 'card-url': url, type, energy: cleanedCardsMap[name]?.energy });
            }
        });
        // Order: Units, Spells, Gears — then by energy ascending.
        sortRiftboundDeckCards(other);
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
        const categorizedDeck = { legendImageUrl, championImageUrl, battlefields, runes, runesString: meta.runesString || '', other };
        return { deckData: categorizedDeck, gameType, sideID, matchID };
    } else {
        const flatDeck = [];
        deckArray.forEach(card => {
            const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
            const count = parseInt(parts[1], 10);
            const name = parts[2];
            const url = getURLFromCardName(name, cleanedCardsMap, gameType);
            const manaCost = getManaCostFromCardName(name, cleanedCardsMap, gameType);
            flatDeck.push({ 'card-name': name, 'card-count': count, 'card-url': url, 'mana-cost': manaCost });
        });
        return { deckData: flatDeck, gameType, sideID, matchID };
    }
}

// Wrapper: transforms and emits (backward compatible)
export function transformMainDeck(data, io) {
    const result = transformMainDeckPure(data);
    emitTransformedMainDeck(result.deckData, result.gameType, result.sideID, result.matchID, io);
}

// Pure transform: returns { deckData, gameType, sideID, matchID } without emitting
export function transformSideDeckPure(data) {
    let cleanedCardsMap = {};
    let gameType = data.gameType;
    let deckArray = data.deckData;
    let sideID = data.sideID;
    let matchID = data.matchID;
    if (gameType === 'starwars') {
        const formatted = starwarsTransformDeckData(deckArray);
        return { deckData: formatted, gameType, sideID, matchID };
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
    const flatDeck = [];
    deckArray.forEach(card => {
        const parts = card.match(/^(\d+)\s+(.*)$/) || [null, '1', card];
        const count = parseInt(parts[1], 10);
        const name = parts[2];
        const url = getURLFromCardName(name, cleanedCardsMap, gameType);
        const manaCost = getManaCostFromCardName(name, cleanedCardsMap, gameType);
        const entry = { 'card-name': name, 'card-count': count, 'card-url': url, 'mana-cost': manaCost };
        if (gameType === 'riftbound') {
            entry.type = cleanedCardsMap[name]?.type || 'Other';
            entry.energy = cleanedCardsMap[name]?.energy;
        }
        flatDeck.push(entry);
    });
    // Riftbound sideboard follows the same Units → Spells → Gears, then energy order.
    if (gameType === 'riftbound') sortRiftboundDeckCards(flatDeck);
    return { deckData: flatDeck, gameType, sideID, matchID };
}

// Wrapper: transforms and emits (backward compatible)
export function transformSideDeck(data, io) {
    const result = transformSideDeckPure(data);
    emitTransformedSideDeck(result.deckData, result.gameType, result.sideID, result.matchID, io);
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
