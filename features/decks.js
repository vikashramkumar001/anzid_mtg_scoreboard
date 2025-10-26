import {
    getControlData
} from './control.js';


import { RoomUtils } from '../utils/room-utils.js';

export function emitDeckDisplay(io, deckData) {
    RoomUtils.emitWithRoomMapping(io, 'deck-display-update', deckData);
}

export function updateDeckDisplay(io, {round_id, match_id, side}) {
    const controlData = getControlData();

    if (!controlData[round_id] || !controlData[round_id][match_id]) return;

    const matchData = controlData[round_id][match_id];

    const deckData = {
        mainDeck: matchData[`player-main-deck-${side}`] || [],
        sideDeck: matchData[`player-side-deck-${side}`] || [],
        playerName: matchData[`player-name-${side}`] || 'Unknown Player',
        archetype: matchData[`player-archetype-${side}`] || 'Unknown Archetype'
    };

    emitDeckDisplay(io, deckData);
}
