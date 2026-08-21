#!/usr/bin/env node
/**
 * Stage everything a second machine needs, into one folder.
 *
 * Reads the current OBS scene collection, resolves every file it references,
 * and writes a staging folder containing:
 *   - a fresh copy of the collection JSON
 *   - media-files.txt   (rsync --files-from list, paths relative to $HOME)
 *   - transfer.sh       (runs the copy to a destination you name)
 *   - MANIFEST.txt      (human-readable inventory)
 *
 * Read-only with respect to OBS and the media. Quit OBS first so the
 * collection on disk is current.
 *
 *   node scripts/obs/stage-transfer.mjs
 *   node scripts/obs/stage-transfer.mjs --out ~/Desktop/dev2-transfer
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const HOME = os.homedir();
const OBS_DIR = path.join(HOME, 'Library/Application Support/obs-studio');
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const outArg = process.argv.indexOf('--out');
const OUT = outArg > -1 ? process.argv[outArg + 1].replace(/^~/, HOME)
                        : path.join(HOME, 'Desktop/dev2-transfer');

// ── locate the current collection ──────────────────────────────────────────
const ini = ['user.ini', 'global.ini']
  .map(f => path.join(OBS_DIR, f)).filter(fs.existsSync)
  .map(f => fs.readFileSync(f, 'utf8')).join('\n');
const m = ini.match(/^SceneCollectionFile=(.+)$/m);
if (!m) { console.error('Could not resolve the current scene collection.'); process.exit(1); }
const raw = m[1].trim();
const collectionName = raw.endsWith('.json') ? raw : raw + '.json';
const collectionPath = path.join(OBS_DIR, 'basic/scenes', collectionName);
if (!fs.existsSync(collectionPath)) { console.error(`Missing: ${collectionPath}`); process.exit(1); }

const ageMin = (Date.now() - fs.statSync(collectionPath).mtimeMs) / 60000;
const obsRunning = (() => {
  try { return !!execSync('pgrep -x OBS || true').toString().trim(); }
  catch { return false; }
})();

const c = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// ── every file the collection points at ────────────────────────────────────
const KEYS = ['local_file','file','path','image_path','video_path','image_file','sound_path','mask_image'];
const refs = new Map();
const walk = (o, ref) => {
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && KEYS.includes(k) && v.startsWith('/')) {
      if (!refs.has(v)) refs.set(v, ref);
    } else walk(v, ref);
  }
};
for (const s of c.sources || []) {
  walk(s.settings, s.name);
  for (const f of s.filters || []) walk(f.settings, `${s.name} [filter]`);
}
for (const t of c.transitions || []) walk(t.settings, `transition: ${t.name}`);

const present = [...refs].filter(([p]) => fs.existsSync(p));
const missing = [...refs].filter(([p]) => !fs.existsSync(p));
const outside = present.filter(([p]) => !p.startsWith(HOME + '/'));
const inHome  = present.filter(([p]) =>  p.startsWith(HOME + '/'));
const bytes   = present.reduce((a, [p]) => a + fs.statSync(p).size, 0);
const gb      = b => (b / 1073741824).toFixed(2) + ' GB';

fs.mkdirSync(OUT, { recursive: true });

// ── 1. the collection itself ───────────────────────────────────────────────
fs.copyFileSync(collectionPath, path.join(OUT, collectionName));

// ── 2. rsync file list, relative to $HOME ──────────────────────────────────
// Everything lands at the same path relative to the far side's home folder.
// The repo's gitignored assets ride along in the same list (they're under
// $HOME too), so it's one rsync rather than several.
const extras = [
  'public/assets/animations',          // ~3.7 GB, gitignored
  '.env',                              // TOPDECK_API_KEY
  'public/js/restream-config.js',      // Restream embed token
].map(rel => path.join(REPO, rel)).filter(fs.existsSync);

const repoInHome = REPO.startsWith(HOME + '/');
if (!repoInHome) console.log('  !  repo is outside your home folder; extras excluded from the list');

const list = [
  ...inHome.map(([p]) => p.slice(HOME.length + 1)),
  ...(repoInHome ? extras.map(p => p.slice(HOME.length + 1)) : []),
];
// drop entries already covered by a listed parent directory
const dirs = list.filter(e => fs.existsSync(path.join(HOME, e)) && fs.statSync(path.join(HOME, e)).isDirectory());
const deduped = [...new Set(list)].filter(e => !dirs.some(d => d !== e && e.startsWith(d + '/'))).sort();
fs.writeFileSync(path.join(OUT, 'media-files.txt'), deduped.join('\n') + '\n');

// ── 3. the transfer script ─────────────────────────────────────────────────
fs.writeFileSync(path.join(OUT, 'transfer.sh'), `#!/bin/bash
# Copy everything the second machine needs, in one pass.
#
#   ./transfer.sh /Volumes/MyDrive/dev2                    # via external drive
#   ./transfer.sh anzidmtg_TD001@MacBook-Pro.local:        # over the network
#
# Paths are preserved relative to the home folder, so on the far side they
# land at the same spot under ITS home. That is what makes the symlink work.
set -euo pipefail
DEST="\${1:?usage: ./transfer.sh <destination>}"
HERE="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

rsync -avh --progress --files-from="$HERE/media-files.txt" "$HOME/" "$DEST"

cat <<'NEXT'

Transfer complete. On the second machine:

  1. Symlink the old home path so the absolute paths resolve:
       sudo ln -s /Users/$(whoami) /Users/${path.basename(HOME)}

  2. Confirm the repo sits at the SAME path relative to your home:
       ~/${REPO.startsWith(HOME + '/') ? REPO.slice(HOME.length + 1) : REPO}
     Two OBS sources point inside the repo by absolute path, so a repo
     somewhere else leaves them broken even with the symlink.

  3. OBS -> Scene Collection -> Import -> ${collectionName}

  4. node scripts/obs/verify-machine.mjs

NEXT
`);
fs.chmodSync(path.join(OUT, 'transfer.sh'), 0o755);

// ── 4. manifest ────────────────────────────────────────────────────────────
const byDir = {};
for (const [p] of present) {
  const d = path.dirname(p).replace(HOME, '~');
  (byDir[d] = byDir[d] || []).push({ f: path.basename(p), s: fs.statSync(p).size });
}
let man = `OBS TRANSFER MANIFEST\n`;
man += `collection : ${collectionName}\n`;
man += `scenes     : ${(c.sources || []).filter(s => s.id === 'scene').length}\n`;
man += `files      : ${present.length} present, ${missing.length} missing\n`;
man += `size       : ${gb(bytes)}\n`;
man += `source home: ${HOME}\n`;
man += `repo path  : ${REPO}\n`;
man += `\nNOTE: the far side needs the repo at the SAME path relative to its home,\n      and a symlink /Users/${path.basename(HOME)} -> its own home.\n\n`;
man += `${'='.repeat(72)}\nFILES TO COPY\n${'='.repeat(72)}\n`;
for (const d of Object.keys(byDir).sort()) {
  man += `\n${d}/\n`;
  for (const { f, s } of byDir[d].sort((a, b) => a.f.localeCompare(b.f)))
    man += `   ${(s / 1048576).toFixed(1).padStart(9)} MB  ${f}\n`;
}
if (outside.length) {
  man += `\n${'='.repeat(72)}\nOUTSIDE YOUR HOME FOLDER - copy these by hand\n${'='.repeat(72)}\n`;
  for (const [p, r] of outside) man += `   ${p}\n      <- ${r}\n`;
}
if (missing.length) {
  man += `\n${'='.repeat(72)}\nMISSING (known-stale, safe to ignore)\n${'='.repeat(72)}\n`;
  for (const [p, r] of missing) man += `   ${r}\n      ${p.replace(HOME, '~')}\n`;
}
fs.writeFileSync(path.join(OUT, 'MANIFEST.txt'), man);

// ── report ─────────────────────────────────────────────────────────────────
console.log(`\nStaged to ${OUT.replace(HOME, '~')}\n`);
if (obsRunning) console.log(`  ⚠️  OBS IS RUNNING — the collection copy may be stale. Quit OBS and re-run.`);
else console.log(`  ✓ OBS not running; collection written ${ageMin < 60 ? `${ageMin.toFixed(0)} min ago` : `${(ageMin / 60).toFixed(1)} h ago`}`);
console.log(`  ✓ ${collectionName}`);
console.log(`  ✓ media-files.txt   ${present.length} files, ${gb(bytes)}`);
console.log(`  ✓ transfer.sh`);
console.log(`  ✓ MANIFEST.txt`);
if (outside.length) console.log(`  !  ${outside.length} file(s) outside your home folder — listed in MANIFEST.txt, copy by hand`);
if (missing.length) console.log(`  !  ${missing.length} known-stale reference(s) skipped`);
console.log(`\nNext:  ${path.join(OUT, 'transfer.sh').replace(HOME, '~')} <destination>\n`);
