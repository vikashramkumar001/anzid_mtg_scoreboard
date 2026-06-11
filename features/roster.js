// features/roster.js
// Disk-derived player roster. The portrait folder for the currently-selected
// (game, vendor, count) is walked at sync time and each image file's slug
// becomes a roster entry. There is no JSON persistence — adds and deletes
// are session-only and reset on the next vendor swap (which re-walks disk).
//
// Folder convention (matches scoreboard.js / scoreboard-scene.js applyIcon):
//   /assets/images/{game}/shared/player-portraits/{vendor}-{count}/{slug}.png
//
// Name derivation:
//   - For the flyquest-2v2 bucket, FLYQUEST_2V2_ROSTER_SEED supplies exact
//     casing/punctuation that titleCaseFromSlug can't recover (e.g.
//     "Joel R. Magic", "Biqtch Puddin'", "LS").
//   - Every other bucket uses the generic titleCaseFromSlug fallback.
//
// Why disk-derived: portrait files are the authoritative source of who can
// appear on broadcast. The previous JSON-backed list drifted from the folder
// contents the moment an operator added or removed a file by hand. Reading
// the folder eliminates the drift entirely.
//
// Mutation semantics (confirmed with operator):
//   - addPlayer / addMultiplePlayers: in-memory only. The new entry vanishes
//     on the next vendor swap UNLESS the operator also uploads a portrait
//     for that name (which lands a file on disk that the next disk-walk
//     picks up).
//   - deletePlayer / clearRoster: session-only hide. The player reappears on
//     the next vendor swap because the portrait file is still on disk —
//     accidental deletes are trivially undone.
//
// data/playerRoster.json is no longer read or written. Existing files are
// harmless; delete them if you want to tidy up.

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import {
  FLYQUEST_2V2_ROSTER_SEED,
  getGameSelection,
  getVendorSelection,
  getPlayerCount,
} from '../config/constants.js';
import { getPortraitUrlBase } from './overlays.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, '..', 'public', 'assets', 'images');

// Bucket key for the one bucket that uses the override table. Anything else
// goes through generic titleCase.
const FLYQUEST_2V2_BUCKET_KEY = 'flyquest-2v2';

// In-memory state for the currently-selected bucket. Mutations (add/delete/
// clear) land here only — no disk writeback. Switching vendor/game/count
// rebuilds this from disk via syncRosterToCurrentSelection().
let currentBucket = [];
let currentBucketKey = null;

// Generic slug → name. Splits on `-`, title-cases each word. Good enough for
// "alice-smith" → "Alice Smith"; lossy for edge cases like "Joel R. Magic"
// (which is why the override table exists for flyquest-2v2). Exported for tests.
export function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Pick the right name source for this slug. The override table only applies
// to the flyquest-2v2 bucket — slug collisions across buckets are unlikely
// but gating prevents a vendor that happens to share a slug from inheriting
// a flyquest-specific name.
function nameFromSlug(slug, vendorCountKey) {
  if (vendorCountKey === FLYQUEST_2V2_BUCKET_KEY && FLYQUEST_2V2_ROSTER_SEED[slug]) {
    return FLYQUEST_2V2_ROSTER_SEED[slug];
  }
  return titleCaseFromSlug(slug);
}

