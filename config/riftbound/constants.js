import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root project directory
const rootDir = path.resolve(__dirname, '../../');

// === File Paths ===
export const cardListDataPath    = path.join(rootDir, 'data', 'riftbound', 'riftboundCardNames.json');

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
    "LeBlanc, Everywhere at Once",
    "Lillia, Protector of Dreams",
    "Master Yi, Tempered", "Master Yi, Unstoppable",
    "Pyke, Dockside Butcher", "Pyke, Returned",
    "Rengar, Trophy Hunter", "Rengar, Unseen",
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
