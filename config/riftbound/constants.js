import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root project directory
const rootDir = path.resolve(__dirname, '../../');

// === File Paths ===
export const cardListDataPath    = path.join(rootDir, 'data', 'riftbound', 'riftboundCardNames.json');

// === Card-name aliases ===
// Names another platform uses for a card the card DB spells differently.
// findRiftboundCard() (features/riftbound/cards.js) consults this, so a
// Carde.io import, card vision and champion-watch all land on the DB's card.
// Add a line only for a real, checked rename — never a guess; a wrong card on
// air is worse than no card. scripts/riftbound/check-cardeio-names.mjs lists
// the names in the cached decklists that still resolve to nothing.
export const RIFTBOUND_CARD_NAME_ALIASES = {
    'Trapping Ground': 'Trapping Grounds',   // Carde.io — Unleashed battlefield UNL-217
};

// === Champion Units (chosen champion cards, not legend cards) ===
// Used to identify champion units in decklists (e.g., "Kai'Sa, Survivor" is linked to legend "Kai'Sa, Daughter of the Void")
export const RIFTBOUND_CHAMPIONS = new Set([
    // Origins
    "Ahri, Alluring", "Ahri, Inquisitive",
    "Darius, Trifarian",
    "Draven, Showboat",
    "Fiora, Victorious",
    "Jinx, Demolitionist", "Jinx, Rebel",
    "Kai'Sa, Evolutionary", "Kai'Sa, Survivor",
    "Lee Sin, Ascetic", "Lee Sin, Centered",
    "Leona, Determined", "Leona, Zealot",
    "Miss Fortune, Buccaneer", "Miss Fortune, Captain",
    "Sett, Brawler", "Sett, Kingpin",
    "Shen, Kinkou",
    "Teemo, Scout", "Teemo, Strategist",
    "Vi, Destructive",
    "Viktor, Innovator", "Viktor, Leader",
    "Volibear, Furious", "Volibear, Imposing",
    "Yasuo, Remorseful", "Yasuo, Windrider",
    // Proving Grounds
    "Annie, Fiery", "Annie, Stubborn",
    "Garen, Commander", "Garen, Rugged",
    "Lux, Crownguard", "Lux, Illuminated",
    "Master Yi, Honed", "Master Yi, Meditative",
    // Spiritforged
    "Azir, Ascendant", "Azir, Sovereign",
    "Darius, Executioner",
    "Draven, Audacious", "Draven, Vanquisher",
    "Ezreal, Dashing", "Ezreal, Prodigy",
    "Fiora, Peerless", "Fiora, Worthy",
    "Irelia, Fervent", "Irelia, Graceful",
    "Jax, Unmatched", "Jax, Unrelenting",
    "Jayce, Man of Progress",
    "Lucian, Gunslinger", "Lucian, Merciless",
    "Ornn, Blacksmith", "Ornn, Forge God",
    "Rek'Sai, Breacher", "Rek'Sai, Swarm Queen",
    "Renata Glasc, Industrialist", "Renata Glasc, Mastermind",
    "Rengar, Pouncing",
    "Rumble, Hotheaded", "Rumble, Scrapper",
    "Sivir, Ambitious", "Sivir, Mercenary",
    "Vex, Cheerless",
    // Unleashed
    "Diana, Lunari", "Diana, No Longer Human",
    "Ivern, Friend to All", "Ivern, Nurturer",
    "Jhin, Meticulous Killer", "Jhin, Murderous Artist",
    "Kha'Zix, Evolving Hunter", "Kha'Zix, Mutating Horror",
    "LeBlanc, Everywhere at Once", "LeBlanc, Fragmented",
    "Lillia, Fae Fawn", "Lillia, Protector of Dreams",
    "Master Yi, Tempered", "Master Yi, Unstoppable",
    "Pyke, Dockside Butcher", "Pyke, Returned",
    "Rengar, Trophy Hunter", "Rengar, Unseen",
    "Vex, Apathetic", "Vex, Mocking",
    "Vi, Hotheaded", "Vi, Peacekeeper",
    "Poppy, Defender of the Meek", "Poppy, Paragon",
    // Vendetta
    "Akali, Deadly Weapon", "Akali, Silent",
    "Ambessa, Respected and Feared", "Ambessa, The Wolf",
    "Jayce, Brilliant Inventor", "Jayce, Hammer in Hand",
    "Kennen, Keeper of Balance", "Kennen, Storm of Shuriken",
    "Mel, Defiant Soul", "Mel, Newly Awakened",
    "Nasus, Ascended", "Nasus, Guardian of Knowledge",
    "Renekton, Brute", "Renekton, Rage Fueled",
    "Shen, Leader of the Kinkou Order", "Shen, Scourge of Shadows",
    "Zed, From the Shadows", "Zed, Without a Sound",
]);
