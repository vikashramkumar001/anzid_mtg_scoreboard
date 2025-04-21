export function emitMetaBreakdownData(io, data) {
    io.emit('receive-meta-breakdown-data', data);
}

export function handleMetaBreakdownCard(cardName) {
    // For double-faced cards, use only the first face name before the "//"
    const singleFace = cardName.includes('//')
        ? cardName.split('//')[0].trim()
        : cardName.trim();

    // Remove leading/trailing quotes and sanitize
    const cleanedName = singleFace.replace(/^"+|"+$/g, '').replace(/&/g, 'and');

    // Set the card URL
    const cardURL = `https://api.scryfall.com/cards/named?exact=${cleanedName}&format=image`;

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