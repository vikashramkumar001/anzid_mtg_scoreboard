import fetch from 'node-fetch';
import fs from 'fs';

const fallbackImageUrl = (cardName) =>
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=border_crop`;

// Art priority sets (higher priority = preferred)
// Lorwyn Eclipsed art and Special Guests are prioritized for this weekend
const PRIORITY_SETS = {
    'ecl': 100,   // Lorwyn Eclipsed - highest priority
    'spg': 99,    // Special Guests
};

function isValidCard(card) {
    const pngUrl = card.image_uris?.png || card.card_faces?.[0]?.image_uris?.png;
    const isCardBack = pngUrl?.includes('/png/back/');
    const isPromoOrAlt = card.promo || card.variation || card.textless;
    const isLegalAnywhere = Object.values(card.legalities || {}).some(val => val === 'legal');
    const isDigitalOnly = card.digital;
    const badSetTypes = ['masterpiece', 'funny', 'token', 'memorabilia'];

    const isAltSetType = badSetTypes.includes(card.set_type);

    // Allow priority sets through even if they have a "bad" set type (e.g., SPG is masterpiece)
    const isPrioritySet = PRIORITY_SETS[card.set?.toLowerCase()];

    return (
        pngUrl &&
        !isCardBack &&
        !isPromoOrAlt &&
        !isDigitalOnly &&
        isLegalAnywhere &&
        (isPrioritySet || !isAltSetType)
    );
}

// Calculate priority score for a card printing
// Higher score = more preferred
function getArtPriority(card) {
    const set = card.set?.toLowerCase() || '';
    const borderColor = card.border_color || '';
    const releasedAt = card.released_at || '9999-99-99';
    const frameEffects = card.frame_effects || [];

    // Check priority sets first
    if (PRIORITY_SETS[set]) {
        let score = PRIORITY_SETS[set] * 10000; // High multiplier to ensure priority sets win
        // Within priority sets, prefer standard art (black border, no showcase/extended)
        if (borderColor === 'black') {
            score += 1000;
        }
        // Penalize showcase, extended art, borderless variants
        if (frameEffects.includes('showcase') || frameEffects.includes('extendedart') || borderColor === 'borderless') {
            score -= 500;
        }
        return score;
    }

    // For non-priority sets, prefer black border + oldest art
    let score = 0;

    // Black border gets a base score
    if (borderColor === 'black') {
        score += 1000;
    }

    // Older cards get higher scores (invert the date)
    // Parse date and convert to days since epoch, then subtract from a large number
    try {
        const releaseDate = new Date(releasedAt);
        const daysSinceEpoch = Math.floor(releaseDate.getTime() / (1000 * 60 * 60 * 24));
        // Higher score for older cards (subtract from a large number)
        score += (20000 - daysSinceEpoch);
    } catch (e) {
        // If date parsing fails, give a low score
        score += 0;
    }

    return score;
}

// Check if a card is a split card (like Fire // Ice)
function isSplitCard(card) {
    return card.layout === 'split' || card.layout === 'aftermath' || card.layout === 'adventure' || card.layout === 'fuse';
}

async function fetchAndSaveCardFaceImages() {
    const bulkDataUrl = "https://api.scryfall.com/bulk-data";
    const outputFilePath = "../../data/cardNames.json";

    try {
        console.log("📦 Fetching bulk data metadata...");
        const bulkDataResponse = await fetch(bulkDataUrl);
        const bulkData = await bulkDataResponse.json();

        const defaultCardsData = bulkData.data.find(item => item.type === "default_cards");
        const defaultCardsUrl = defaultCardsData.download_uri;
        console.log(`⬇️ Downloading full card list from: ${defaultCardsUrl}`);

        const cardDataResponse = await fetch(defaultCardsUrl);
        const cards = await cardDataResponse.json();

        // Collect all printings for each card name to pick the best art
        const cardPrintings = {}; // cardName -> array of {card, priority}
        const splitCardData = {}; // For storing split card combined data

        console.log(`📊 Processing ${cards.length} cards...`);

        for (const card of cards) {
            if (!isValidCard(card)) continue;

            const priority = getArtPriority(card);

            if (card.card_faces && Array.isArray(card.card_faces)) {
                // Handle multi-face cards
                for (const face of card.card_faces) {
                    const faceName = face.name?.trim();
                    if (!faceName) continue;

                    const faceImage = face.image_uris?.png || card.image_uris?.png || fallbackImageUrl(faceName);
                    const faceManaCost = face.mana_cost || '';
                    const faceColors = face.colors || card.colors || [];
                    const faceCmc = card.cmc || 0; // CMC is on the card level, not face level

                    if (!cardPrintings[faceName]) {
                        cardPrintings[faceName] = [];
                    }
                    cardPrintings[faceName].push({
                        imageUrl: faceImage,
                        manaCost: faceManaCost,
                        colors: faceColors,
                        cmc: faceCmc,
                        priority: priority
                    });
                }

                // For split cards, also create a combined entry
                if (isSplitCard(card) && card.card_faces.length >= 2) {
                    const face1 = card.card_faces[0];
                    const face2 = card.card_faces[1];
                    const combinedName = `${face1.name?.trim()} // ${face2.name?.trim()}`;
                    const combinedManaCost = `${face1.mana_cost || ''} // ${face2.mana_cost || ''}`;
                    const combinedColors = [...new Set([...(face1.colors || []), ...(face2.colors || [])])];
                    const combinedImage = face1.image_uris?.png || card.image_uris?.png || fallbackImageUrl(face1.name);

                    if (!cardPrintings[combinedName]) {
                        cardPrintings[combinedName] = [];
                    }
                    cardPrintings[combinedName].push({
                        imageUrl: combinedImage,
                        manaCost: combinedManaCost,
                        colors: combinedColors,
                        cmc: card.cmc || 0,
                        priority: priority
                    });
                }
            } else {
                // Regular single-faced cards
                const cardName = card.name?.trim();
                if (!cardName) continue;

                const image = card.image_uris?.png || fallbackImageUrl(cardName);
                const manaCost = card.mana_cost || '';
                const colors = card.colors || [];
                const cmc = card.cmc || 0;

                if (!cardPrintings[cardName]) {
                    cardPrintings[cardName] = [];
                }
                cardPrintings[cardName].push({
                    imageUrl: image,
                    manaCost: manaCost,
                    colors: colors,
                    cmc: cmc,
                    priority: priority
                });
            }
        }

        console.log(`🎨 Selecting best art for ${Object.keys(cardPrintings).length} unique cards...`);

        // Select the best printing for each card
        const nameToData = {};
        for (const [cardName, printings] of Object.entries(cardPrintings)) {
            // Sort by priority (highest first) and pick the best
            printings.sort((a, b) => b.priority - a.priority);
            const best = printings[0];

            nameToData[cardName] = {
                imageUrl: best.imageUrl,
                manaCost: best.manaCost,
                colors: best.colors,
                cmc: best.cmc
            };
        }

        // Sort alphabetically
        const sorted = Object.keys(nameToData)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, key) => {
                acc[key] = nameToData[key];
                return acc;
            }, {});

        fs.writeFileSync(outputFilePath, JSON.stringify(sorted, null, 2), "utf-8");

        // Count split cards
        const splitCardCount = Object.keys(sorted).filter(name => name.includes(' // ')).length;

        console.log(`✅ Saved ${Object.keys(sorted).length} cards to ${outputFilePath}`);
        console.log(`   📋 Including ${splitCardCount} split card combined entries`);
        console.log(`   🎨 Art priority: Lorwyn Eclipsed > Special Guests > oldest black border`);
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

fetchAndSaveCardFaceImages();
