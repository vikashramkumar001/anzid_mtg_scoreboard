// features/roster.js
// Player roster backing store. Mirrors features/archetypes.js 1:1 so the two
// CRUD/socket/editor flows stay interchangeable. One semantic difference:
// `maybeAutoSeed()` — on first load (or whenever the roster is empty AND
// selections are mtg + flyquest + 2v2), populate the roster from the 18
// portrait files in public/assets/images/mtg/shared/player-portraits/flyquest-2v2/
// using the FLYQUEST_2V2_ROSTER_SEED table from config/constants.js.
// Field shape: { name, portraitUrl }.

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import {
  playerRosterPath,
  FLYQUEST_2V2_ROSTER_SEED,
  getGameSelection,
  getVendorSelection,
  getPlayerCount,
} from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder that auto-seed walks. Kept as a module-level const so both the
// seed path and the uploaded-portrait URL it generates stay consistent.
const FLYQUEST_2V2_PORTRAIT_DIR = path.join(
  __dirname,
  '../public/assets/images/mtg/shared/player-portraits/flyquest-2v2'
);
const FLYQUEST_2V2_PORTRAIT_URL_BASE =
  '/assets/images/mtg/shared/player-portraits/flyquest-2v2';

let playerRoster = [];

// Generic fallback when a slug isn't in FLYQUEST_2V2_ROSTER_SEED — splits on
// `-`, title-cases each word. Good enough for "alice-smith" → "Alice Smith";
// lossy for edge cases like "DannyPhantom.exe" (which is why the explicit
// table exists). Exported only for tests.
export function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Load roster list from file. If ENOENT, start with empty array. Then try
// auto-seed once (no-op unless empty + selections match).
export async function loadRoster() {
  try {
    const data = await fs.readFile(playerRosterPath, 'utf8');
    playerRoster = JSON.parse(data);
    console.log('Player roster loaded.');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No player roster found. Starting fresh.');
      playerRoster = [];
    } else {
      console.error('Error loading player roster:', err);
    }
  }
  await maybeAutoSeedRoster();
}

// Persist roster to disk. Pretty-printed so a human can eyeball the JSON.
export async function saveRoster() {
  try {
    await fs.writeFile(playerRosterPath, JSON.stringify(playerRoster, null, 2));
    console.log('Player roster saved.');
  } catch (err) {
    console.error('Error saving player roster:', err);
  }
}

// Case-insensitive alphabetical sort for stable dropdown rendering.
export function getSortedRoster() {
  return [...playerRoster].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

export function getRoster() {
  return playerRoster;
}

export function addPlayer(name) {
  if (!playerRoster.some(p => p.name === name)) {
    playerRoster.push({ name, portraitUrl: null });
    return true;
  }
  return false;
}

export function addMultiplePlayers(names) {
  let updated = false;
  names.forEach(name => {
    if (!playerRoster.some(p => p.name === name)) {
      playerRoster.push({ name, portraitUrl: null });
      updated = true;
    }
  });
  return updated;
}

export function deletePlayer(name) {
  const originalLength = playerRoster.length;
  playerRoster = playerRoster.filter(p => p.name !== name);
  return playerRoster.length < originalLength;
}

export function updatePlayerPortrait(name, portraitUrl) {
  const index = playerRoster.findIndex(p => p.name === name);
  if (index !== -1) {
    playerRoster[index].portraitUrl = portraitUrl;
    return true;
  }
  return false;
}

// Route handler for portrait image upload. Mirrors handleArchetypeUpload.
// The multer filename strategy (see features/overlays.js portraitStorage)
// writes the file at <slug>.<ext>, so the URL we attach is deterministic
// from the operator-supplied `playerName`.
export async function handlePortraitUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { playerName } = req.body;
  const portraitUrl = `${FLYQUEST_2V2_PORTRAIT_URL_BASE}/${req.file.filename}`;

  const index = playerRoster.findIndex(p => p.name === playerName);
  if (index !== -1) {
    playerRoster[index].portraitUrl = portraitUrl;
    try {
      await saveRoster();
      return res.json({ success: true, portraitUrl });
    } catch (err) {
      console.error('Failed to update player portrait:', err);
      return res.status(500).json({ success: false, message: 'Failed to save file' });
    }
  } else {
    // No matching player — clean up the orphan upload so the folder stays tidy.
    await fs.unlink(req.file.path).catch(console.error);
    return res.status(404).json({ success: false, message: 'Player not found' });
  }
}

// One-time auto-seed. Gated so generic operators never get a mystery roster:
// only fires when roster is empty AND mtg + flyquest + 2v2 are all selected.
// Safe to call repeatedly — becomes a no-op once the roster has any entry.
// Called from loadRoster() at boot and also from control.js after each
// selection change (see sockets/handlers.js), so flipping selections on a
// live server is enough to trigger the seed without a restart.
export async function maybeAutoSeedRoster() {
  if (playerRoster.length > 0) return false;
  if (getGameSelection() !== 'mtg') return false;
  if (getVendorSelection() !== 'flyquest') return false;
  if (getPlayerCount() !== '2v2') return false;

  let files;
  try {
    files = await fs.readdir(FLYQUEST_2V2_PORTRAIT_DIR);
  } catch (err) {
    console.warn('[Roster] Auto-seed skipped — portrait dir unreadable:', err.message);
    return false;
  }

  // Accept the common image extensions actually shipped in the folder.
  const imageFiles = files.filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
  if (imageFiles.length === 0) {
    console.log('[Roster] Auto-seed skipped — no portrait files found.');
    return false;
  }

  for (const file of imageFiles) {
    const slug = file.replace(/\.[^.]+$/, '');
    const name = FLYQUEST_2V2_ROSTER_SEED[slug] || titleCaseFromSlug(slug);
    if (!playerRoster.some(p => p.name === name)) {
      playerRoster.push({
        name,
        portraitUrl: `${FLYQUEST_2V2_PORTRAIT_URL_BASE}/${file}`,
      });
    }
  }

  await saveRoster();
  console.log(`[Roster] Auto-seeded ${playerRoster.length} flyquest-2v2 players.`);
  return true;
}

// Export the backing array for external callers that want a live reference
// (kept for parity with archetypes.js — no current consumers).
export { playerRoster };
