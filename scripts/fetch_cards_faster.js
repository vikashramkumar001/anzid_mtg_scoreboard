import fetch from 'node-fetch';
import fs from 'fs';

async function fetchAndSaveCardImages() {
    const bulkDataUrl = "https://api.scryfall.com/bulk-data";
    const outputFilePath = "./cardImages.json";

    try {
        console.log("Fetching bulk data metadata...");
        const bulkDataResponse = await fetch(bulkDataUrl);
        const bulkData = await bulkDataResponse.json();

        const defaultCardsData = bulkData.data.find(item => item.type === "default_cards");
        const defaultCardsUrl = defaultCardsData.download_uri;
        console.log(`Downloading full card list from: ${defaultCardsUrl}`);

        const cardDataResponse = await fetch(defaultCardsUrl);
        const cards = await cardDataResponse.json();

        const nameToImage = {};

        for (const card of cards) {
            if (card.card_faces && Array.isArray(card.card_faces)) {
                for (const face of card.card_faces) {
                    const faceName = face.name.trim();
                    const faceImage = face.image_uris?.large;
                    if (faceName && faceImage) {
                        nameToImage[faceName] = faceImage;
                    }
                }
            } else if (card.image_uris?.large) {
                nameToImage[card.name.trim()] = card.image_uris.large;
            }
        }

        const sorted = Object.keys(nameToImage)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, key) => {
                acc[key] = nameToImage[key];
                return acc;
            }, {});

        fs.writeFileSync(outputFilePath, JSON.stringify(sorted, null, 2), "utf-8");
        console.log(`✅ Saved ${Object.keys(sorted).length} card images to ${outputFilePath}`);
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

fetchAndSaveCardImages();
