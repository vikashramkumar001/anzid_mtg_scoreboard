// fetchCards.js
import axios from 'axios';
import fs from 'fs';

const API_URL = 'https://piltoverarchive.com/api/trpc/cards.search?batch=1&input={"0":{"json":{"searchQuery":"","advancedSearchEnabled":true}}}';
const API_KEY = 'b2c87145-7719-4536-9c59-d5520905f6be';

async function fetchCards() {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                'x-api-key': API_KEY
            }
        });

        const data = response.data?.[0]?.result?.data?.json || [];

        const cardMap = {};

        for (const card of data) {
            const name = card.name;
            const imageUrl = card.cardVariants?.[0]?.imageUrl || null;

            if (name && imageUrl) {
                cardMap[name] = imageUrl;
            }
        }

        fs.writeFileSync('riftbound_cards.json', JSON.stringify(cardMap, null, 2));
        console.log('riftbound_cards.json saved!');
    } catch (error) {
        console.error('Error fetching cards:', error.message);
    }
}

fetchCards();
