#!/usr/bin/env node
// Bulk-rename OBS transitions in a scene collection JSON, updating
// every reference (the transition itself, the Transition Table plugin's
// (from→to) entries, current_transition, quick_transitions, per-scene
// transition overrides, and anything else that holds the old name as
// a string value).
//
// Usage:
//   node scripts/rename-obs-transitions.mjs --collection proto_3__FULL_LOCAL__riftbound --dry-run
//   node scripts/rename-obs-transitions.mjs --collection proto_3__FULL_LOCAL__riftbound        # commit
//
// Safety:
//   - Refuses to run if OBS is currently open (it would overwrite our
//     edits on exit). Force with --i-know-what-im-doing if you must.
//   - Writes a timestamped .bak before saving.
//   - Pre-flight checks for collisions (target name already in use)
//     and missing source names (refuses if old name not found).
//   - Recursive walk: replaces any string value matching an old name
//     anywhere in the JSON tree, not just the known reference sites.
//     Catches plugin-private references we don't know about.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const HOME = process.env.HOME;
const SCENES_DIR = path.join(HOME, 'Library/Application Support/obs-studio/basic/scenes');

// Hard-coded rename map for this batch — drop magic-card suffixes.
// Edit this list to perform a different rename pass.
const RENAMES = {
    'Stinger - Event FOW':       'Stinger - Event',
    'Stinger - Game BS':         'Stinger - Game',
    'Stinger - Sponsor Phlage':  'Stinger - Sponsor',
    'Stinger - Decklist Ponder': 'Stinger - Decklist',
    'Stinger - Profile STP':     'Stinger - Profile',
    'Stinger - Standings Ajani': 'Stinger - Standings',
    'Stinger - Bracket Ragavan': 'Stinger - Bracket',
};

// ── Args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const collectionArg = args.find(a => a.startsWith('--collection='))?.split('=')[1]
    ?? (args[args.indexOf('--collection') + 1] && !args[args.indexOf('--collection') + 1].startsWith('--')
        ? args[args.indexOf('--collection') + 1] : null);
const dryRun  = args.includes('--dry-run');
const force   = args.includes('--i-know-what-im-doing');

if (!collectionArg) {
    console.error('Usage: rename-obs-transitions.mjs --collection <name-without-.json> [--dry-run] [--i-know-what-im-doing]');
    process.exit(1);
}

// ── Resolve scene collection path ─────────────────────────────────────
const collectionPath = collectionArg.endsWith('.json')
    ? (path.isAbsolute(collectionArg) ? collectionArg : path.join(SCENES_DIR, collectionArg))
    : path.join(SCENES_DIR, `${collectionArg}.json`);

if (!fs.existsSync(collectionPath)) {
    console.error(`Scene collection not found: ${collectionPath}`);
    process.exit(1);
}

// ── OBS-running guard ─────────────────────────────────────────────────
// On macOS, OBS Studio's process appears as "OBS" (the .app bundle name).
// If OBS is open, edits to the scene collection JSON will be overwritten
// the next time OBS saves (on exit, scene-switch, etc.).
function isObsRunning() {
    try {
        const out = execSync('pgrep -x OBS 2>/dev/null', { encoding: 'utf8' }).trim();
        return out.length > 0;
    } catch {
        return false;
    }
}

// Dry-run is read-only, so allow it while OBS is open. The write path
// below still gates on this same check.
if (isObsRunning() && !force && !dryRun) {
    console.error('OBS is currently running. Close OBS before running this script — otherwise OBS will');
    console.error('overwrite our edits the next time it saves. (Re-run with --i-know-what-im-doing to bypass,');
    console.error('or pass --dry-run to preview changes without writing.)');
    process.exit(2);
}

// ── Load + parse ──────────────────────────────────────────────────────
const raw = fs.readFileSync(collectionPath, 'utf8');
const collection = JSON.parse(raw);

// ── Pre-flight ────────────────────────────────────────────────────────
// 1. Verify all OLD names actually exist in the transitions list.
// 2. Verify NEW names don't already exist (would create duplicates).
const transitionNames = new Set((collection.transitions ?? []).map(t => t.name));
const oldNames = Object.keys(RENAMES);
const newNames = Object.values(RENAMES);

