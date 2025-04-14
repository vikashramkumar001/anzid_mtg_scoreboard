import fetch from 'node-fetch';
import fs from 'fs';

async function fetchAndSaveCardNames() {
    const bulkDataUrl = "https://api.scryfall.com/bulk-data";
    const outputFilePath = "./cardNames.json";

    try {
        console.log("Fetching bulk data metadata...");

        // Step 1: Fetch metadata from the bulk data API
        const bulkDataResponse = await fetch(bulkDataUrl);
        if (!bulkDataResponse.ok) {
            throw new Error(`Failed to fetch bulk data: ${bulkDataResponse.statusText}`);
        }
        const bulkData = await bulkDataResponse.json();

        // Step 2: Find the "Default Cards" download_uri
        const defaultCardsData = bulkData.data.find(item => item.type === "default_cards");
        if (!defaultCardsData) {
            throw new Error("Default Cards data not found in bulk data metadata.");
        }
        const defaultCardsUrl = defaultCardsData.download_uri;
        console.log(`Found Default Cards data. Downloading from: ${defaultCardsUrl}`);

        // Step 3: Fetch the Default Cards data
        const cardDataResponse = await fetch(defaultCardsUrl);
        if (!cardDataResponse.ok) {
            throw new Error(`Failed to fetch card data: ${cardDataResponse.statusText}`);
        }
        const cards = await cardDataResponse.json();

        // Step 4: Extract unique card names and sort alphabetically
        const uniqueCardNames = Array.from(new Set(cards.map(card => card.name)))
            .sort((a, b) => a.localeCompare(b));
        console.log(`Fetched ${uniqueCardNames.length} unique card names.`);

        // Step 5: Save unique, sorted card names to a JSON file
        fs.writeFileSync(outputFilePath, JSON.stringify(uniqueCardNames, null, 2), "utf-8");
        console.log(`Unique, sorted card names saved to ${outputFilePath}`);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

// Execute the function
fetchAndSaveCardNames();
