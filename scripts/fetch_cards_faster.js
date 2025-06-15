import fetch from 'node-fetch';
import fs from 'fs';

async function fetchAndSaveCardImages() {
    const bulkDataUrl = "https://api.scryfall.com/bulk-data";
    const outputFilePath = "./cardImages.json";

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
        const seenNames = new Set();

        for (const card of cards) {
            const hasFaces = card.card_faces && Array.isArray(card.card_faces);

            if (hasFaces) {
                const faceCount = card.card_faces.length;

                card.card_faces.forEach((face, idx) => {
                    const faceName = face.name?.trim();
                    let faceImage = face.image_uris?.large;

                    // Fallback if face image is missing but parent card has shared image_uris
                    if (!faceImage && card.image_uris?.large && faceCount === 2) {
                        if (idx === 0) {
                            faceImage = card.image_uris.large.replace('/back/', '/front/');
                        } else if (idx === 1) {
                            faceImage = card.image_uris.large.replace('/front/', '/back/');
                        }
                    }

                    if (faceName && faceImage && !seenNames.has(faceName)) {
                        nameToImage[faceName] = faceImage;
                        seenNames.add(faceName);
                    }
                });
            } else {
                const cardName = card.name?.trim();
                const cardImage = card.image_uris?.large;

                if (cardName && cardImage && !seenNames.has(cardName)) {
                    nameToImage[cardName] = cardImage;
                    seenNames.add(cardName);
                }
            }
        }

        // Debug check for Ishgard
        console.log("🔎 Check:");
        console.log("✅ Has front:", "Ishgard, the Holy See" in nameToImage);
        console.log("✅ Has back:", "Faith & Grief" in nameToImage);
        console.log("❌ Should NOT have full:", "Ishgard, the Holy See // Faith & Grief" in nameToImage);

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