// Walk the portrait folder for a (game, vendor, count) and return an array
// of { name } entries. Missing folder → empty array (the operator hasn't
// created portraits for that vendor yet, which is a normal state).
async function readBucketFromDisk(game, vendor, count) {
  const vendorCountKey = `${vendor}-${count}`;
  const dir = path.join(imagesDir, game, 'shared', 'player-portraits', vendorCountKey);

  let files;
  try {
    files = await fs.readdir(dir);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[Roster] readdir failed for ${dir}:`, err.message);
    }
    return [];
  }

  // Accept the common image extensions that show up in these folders.
  const imageFiles = files.filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
  return imageFiles.map(file => {
    const slug = file.replace(/\.[^.]+$/, '');
    return { name: nameFromSlug(slug, vendorCountKey) };
  });
}

// Sync the in-memory bucket to whatever (game, vendor, count) is currently
// selected. Returns true if the bucket key changed (and therefore the bucket
// was rebuilt). No-op when the selection hasn't changed since last sync, so
// repeated calls are cheap.
//
// Handlers responding to update-{game,vendor,player-count}-selection events
// call this before broadcasting playerRosterUpdated.
export async function syncRosterToCurrentSelection() {
  const game = getGameSelection();
  const vendor = getVendorSelection();
  const count = getPlayerCount();
  const newKey = `${game}|${vendor}|${count}`;
  if (newKey === currentBucketKey) return false;

  // Race guard: Apply fires three selection-update events back-to-back, so
  // multiple syncs can overlap. We claim the key synchronously, then after
  // the async readdir resolves we only commit if no newer sync has claimed
  // a different key — otherwise the loser would overwrite the winner.
  currentBucketKey = newKey;
  const result = await readBucketFromDisk(game, vendor, count);
  if (currentBucketKey !== newKey) return false;
  currentBucket = result;
  return true;
}

// Backward-compat alias for sockets/handlers.js. The old name was apt when
// auto-seed was the only thing the handlers triggered on selection change;
// now every selection change re-walks disk for a possibly-different bucket,
// but the handler call site is identical so the alias keeps the diff small.
export const maybeAutoSeedRoster = syncRosterToCurrentSelection;

// Initial sync on server boot. Server.js calls this once after constants
// have hydrated their persisted values. Whatever (game, vendor, count) the
// operator last applied is what gets walked.
export async function loadRoster() {
  await syncRosterToCurrentSelection();
  console.log(`[Roster] Initial sync: ${currentBucketKey} (${currentBucket.length} entries)`);
}

// No-op kept for socket-handler API parity. The roster is now derived from
// portrait files on disk; mutations are session-only by design and reset on
// the next vendor swap, so there's nothing to write.
export async function saveRoster() {
  // intentionally empty
}

// Case-insensitive alphabetical sort of the current bucket. The scoreboard
// autocomplete + master-control list both consume this.
export function getSortedRoster() {
  return [...currentBucket].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

// Live array reference for the current bucket. Most consumers should use
// getSortedRoster() instead.
export function getRoster() {
  return currentBucket;
}

// Add returns true if it actually added (so the caller knows whether to
// broadcast). Session-only — entry vanishes on the next vendor swap unless
// the operator also uploads a portrait for the player (in which case the
// file on disk persists the addition).
export function addPlayer(name) {
  if (!currentBucket.some(p => p.name === name)) {
    currentBucket.push({ name });
    return true;
  }
  return false;
}

export function addMultiplePlayers(names) {
  let updated = false;
  names.forEach(name => {
    if (!currentBucket.some(p => p.name === name)) {
      currentBucket.push({ name });
      updated = true;
    }
  });
  return updated;
}

// Session-only delete. The player reappears on the next vendor swap because
// the portrait file is still on disk — by design, so an accidental delete is
// trivially undone (just swap vendor and back).
export function deletePlayer(name) {
  const originalLength = currentBucket.length;
  currentBucket = currentBucket.filter(p => p.name !== name);
  return currentBucket.length < originalLength;
}

// Session-only clear used by the master-control "Delete All" button. Same
// caveat as deletePlayer — every entry whose portrait file still exists will
// reappear on the next vendor swap.
export function clearRoster() {
  if (currentBucket.length === 0) return false;
  currentBucket = [];
  return true;
}

// No-op kept for socket-handler API parity. We no longer store portrait URLs
// on roster entries (display derives from selections), but the old
// `upload-player-portrait` socket event still calls this — returning false
// means the handler skips its broadcast, which is exactly what we want.
export function updatePlayerPortrait(_name, _portraitUrl) {
  return false;
}

// Route handler for portrait image upload. Multer has already saved the file
// to the right per-vendor folder by the time we get here (see overlays.js
// portraitStorage). We just confirm the player exists in the current bucket
// and return a URL the master-control preview can show.
//
// Roster state: not persisted, but the file landing on disk means the next
// disk-walk for this bucket will include this slug — so a player added
// in-session who then receives a portrait persists across vendor swaps via
// the file itself (intentional, lets operators "pin" a session add).
export async function handlePortraitUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { playerName } = req.body;
  // URL derives from the same selections multer used for `destination` —
  // they read the same in-memory accessors so they cannot disagree.
  const portraitUrl = `${getPortraitUrlBase()}/${req.file.filename}`;

  const exists = currentBucket.some(p => p.name === playerName);
  if (!exists) {
    // No matching player in the current vendor's bucket — clean up the orphan
    // upload so the folder stays tidy.
    await fs.unlink(req.file.path).catch(console.error);
    return res.status(404).json({ success: false, message: 'Player not found' });
  }

  return res.json({ success: true, portraitUrl });
}
