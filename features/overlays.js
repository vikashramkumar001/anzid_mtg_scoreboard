import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const overlayDir = path.join(__dirname, '../public/assets/images');

// Default public image paths
const overlayHeaderImageUrl = '/assets/images/overlay_header.png';
const overlayFooterImageUrl = '/assets/images/overlay_footer.png';

// Ensure directory exists
if (!fs.existsSync(overlayDir)) {
  fs.mkdirSync(overlayDir, { recursive: true });
}

// Multer storage config for header/footer overlays
export const overlayStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, overlayDir);
  },
  filename: function (req, file, cb) {
    if (file.fieldname === 'overlay_header') {
      cb(null, 'overlay_header.png');
    } else if (file.fieldname === 'overlay_footer') {
      cb(null, 'overlay_footer.png');
    } else {
      cb(new Error('Invalid overlay field name'), null);
    }
  }
});

// Multer storage config for archetype image uploads
const archetypeDir = path.join(overlayDir, 'archetypes');

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

export function emitOverlayBackgrounds(io) {
  io.emit('overlayHeaderBackgroundUpdate', overlayHeaderImageUrl);
  io.emit('overlayFooterBackgroundUpdate', overlayFooterImageUrl);
}

export { overlayHeaderImageUrl, overlayFooterImageUrl };
