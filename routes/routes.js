import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { overlayStorage, archetypeStorage } from '../features/overlays.js';
import { handleArchetypeUpload } from '../features/archetypes.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer middleware
const uploadOverlay = multer({ storage: overlayStorage });
const uploadArchetypeImage = multer({ storage: archetypeStorage });

// Serve static HTML pages
router.get('/control/:controlID/:delay', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/control.html'));
});

router.get('/scoreboard/:controlID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/scoreboard.html'));
});

router.get('/master-control', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/master-control.html'));
});

router.get('/deck-display', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/deck-display.html'));
});

router.get('/side-deck-display', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/side-deck-display.html'));
});

router.get('/broadcast/round/details/:matchID/:detailKey', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-details.html'));
});

router.get('/update/global/details/:detailKey', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/update-global-details.html'));
});

router.get('/broadcast/round/maindeck/:matchID/:sideID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-main-deck.html'));
});

router.get('/broadcast/round/sidedeck/:matchID/:sideID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-side-deck.html'));
});

router.get('/broadcast/round/standings/:rankID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings.html'));
});

router.get('/display/bracket/details/:bracketID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/bracket-individual-display.html'));
});

router.get('/timer/:controlID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/timer.html'));
});

router.get('/display/card/view/:gameID/:cardID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/dedicated-card-view.html'));
});

// Upload overlay header image
router.post('/upload-header-overlay', uploadOverlay.single('overlay_header'), (req, res) => {
  if (req.file) {
    const newImageUrl = '/assets/images/overlay_header.png';
    req.io?.emit('overlayHeaderBackgroundUpdate', newImageUrl);
    res.json({ success: true, newImageUrl });
  } else {
    res.status(400).json({ success: false, message: 'No file uploaded' });
  }
});

// Upload overlay footer image
router.post('/upload-footer-overlay', uploadOverlay.single('overlay_footer'), (req, res) => {
  if (req.file) {
    const newImageUrl = '/assets/images/overlay_footer.png';
    req.io?.emit('overlayFooterBackgroundUpdate', newImageUrl);
    res.json({ success: true, newImageUrl });
  } else {
    res.status(400).json({ success: false, message: 'No file uploaded' });
  }
});

// Upload archetype image
router.post('/upload-archetype-image', uploadArchetypeImage.single('image'), handleArchetypeUpload);

// Vibes master control
router.get('/vibes-master-control', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/vibes/master-control.html'));
});

// vibes - dedicated car view
router.get('/vibes/display/card/view/:cardID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/vibes/dedicated-card-view.html'));
});

export default router;
