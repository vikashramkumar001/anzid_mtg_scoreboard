import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { overlayStorage, archetypeStorage, portraitStorage, getOverlayPaths } from '../features/overlays.js';
import { getGameSelection } from '../config/constants.js';
import { handleArchetypeUpload } from '../features/archetypes.js';
import { handlePortraitUpload } from '../features/roster.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer middleware
const uploadOverlay = multer({ storage: overlayStorage });
const uploadArchetypeImage = multer({ storage: archetypeStorage });
const uploadPortrait = multer({ storage: portraitStorage });

// Serve static HTML pages
router.get('/control/:controlID/:delay', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/control.html'));
});

// Admin control — a more robust per-match control board. Starts as a clone
// of /control but adds game-specific admin tools (riftbound: showdown might,
// battlefield selection, brush override, baron pit). Shares the same
// control-{id} room + saved-state as /control (see room-manager.js), so it's
// a co-equal control client for the same match.
router.get('/admin-control/:controlID/:delay', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/admin-control.html'));
});

// Event-info scenes — minimal image-only pages that swap based on
// current game/vendor/playerCount selection. Identifier format:
// /event-info/starting-soon, /event-info/head-to-head, etc.
// (Renamed from /background/ — the old prefix didn't describe what the
// scenes actually are. Old URLs now 404; OBS sources must be repointed.)
// Match-specific scenes moved to /scoreboard/:matchID/:variant (below)
// so vendors that need live match data on top (Flyquest 2v2 hand overlays)
// can render names / life totals via scoreboard-{N}-saved-state.
router.get('/event-info/:identifier', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/event-info.html'));
});

// Per-match SCENE page (frame PNG + optional data overlay). Variants:
// overview | hand-left | hand-right | player-left | player-right.
// Data overlay visibility is vendor-gated via CSS custom properties in
// public/js/vendor-config.js — see scoreboard-scene.js header comment.
router.get('/scoreboard/:matchID/:variant', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/scoreboard-scene.html'));
});

// Backward-compat alias for OBS sources still aimed at the old broadcast path.
router.get('/broadcast/round/scoreboard/:matchID/:variant', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/scoreboard-scene.html'));
});

// Full-fat classic scoreboard — all-in-one per-match view with event chyron,
// timer, archetype backgrounds, mana symbols, game-wins pips, per-game DOM
// for MTG / Riftbound / Vibes / StarWars. Restored from fde4ed2^ (was deleted
// in the /scoreboard → /background scene refactor, but rendered data fields
// that aren't covered by any new scene).
router.get('/scoreboard/:controlID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/scoreboard.html'));
});
router.get('/broadcast/round/scoreboard/:matchID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/scoreboard.html'));
});

router.get('/master-control', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/master-control.html'));
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

router.get('/broadcast/round/standings/:rankID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings.html'));
});

router.get('/broadcast/round/standings-all-1', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings-all-1.html'));
});

router.get('/broadcast/round/standings-all-2', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings-all-2.html'));
});

router.get('/broadcast/round/standings-all-3', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings-all-3.html'));
});

router.get('/broadcast/round/standings-all-4', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings-all-4.html'));
});

router.get('/broadcast/metagame', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-metagame.html'));
});

router.get('/broadcast/round/standings-combined', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-round-standings-combined.html'));
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

router.get('/broadcast/commentator-l3', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/broadcast-commentators.html'));
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

// Upload player portrait (roster). Multer parses multipart so req.body.playerName
// is available when portraitStorage's filename callback runs, keeping the saved
// filename deterministic (<slug>.<ext>). handlePortraitUpload confirms the
// player exists in the current vendor's bucket and returns the resolved URL —
// no JSON write, since the roster is derived from the portrait files themselves.
router.post('/upload-player-portrait', uploadPortrait.single('portrait'), handlePortraitUpload);

// Save portrait focus values from debug overlay
router.post('/save-portrait-focus', express.json(), (req, res) => {
  const { focusMap } = req.body;
  if (!focusMap || typeof focusMap !== 'object') {
    return res.status(400).json({ error: 'Missing focusMap' });
  }

  const filePath = path.join(__dirname, '../public/js/broadcast-metagame.js');
  let content = fs.readFileSync(filePath, 'utf-8');

  // Build new PORTRAIT_FOCUS block
  const lines = ['const PORTRAIT_FOCUS = {'];
  for (const [name, vals] of Object.entries(focusMap)) {
    const key = name.includes("'") ? `"${name}"` : `'${name}'`;
    const scaleStr = vals.scale && vals.scale !== 1.0 ? `, scale: ${vals.scale}` : '';
    lines.push(`    ${(key + ':').padEnd(43)}{ top: ${vals.top}, left: ${vals.left}${scaleStr} },`);
  }
  lines.push('};');

  // Replace the existing PORTRAIT_FOCUS block
  const regex = /const PORTRAIT_FOCUS = \{[\s\S]*?\n\};/;
  if (!regex.test(content)) {
    return res.status(500).json({ error: 'Could not find PORTRAIT_FOCUS in file' });
  }
  content = content.replace(regex, lines.join('\n'));
  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(`[Focus] Saved ${Object.keys(focusMap).length} portrait focus values`);
  res.json({ ok: true, count: Object.keys(focusMap).length });
});

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

// riftbound - deck view (broadcast format with matchID + sideID)
router.get('/riftbound/display/main/deck/:matchID/:sideID', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/riftbound/deck-display.html'));
});

// riftbound - deck view (legacy single deckID)
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
