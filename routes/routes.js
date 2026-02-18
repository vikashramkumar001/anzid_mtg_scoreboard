import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { overlayStorage, archetypeStorage, getOverlayPaths } from '../features/overlays.js';
import { getGameSelection } from '../config/constants.js';
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

router.get('/broadcast/round/maindeck/:orientation/:matchID/:sideID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-main-deck.html'));
});

router.get('/broadcast/round/maindeck/:matchID/:sideID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-main-deck.html'));
});

router.get('/broadcast/round/sidedeck/:orientation/:matchID/:sideID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-side-deck.html'));
});

router.get('/broadcast/round/sidedeck/:matchID/:sideID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-side-deck.html'));
});

router.get('/broadcast/round/draftlist/scoreboard/:slotId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-draftlist-scoreboard.html'));
});

router.get('/broadcast/round/draftlist/:orientation/:slotId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-draft-list.html'));
});

router.get('/broadcast/round/draftlist/:slotId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-draft-list.html'));
});

router.get('/broadcast/round/scoreboard/:matchID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/scoreboard.html'));
});

router.get('/broadcast/round/standings/:rankID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings.html'));
});

router.get('/broadcast/round/standings-all', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings-all.html'));
});

router.get('/broadcast/round/standings-all-2', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings-all-2.html'));
});

router.get('/display/bracket/top8', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/bracket-full-display.html'));
});

router.get('/display/bracket/details/:bracketID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/bracket-individual-display.html'));
});

router.get('/timer/:controlID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/timer.html'));
});

// Unified card view display (game-agnostic, adapts via game selection)
router.get('/display/card/view/:cardID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/card-view-display.html'));
});

// mtg - dedicated card view
router.get('/mtg/display/card/view/:cardID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/mtg/dedicated-card-view.html'));
});

router.get('/lower-third/commentator/:commentatorID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/commentator-lower-third.html'));
});

// Upload overlay header image (game-specific)
router.post('/upload-header-overlay', uploadOverlay.single('overlay_header'), (req, res) => {
  if (req.file) {
    const game = getGameSelection();
    const paths = getOverlayPaths(game);
    req.io?.emit('overlayHeaderBackgroundUpdate', paths.headerUrl);
    res.json({ success: true, newImageUrl: paths.headerUrl });
  } else {
    res.status(400).json({ success: false, message: 'No file uploaded' });
  }
});

// Upload overlay footer image (game-specific)
router.post('/upload-footer-overlay', uploadOverlay.single('overlay_footer'), (req, res) => {
  if (req.file) {
    const game = getGameSelection();
    const paths = getOverlayPaths(game);
    req.io?.emit('overlayFooterBackgroundUpdate', paths.footerUrl);
    res.json({ success: true, newImageUrl: paths.footerUrl });
  } else {
    res.status(400).json({ success: false, message: 'No file uploaded' });
  }
});

// Upload archetype image
router.post('/upload-archetype-image', uploadArchetypeImage.single('image'), handleArchetypeUpload);

// VIBES

// Vibes master control
router.get('/vibes-master-control', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/vibes/master-control.html'));
});

// vibes - dedicated card view
router.get('/vibes/display/card/view/:cardID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/vibes/dedicated-card-view.html'));
});

// vibes - deck view
router.get('/vibes/display/main/deck/:deckID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/vibes/deck-display.html'))
});

// END VIBES

// RIFTBOUND

// riftbound - dedicated card view
router.get('/riftbound/display/card/view/:cardID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/riftbound/dedicated-card-view.html'));
});

// vibes - deck view
router.get('/riftbound/display/main/deck/:deckID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/riftbound/deck-display.html'))
});

// riftbound - animation display
router.get('/riftbound/animation-display/:orientation/:matchID/:side', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/riftbound/animation-display.html'));
});

// END RIFTBOUND

// STAR WARS

// starwars - dedicated card view
router.get('/starwars/display/card/view/:cardID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/starwars/dedicated-card-view.html'));
});

// END STAR WARS

// meta breakdown links
router.get('/meta/breakdown/details/:detailKey', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/meta-breakdown-details.html'));
});

router.get('/meta/breakdown/full/:metaID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/meta-breakdown-full.html'));
});

export default router;
