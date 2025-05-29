import fetch from 'node-fetch';
import fs from 'fs';

async function fetchAndSaveCardImages() {
    const bulkDataUrl = "https://api.scryfall.com/bulk-data";
    const outputFilePath = "./cardImages.json";
    const apiDelay = 75; // delay to avoid Scryfall rate limits (10/sec max)

    try {
        console.log("Fetching bulk data metadata...");
        const bulkDataResponse = await fetch(bulkDataUrl);
        const bulkData = await bulkDataResponse.json();

        const defaultCardsData = bulkData.data.find(item => item.type === "default_cards");
        const defaultCardsUrl = defaultCardsData.download_uri;
        console.log(`Downloading card list from: ${defaultCardsUrl}`);

        const cardDataResponse = await fetch(defaultCardsUrl);
        const cards = await cardDataResponse.json();

        // Get unique card names (by front face only to avoid duplicates)
        const uniqueCardNames = Array.from(new Set(cards.map(card => card.name)))
            .sort((a, b) => a.localeCompare(b));

        const nameToImage = {};

        for (let i = 0; i < uniqueCardNames.length; i++) {
            const name = uniqueCardNames[i];
            const frontName = name.split('//')[0].trim();
            const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(frontName)}`;

            try {
                const res = await fetch(url);
                if (!res.ok) {
                    console.warn(`Failed to fetch ${name}: ${res.statusText}`);
                    continue;
                }

                const card = await res.json();

                if (card.card_faces && Array.isArray(card.card_faces)) {
                    card.card_faces.forEach(face => {
                        const faceName = face.name.trim();
                        const faceImage = face.image_uris?.large;
                        if (faceName && faceImage) {
                            nameToImage[faceName] = faceImage;
                        }
                    });
                } else if (card.image_uris?.large) {
                    nameToImage[card.name.trim()] = card.image_uris.large;
                }

            } catch (err) {
                console.error(`Error fetching ${name}:`, err.message);
            }

            // Be nice to Scryfall: 10 requests/sec max
            await new Promise(resolve => setTimeout(resolve, apiDelay));
        }

        // Sort keys alphabetically
        const sorted = Object.keys(nameToImage)
            .sort((a, b) => a.localeCompare(b))
            .reduce((obj, key) => {
                obj[key] = nameToImage[key];
                return obj;
            }, {});

        fs.writeFileSync(outputFilePath, JSON.stringify(sorted, null, 2), "utf-8");
        console.log(`Saved ${Object.keys(sorted).length} card images to ${outputFilePath}`);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

fetchAndSaveCardImages();
