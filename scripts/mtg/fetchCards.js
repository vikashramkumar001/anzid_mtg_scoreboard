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
    const outputFilePath = "./cardFaceImages.json";

    try {
        console.log("📦 Fetching bulk data metadata...");
        const bulkDataResponse = await fetch(bulkDataUrl);
        const bulkData = await bulkDataResponse.json();

        const defaultCardsData = bulkData.data.find(item => item.type === "default_cards");
        const defaultCardsUrl = defaultCardsData.download_uri;
        console.log(`⬇️ Downloading full card list from: ${defaultCardsUrl}`);

        const cardDataResponse = await fetch(defaultCardsUrl);
        const cards = await cardDataResponse.json();

        const nameToImage = {};

        for (const card of cards) {

            if (!isValidCard(card)) continue;

            const setCode = card.set?.toUpperCase();
            const collectorNumber = card.collector_number;
            const identifier = `${setCode} #${collectorNumber}`;

            if (card.card_faces && Array.isArray(card.card_faces)) {
                for (const face of card.card_faces) {
                    const faceName = face.name?.trim();
                    const faceImage = face.image_uris?.png || fallbackImageUrl(faceName);

                    if (faceName) {
                        const key = `${faceName} (${identifier})`;
                        nameToImage[key] = faceImage;
                    }
                }
            } else {
                const cardName = card.name?.trim();
                const image = card.image_uris?.png || fallbackImageUrl(cardName);
                const key = `${cardName} (${identifier})`;
                nameToImage[key] = image;
            }
        }


        const sorted = Object.keys(nameToImage)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, key) => {
                acc[key] = nameToImage[key];
                return acc;
            }, {});

        fs.writeFileSync(outputFilePath, JSON.stringify(sorted, null, 2), "utf-8");
        console.log(`✅ Saved ${Object.keys(sorted).length} card face images to ${outputFilePath}`);
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

fetchAndSaveCardFaceImages();
