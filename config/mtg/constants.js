import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root project directory
const rootDir = path.resolve(__dirname, '../../');

// === File Paths ===
export const cardListDataPath = path.join(rootDir, 'data', 'cardNames.json');
