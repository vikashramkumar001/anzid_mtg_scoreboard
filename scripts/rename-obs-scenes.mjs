#!/usr/bin/env node
// Bulk-rename OBS scenes in a scene collection JSON, updating every
// reference: the scene's own `name` in sources[], scene_order[],
// current_scene / current_program_scene, transition-table plugin
// (from_scene / to_scene), advanced-scene-switcher, and anything else
// that holds the old name as a string value.
//
// Modeled on rename-obs-transitions.mjs (same recursive walk + same
// safety guards). Use this for scene renames; use rename-obs-transitions
// for transition renames.
//
// Usage:
//   node scripts/rename-obs-scenes.mjs --collection proto_3__FULL_LOCAL__riftbound --dry-run
//   node scripts/rename-obs-scenes.mjs --collection proto_3__FULL_LOCAL__riftbound        # commit
//
// Safety:
//   - Refuses to run if OBS is currently open (it would overwrite our
//     edits on exit). Force with --i-know-what-im-doing if you must.
//     Dry-run mode bypasses this guard since it's read-only.
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

// Hard-coded rename map for this batch — generic "P1/P2/P3/P4" suffixes
// since the rank-per-page count is now vendor-aware on the display side
// (default 1v1 = 10 per page, others = 16 per page). Edit this list to
// perform a different rename pass.
const RENAMES = {
    'Standings - Current Round 1-16':  'Standings - Current Round P1',
    'Standings - Current Round 17-32': 'Standings - Current Round P2',
    'Standings - Current Round 33-48': 'Standings - Current Round P3',
    'Standings - Current Round 49-64': 'Standings - Current Round P4',
};

// ── Args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const collectionArg = args.find(a => a.startsWith('--collection='))?.split('=')[1]
    ?? (args[args.indexOf('--collection') + 1] && !args[args.indexOf('--collection') + 1].startsWith('--')
        ? args[args.indexOf('--collection') + 1] : null);
const dryRun  = args.includes('--dry-run');
const force   = args.includes('--i-know-what-im-doing');

if (!collectionArg) {
    console.error('Usage: rename-obs-scenes.mjs --collection <name-without-.json> [--dry-run] [--i-know-what-im-doing]');
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
function isObsRunning() {
    try {
        const out = execSync('pgrep -x OBS 2>/dev/null', { encoding: 'utf8' }).trim();
        return out.length > 0;
    } catch {
        return false;
    }
}

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
// In OBS's scene-collection JSON, scenes appear as entries in sources[]
// with `id === 'scene'` (and their order in scene_order[]). Validate
// against that set.
const sceneNames = new Set(
    (collection.sources ?? [])
        .filter(s => s.id === 'scene')
        .map(s => s.name)
);
const oldNames = Object.keys(RENAMES);
const newNames = Object.values(RENAMES);

const missing = oldNames.filter(n => !sceneNames.has(n));
if (missing.length) {
    console.error('Pre-flight: some OLD scene names not found in sources[]:');
    for (const m of missing) console.error(`   - "${m}"`);
    console.error('Refusing to proceed — the rename map is out of date with this collection.');
    process.exit(3);
}

const collisions = newNames.filter(n => sceneNames.has(n) && !oldNames.includes(n));
if (collisions.length) {
    console.error('Pre-flight: some NEW names would collide with existing scenes:');
    for (const c of collisions) console.error(`   - "${c}"`);
    console.error('Refusing to proceed — the rename would create duplicate scene names.');
    process.exit(4);
}

const newNameCounts = newNames.reduce((acc, n) => (acc[n] = (acc[n] ?? 0) + 1, acc), {});
const duplicateTargets = Object.entries(newNameCounts).filter(([_, c]) => c > 1);
if (duplicateTargets.length) {
    console.error('Pre-flight: rename map has duplicate TARGETS — would merge scenes:');
    for (const [n, c] of duplicateTargets) console.error(`   - "${n}" appears ${c} times`);
    process.exit(5);
}

// ── Recursive replace ─────────────────────────────────────────────────
// Same walker as rename-obs-transitions.mjs. Bucket paths into known
// reference sites so the report shows where matches were found.
const replacementsByPath = {};
let totalReplacements = 0;

function bucketFor(jsonPath) {
    if (jsonPath.match(/^\.sources\[\d+\]\.name$/))                           return 'sources[].name (the scene itself)';
    if (jsonPath.match(/^\.scene_order\[\d+\]\.name$/))                       return 'scene_order[].name';
    if (jsonPath === '.current_scene')                                        return 'current_scene';
    if (jsonPath === '.current_program_scene')                                return 'current_program_scene';
    if (jsonPath.startsWith('.modules.transition-table.transitions['))        return 'modules.transition-table (from_scene / to_scene)';
    if (jsonPath.startsWith('.modules.advanced-scene-switcher'))              return 'modules.advanced-scene-switcher (any scene ref)';
    if (jsonPath.startsWith('.modules.aitum-multistream'))                    return 'modules.aitum-multistream';
    if (jsonPath.includes('private_settings'))                                return 'sources[].private_settings (per-scene custom data)';
    if (jsonPath.startsWith('.sources[') && jsonPath.endsWith('.settings.scene_name')) return 'sources[].settings.scene_name (scene refs by source)';
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

// Verify each old name was hit in sources[] at least once
const sceneNamesAfter = new Set(
    (collection.sources ?? [])
        .filter(s => s.id === 'scene')
        .map(s => s.name)
);
const stillOld = oldNames.filter(n => sceneNamesAfter.has(n));
if (stillOld.length) {
    console.error('Post-walk sanity check FAILED — these old scene names still appear in sources[]:');
    for (const n of stillOld) console.error(`  - "${n}"`);
    process.exit(6);
}

// ── Write back ────────────────────────────────────────────────────────
if (dryRun) {
    console.log('--dry-run: no changes written.');
    process.exit(0);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `${collectionPath}.rename-${ts}.bak`;
fs.writeFileSync(backupPath, raw);
console.log(`Backup: ${backupPath}`);

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log(`Written: ${collectionPath}`);
console.log('\nReopen OBS to load the renamed scenes.');