const missing = oldNames.filter(n => !transitionNames.has(n));
if (missing.length) {
    console.error('Pre-flight: some OLD names not found in transitions[]:');
    for (const m of missing) console.error(`   - "${m}"`);
    console.error('Refusing to proceed — the rename map is out of date with this collection.');
    process.exit(3);
}

const collisions = newNames.filter(n => transitionNames.has(n) && !oldNames.includes(n));
if (collisions.length) {
    console.error('Pre-flight: some NEW names would collide with existing transitions:');
    for (const c of collisions) console.error(`   - "${c}"`);
    console.error('Refusing to proceed — the rename would create duplicate transition names.');
    process.exit(4);
}

// Also catch internal collisions (two old names mapping to the same new name).
const newNameCounts = newNames.reduce((acc, n) => (acc[n] = (acc[n] ?? 0) + 1, acc), {});
const duplicateTargets = Object.entries(newNameCounts).filter(([_, c]) => c > 1);
if (duplicateTargets.length) {
    console.error('Pre-flight: rename map has duplicate TARGETS — would merge transitions:');
    for (const [n, c] of duplicateTargets) console.error(`   - "${n}" appears ${c} times`);
    process.exit(5);
}

// ── Recursive replace ─────────────────────────────────────────────────
// Walk the JSON tree. Wherever a STRING value matches an old name
// exactly, replace with the new name. Also count replacements grouped
// by the JSON path prefix (e.g. ".modules.transition-table.transitions")
// so we can report a per-location breakdown.
const replacementsByPath = {};
let totalReplacements = 0;

function bucketFor(jsonPath) {
    // Trim down to the first interesting prefix so we group similar
    // references rather than printing 226 separate paths.
    if (jsonPath.startsWith('.modules.transition-table.transitions[')) return 'modules.transition-table.transitions[].transition';
    if (jsonPath.match(/^\.transitions\[\d+\]\.name$/))                return 'transitions[].name (the transition itself)';
    if (jsonPath === '.current_transition')                            return 'current_transition (active)';
    if (jsonPath.startsWith('.quick_transitions['))                    return 'quick_transitions[].name';
    if (jsonPath.includes('private_settings.transition'))              return 'sources[].private_settings.transition (per-scene override)';
    return jsonPath;
}

function walk(obj, jsonPath) {
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            obj[i] = walk(obj[i], `${jsonPath}[${i}]`);
        }
        return obj;
    }
    if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
            obj[k] = walk(obj[k], `${jsonPath}.${k}`);
        }
        return obj;
    }
    if (typeof obj === 'string' && Object.prototype.hasOwnProperty.call(RENAMES, obj)) {
        const newVal = RENAMES[obj];
        const bucket = bucketFor(jsonPath);
        replacementsByPath[bucket] = (replacementsByPath[bucket] ?? 0) + 1;
        totalReplacements++;
        return newVal;
    }
    return obj;
}

walk(collection, '');

// ── Report ────────────────────────────────────────────────────────────
console.log(`\nCollection: ${collectionPath}`);
console.log(`Renames in map: ${oldNames.length}`);
console.log(`Total string-value replacements made: ${totalReplacements}\n`);

console.log('Per-location:');
for (const [bucket, count] of Object.entries(replacementsByPath).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)}× ${bucket}`);
}
console.log();

// Verify each old name was hit at least once (in transitions[].name)
const transitionsAfter = new Set((collection.transitions ?? []).map(t => t.name));
const stillOld = oldNames.filter(n => transitionsAfter.has(n));
if (stillOld.length) {
    console.error('Post-walk sanity check FAILED — these old names still appear in transitions[]:');
    for (const n of stillOld) console.error(`  - "${n}"`);
    process.exit(6);
}

// ── Write back ────────────────────────────────────────────────────────
if (dryRun) {
    console.log('--dry-run: no changes written.');
    process.exit(0);
}

// Backup with millisecond timestamp so back-to-back runs don't clobber.
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `${collectionPath}.rename-${ts}.bak`;
fs.writeFileSync(backupPath, raw);
console.log(`Backup: ${backupPath}`);

// Write modified JSON. Preserve OBS's pretty-printing (2-space indent
// is what OBS uses; verified by reading the file before).
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log(`Written: ${collectionPath}`);
console.log('\nReopen OBS to load the renamed transitions.');
