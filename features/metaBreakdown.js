import {getCardListData} from "./cards.js";

import { RoomUtils } from '../utils/room-utils.js';

export function emitMetaBreakdownData(io, data) {
    RoomUtils.emitWithRoomMapping(io, 'receive-meta-breakdown-data', data);
}

export function handleMetaBreakdownCard(cardName) {
    // get card list from server
    const mtgCardList = getCardListData();
    // For double-faced cards, use only the first face name before the "//"
    const singleFace = cardName.includes('//')
        ? cardName.split('//')[0].trim()
        : cardName.trim();

    // Remove leading/trailing quotes and sanitize
    const cleanedName = singleFace.replace(/^"+|"+$/g, '').replace(/&/g, 'and');

    // Set the card URL
    const cardURL = mtgCardList[cleanedName];

    return {
        name: cardName,
        url: cardURL
    }
}

export function handleIncomingMetaBreakdownData(io, data) {
    // handle adding card urls 
    // find keys that map to cards
    Object.keys(data).forEach(function(key){
       if (key && key.includes('meta-breakdown-key-card')){
           data[key] = handleMetaBreakdownCard(data[key]);
       }
    });
    // simply emit to listeners
    emitMetaBreakdownData(io, data);
}