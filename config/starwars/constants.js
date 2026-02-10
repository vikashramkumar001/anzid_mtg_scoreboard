import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root project directory
const rootDir = path.resolve(__dirname, '../../');

// === File Paths ===
// Directory containing per-set transformed JSON files (e.g. IBH.json)
export const cardDataDir = path.join(rootDir, 'data', 'starwars');
