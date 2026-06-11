import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { RoomUtils } from '../utils/room-utils.js';
import { getGameSelection, getVendorSelection, getPlayerCount } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, '../public/assets/images');

// All supported games
const GAMES = ['mtg', 'vibes', 'riftbound', 'starwars'];

// Ensure overlay directories exist for all games
for (const game of GAMES) {
  const dir = path.join(imagesDir, game, 'overlay');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper to get overlay paths for a game
function getOverlayPaths(game) {
  return {
    dir: path.join(imagesDir, game, 'overlay'),
    headerFilename: `${game}-overlay-header.png`,
    footerFilename: `${game}-overlay-footer.png`,
    headerUrl: `/assets/images/${game}/overlay/${game}-overlay-header.png`,
    footerUrl: `/assets/images/${game}/overlay/${game}-overlay-footer.png`,
  };
}

// Multer storage config for header/footer overlays (game-aware)
export const overlayStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const game = getGameSelection();
    const { dir } = getOverlayPaths(game);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const game = getGameSelection();
    const paths = getOverlayPaths(game);
    if (file.fieldname === 'overlay_header') {
      cb(null, paths.headerFilename);
    } else if (file.fieldname === 'overlay_footer') {
      cb(null, paths.footerFilename);
    } else {
      cb(new Error('Invalid overlay field name'), null);
    }
  }
});

// Multer storage config for archetype image uploads
const archetypeDir = path.join(imagesDir, 'archetypes');

// Ensure directory exists
if (!fs.existsSync(archetypeDir)) {
  fs.mkdirSync(archetypeDir, { recursive: true });
}

export const archetypeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, archetypeDir);
  },
  filename: function (req, file, cb) {
    const archetypeName = req.body.archetypeName || 'unknown_archetype';
    const sanitized = archetypeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `archetype_${sanitized}${ext}`);
  }
});

// Multer storage config for player portrait uploads. Destination follows the
// per-vendor portrait pool convention used by scoreboard.js / scoreboard-scene.js:
//   /assets/images/{game}/shared/player-portraits/{vendor}-{count}/{slug}.{ext}
// Resolved per-request from the current selections so uploading while on
// dsg+riftbound+2v2 lands in riftbound/.../dsg-2v2/ — not the legacy flyquest
// folder. Mirrors overlayStorage's dynamic-destination pattern above.
function getPortraitDir() {
  const game = getGameSelection();
  const vendor = getVendorSelection();
  const count = getPlayerCount();
  return path.join(imagesDir, game, 'shared', 'player-portraits', `${vendor}-${count}`);
}

export const portraitStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = getPortraitDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const playerName = req.body.playerName || 'unknown_player';
    // Same slug shape used by the seed table: lowercase, dashes, strip punctuation.
    const sanitized = playerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${sanitized}${ext}`);
  }
});

// Exported so handlePortraitUpload can re-derive the public URL without
// duplicating the path math. Reads the same in-memory selections multer's
// `destination` callback uses, so file-on-disk and URL-in-response agree.
export function getPortraitUrlBase() {
  const game = getGameSelection();
  const vendor = getVendorSelection();
  const count = getPlayerCount();
  return `/assets/images/${game}/shared/player-portraits/${vendor}-${count}`;
}

export function emitOverlayBackgrounds(io) {
  const game = getGameSelection();
  const paths = getOverlayPaths(game);
  RoomUtils.emitWithRoomMapping(io, 'overlayHeaderBackgroundUpdate', paths.headerUrl);
  RoomUtils.emitWithRoomMapping(io, 'overlayFooterBackgroundUpdate', paths.footerUrl);
}

export { getOverlayPaths };
