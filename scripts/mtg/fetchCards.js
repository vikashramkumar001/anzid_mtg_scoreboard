import fetch from 'node-fetch';
import fs from 'fs';

const fallbackImageUrl = (cardName) =>
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=border_crop`;

function isValidCard(card) {
    const pngUrl = card.image_uris?.png || card.card_faces?.[0]?.image_uris?.png;
    const isCardBack = pngUrl?.includes('/png/back/');
    const isPromoOrAlt = card.promo || card.variation || card.textless;
    const isLegalAnywhere = Object.values(card.legalities || {}).some(val => val === 'legal');
    const isDigitalOnly = card.digital;
    const badSetTypes = ['masterpiece', 'funny', 'token', 'memorabilia'];

    const isAltSetType = badSetTypes.includes(card.set_type);

    return (
        pngUrl &&
        !isCardBack &&
        !isPromoOrAlt &&
        !isDigitalOnly &&
        isLegalAnywhere &&
        !isAltSetType
    );
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

        const nameToData = {};

        for (const card of cards) {

            if (!isValidCard(card)) continue;

            if (card.card_faces && Array.isArray(card.card_faces)) {
                for (const face of card.card_faces) {
                    const faceName = face.name?.trim();
                    const faceImage = face.image_uris?.png || fallbackImageUrl(faceName);
                    const faceManaCost = face.mana_cost || '';

                    // Only keep first entry for each card name (avoid duplicates from different printings)
                    if (faceName && !nameToData[faceName]) {
                        nameToData[faceName] = {
                            imageUrl: faceImage,
                            manaCost: faceManaCost
                        };
                    }
                }
            } else {
                const cardName = card.name?.trim();
                const image = card.image_uris?.png || fallbackImageUrl(cardName);
                const manaCost = card.mana_cost || '';

                // Only keep first entry for each card name (avoid duplicates from different printings)
                if (cardName && !nameToData[cardName]) {
                    nameToData[cardName] = {
                        imageUrl: image,
                        manaCost: manaCost
                    };
                }
            }
        }


        const sorted = Object.keys(nameToData)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, key) => {
                acc[key] = nameToData[key];
                return acc;
            }, {});

        fs.writeFileSync(outputFilePath, JSON.stringify(sorted, null, 2), "utf-8");
        console.log(`✅ Saved ${Object.keys(sorted).length} cards with mana costs to ${outputFilePath}`);
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

fetchAndSaveCardFaceImages();
