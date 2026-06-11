#!/usr/bin/env node
// Rename scene keys (and any string-value scene refs) inside saved OBS
// preset files in data/obs exports/. Used after a scene rename in OBS
// has shifted the live scene names — without this, restorePreset()
// would skip the renamed scenes because the preset file still keys
// them by the OLD names.
//
// Mirrors rename-obs-scenes.mjs (which targets OBS's own scene
// collection JSON) but operates on this repo's preset snapshots.
//
// Usage:
//   node scripts/rename-preset-scene-keys.mjs --dry-run
//   node scripts/rename-preset-scene-keys.mjs           # commit
//
// Safety: backs up each modified file with .pre-rename-<ts>.bak before
// writing. Idempotent — running twice with the same map is a no-op.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PRESETS_DIR = path.join(__dirname, '..', 'data', 'obs exports');

// Hard-coded rename map. Same shape as rename-obs-scenes.mjs.
const RENAMES = {
    'Standings - Current Round 1-16':  'Standings - Current Round P1',
    'Standings - Current Round 17-32': 'Standings - Current Round P2',
    'Standings - Current Round 33-48': 'Standings - Current Round P3',
    'Standings - Current Round 49-64': 'Standings - Current Round P4',
};

const dryRun = process.argv.includes('--dry-run');

// Recursive walk: replace any STRING value matching an old name, and
// rename any object KEY matching an old name. Handles both:
//   - keys (top-level "scenes" object is keyed by scene name)
//   - values (nested refs like sceneName fields, sourceName='Scene X')
function transform(obj) {
    if (Array.isArray(obj)) return obj.map(transform);
    if (obj && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            const newKey = Object.prototype.hasOwnProperty.call(RENAMES, k) ? RENAMES[k] : k;
            out[newKey] = transform(v);
        }
        return out;
    }
    if (typeof obj === 'string' && Object.prototype.hasOwnProperty.call(RENAMES, obj)) {
        return RENAMES[obj];
    }
    return obj;
}

// Count what would change so the report is meaningful.
function countMatches(obj) {
    let n = 0;
    if (Array.isArray(obj)) {
        for (const v of obj) n += countMatches(v);
    } else if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
            if (Object.prototype.hasOwnProperty.call(RENAMES, k)) n++;
            n += countMatches(v);
        }
    } else if (typeof obj === 'string' && Object.prototype.hasOwnProperty.call(RENAMES, obj)) {
        n++;
    }
    return n;
}

const files = fs.readdirSync(PRESETS_DIR)
    .filter(f => f.endsWith('.json') && !f.endsWith('.bak'))
    .map(f => path.join(PRESETS_DIR, f));

const ts = new Date().toISOString().replace(/[:.]/g, '-');
let totalFiles = 0;
let totalReplacements = 0;

for (const fpath of files) {
    let raw;
    try {
        raw = fs.readFileSync(fpath, 'utf8');
    } catch (err) {
        console.error(`[skip] ${path.basename(fpath)}: read failed (${err.message})`);
        continue;
    }
    let data;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        console.error(`[skip] ${path.basename(fpath)}: invalid JSON (${err.message})`);
        continue;
    }

    const matches = countMatches(data);
    if (matches === 0) {
        console.log(`[skip] ${path.basename(fpath)}: no matches`);
        continue;
    }

    const transformed = transform(data);
    totalFiles++;
    totalReplacements += matches;

    if (dryRun) {
        console.log(`[dry]  ${path.basename(fpath)}: would update ${matches} reference(s)`);
        continue;
    }

    const backupPath = `${fpath}.pre-rename-${ts}.bak`;
    fs.writeFileSync(backupPath, raw);
    fs.writeFileSync(fpath, JSON.stringify(transformed, null, 2));
    console.log(`[done] ${path.basename(fpath)}: updated ${matches} reference(s) → backup at ${path.basename(backupPath)}`);
}

console.log(`\n${dryRun ? 'DRY RUN — ' : ''}Total: ${totalReplacements} replacement(s) across ${totalFiles} file(s).`);
