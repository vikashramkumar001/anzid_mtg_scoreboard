import {promises as fs} from 'fs';
import {cardListDataPath} from '../../config/mtg/constants.js';
import { RoomUtils } from '../../utils/room-utils.js';

let cardListData = [];

// Load MTG card list from file
export async function loadCardListData() {
    try {
        const data = await fs.readFile(cardListDataPath, 'utf8');
        cardListData = JSON.parse(data);
        console.log('MTG Card list data loaded.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('MTG Card list file not found. Starting with empty list.');
            cardListData = [];
        } else {
            console.error('Error loading MTG card list data:', error);
            cardListData = [];
        }
    }
}

// Get the current MTG card list
export function getCardListData() {
    return cardListData;
}

// Emit full MTG card list to clients
export function emitMTGCardList(io) {
    RoomUtils.emitWithRoomMapping(io, 'mtg-card-list-data', {cardListData});
}
