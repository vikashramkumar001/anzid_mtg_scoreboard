import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root project directory
const rootDir = path.resolve(__dirname, '..');

// === File Paths ===
export const controlDataPath     = path.join(rootDir, 'data', 'controlData.json');
export const bracketDataPath     = path.join(rootDir, 'data', 'bracketData.json');
export const standingsDataPath   = path.join(rootDir, 'data', 'standingsData.json');
export const cardListDataPath    = path.join(rootDir, 'data', 'cardNames.json');
export const archetypeListPath   = path.join(rootDir, 'data', 'archetypeList.json');

// === Defaults ===
export let DEFAULT_INITIAL_TIME = 50 * 60 * 1000; // 50 minutes in ms
export let DEFAULT_GAME_SELECTION = 'mtg';  // mtg, riftbound

export function getInitialTime() {
  return DEFAULT_INITIAL_TIME;
}

export function setInitialTime(ms) {
  DEFAULT_INITIAL_TIME = ms;
}

export function getGameSelection() {
  return DEFAULT_GAME_SELECTION;
}

export function setGameSelection(gameType) {
  DEFAULT_GAME_SELECTION = gameType.toLowerCase();
}
