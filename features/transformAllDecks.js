import { transformMainDeckPure, transformSideDeckPure, emitTransformedMainDeck, emitTransformedSideDeck } from './cards.js';
import { cacheTransform, invalidateCache } from './transformCache.js';
import { getGameSelection } from '../config/constants.js';

// Server-side transform: transforms all decks for a round and emits + caches results
export function transformAndEmitAllDecks(roundId, controlData, io) {
    const gameType = getGameSelection();
    const matchIds = ['match1', 'match2', 'match3', 'match4'];
    const sideIds = ['left', 'right'];

    invalidateCache();

    for (const matchID of matchIds) {
        const matchData = controlData[roundId]?.[matchID];
        if (!matchData) continue;

        for (const sideID of sideIds) {
            // Main deck
            const mainDeckRaw = matchData[`player-main-deck-${sideID}`] || [];
            if (mainDeckRaw.length > 0 || gameType === 'riftbound') {
                const payload = { deckData: mainDeckRaw, gameType, sideID, matchID };
                if (gameType === 'riftbound') {
                    payload.riftboundMeta = {
                        legend: matchData[`player-legend-${sideID}`] || '',
                        champion: matchData[`player-champion-${sideID}`] || '',
                        battlefields: [
                            matchData[`player-battlefield-1-${sideID}`] || '',
                            matchData[`player-battlefield-2-${sideID}`] || '',
                            matchData[`player-battlefield-3-${sideID}`] || ''
                        ],
                        runeColor1: matchData[`player-rune-color-1-${sideID}`] || '',
                        runeQty1: matchData[`player-rune-qty-1-${sideID}`] || '',
                        runeColor2: matchData[`player-rune-color-2-${sideID}`] || '',
                        runeQty2: matchData[`player-rune-qty-2-${sideID}`] || '',
                        runesString: matchData[`player-runes-${sideID}`] || ''
                    };
                }
                const mainResult = transformMainDeckPure(payload);
                emitTransformedMainDeck(mainResult.deckData, mainResult.gameType, mainResult.sideID, mainResult.matchID, io);
                cacheTransform(roundId, matchID, sideID, mainResult, null);
            }

            // Side deck
            const sideDeckRaw = matchData[`player-side-deck-${sideID}`] || [];
            if (sideDeckRaw.length > 0) {
                const sidePayload = { deckData: sideDeckRaw, gameType, sideID, matchID };
                const sideResult = transformSideDeckPure(sidePayload);
                emitTransformedSideDeck(sideResult.deckData, sideResult.gameType, sideResult.sideID, sideResult.matchID, io);
                cacheTransform(roundId, matchID, sideID, null, sideResult);
            }
        }
    }
    console.log(`[Broadcast] Server-side transforms complete for round ${roundId}`);
}
