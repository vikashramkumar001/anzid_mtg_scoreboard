#!/usr/bin/env node
/**
 * Preflight check for a machine that runs the broadcast stack.
 *
 * Verifies the four layers that have to line up before a show:
 *   1. repo + node deps
 *   2. gitignored app assets (animations, .env, restream-config)
 *   3. OBS install: collection, plugins, fonts, websocket
 *   4. every file the collection references actually exists on disk
 *
 * Read-only. Never modifies OBS or the repo.
 *
 *   node scripts/obs/verify-machine.mjs
 *   node scripts/obs/verify-machine.mjs --collection "my collection"
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const HOME = os.homedir();
const OBS_DIR = path.join(HOME, 'Library/Application Support/obs-studio');
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OBS_PW = process.env.OBS_WS_PASSWORD || 'RRWtUPVpGf6myRvx';

let pass = 0, warn = 0, fail = 0;
const ok   = m => { pass++; console.log(`  \x1b[32m✓\x1b[0m ${m}`); };
const meh  = m => { warn++; console.log(`  \x1b[33m!\x1b[0m ${m}`); };
const bad  = m => { fail++; console.log(`  \x1b[31m✗\x1b[0m ${m}`); };
const head = m => console.log(`\n\x1b[1m${m}\x1b[0m`);
const mb   = b => (b / 1048576).toFixed(0) + ' MB';

// ── 1. repo + deps ─────────────────────────────────────────────────────────
head('1. Repo & Node');
const nodeMajor = Number(process.versions.node.split('.')[0]);
nodeMajor === 18
  ? ok(`node ${process.version}`)
  : meh(`node ${process.version} — dev Mac runs v18.x; other majors are untested`);

try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO }).toString().trim();
  const sha    = execSync('git rev-parse --short HEAD',      { cwd: REPO }).toString().trim();
  ok(`on branch ${branch} @ ${sha}`);
  const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
  if (dirty) meh(`${dirty.split('\n').length} uncommitted change(s)`);
} catch { bad('not a git repo (or git unavailable)'); }

fs.existsSync(path.join(REPO, 'node_modules'))
  ? ok('node_modules present')
  : bad('node_modules missing — run: npm install');

// ── 2. gitignored app assets ───────────────────────────────────────────────
head('2. Gitignored app assets');
const gitignored = [
  ['.env',                                 'Topdeck import (TOPDECK_API_KEY)'],
  ['public/js/restream-config.js',         'anu Restream chat overlay'],
  ['public/assets/animations/riftbound',   'decklist wallpaper, legend art, metagame/standings motion'],
  ['public/assets/animations/mtg',         'MTG animations'],
];
for (const [rel, why] of gitignored) {
  const p = path.join(REPO, rel);
  if (!fs.existsSync(p)) { bad(`${rel} MISSING — ${why}`); continue; }
  if (fs.statSync(p).isDirectory()) {
    const n = execSync(`find ${JSON.stringify(p)} -type f | wc -l`).toString().trim();
    const s = execSync(`du -sh ${JSON.stringify(p)}`).toString().split('\t')[0].trim();
    ok(`${rel} (${n} files, ${s})`);
  } else ok(rel);
}
if (fs.existsSync(path.join(REPO, '.env'))) {
  /TOPDECK_API_KEY=\S+/.test(fs.readFileSync(path.join(REPO, '.env'), 'utf8'))
    ? ok('.env defines TOPDECK_API_KEY')
    : meh('.env exists but has no TOPDECK_API_KEY — Topdeck fetch will fail');
}

// ── 3. OBS install ─────────────────────────────────────────────────────────
head('3. OBS');
if (!fs.existsSync(OBS_DIR)) {
  bad('no OBS config dir — is OBS installed and launched at least once?');
} else {
  const REQUIRED_PLUGINS = [
    ['move-transition',       'Move Transition — drives ~326 animation filters'],
    ['source-clone',          'Source Clone'],
    ['obs-ndi',               'NDI (DistroAV / obs-ndi)'],
    ['obs-shaderfilter',      'Shader Filter'],
    ['source-record',         'Source Record'],
    ['obs-plugin-countdown',  'Ashmanix Countdown — feeds the merlion BTB timer'],
  ];
  const installed = [
    ...(fs.existsSync(path.join(OBS_DIR, 'plugins')) ? fs.readdirSync(path.join(OBS_DIR, 'plugins')) : []),
    ...(fs.existsSync('/Library/Application Support/obs-studio/plugins') ? fs.readdirSync('/Library/Application Support/obs-studio/plugins') : []),
  ].join(' ').toLowerCase();
  for (const [slug, label] of REQUIRED_PLUGINS) {
    installed.includes(slug) ? ok(`plugin: ${label}`) : bad(`plugin MISSING: ${label}`);
  }

  const FONTS = ['Beaufort', 'Beni', 'Gotham', 'Tusker'];
  const fontFiles = [
    ...(fs.existsSync(path.join(HOME, 'Library/Fonts')) ? fs.readdirSync(path.join(HOME, 'Library/Fonts')) : []),
    ...(fs.existsSync('/Library/Fonts') ? fs.readdirSync('/Library/Fonts') : []),
  ].join(' ').toLowerCase();
  for (const f of FONTS) {
    fontFiles.includes(f.toLowerCase()) ? ok(`font: ${f}`) : bad(`font MISSING: ${f} — OBS text will fall back`);
  }

  // ── 4. collection + every file it references ────────────────────────────
  const arg = process.argv.indexOf('--collection');
  const scenesDir = path.join(OBS_DIR, 'basic/scenes');
  let collectionFile = null;
  if (arg > -1) {
    const want = process.argv[arg + 1];
    collectionFile = fs.readdirSync(scenesDir).find(f => f.toLowerCase().includes(want.toLowerCase().replace(/[^a-z0-9]/gi, '')));
  } else {
    const ini = ['user.ini', 'global.ini']
      .map(f => path.join(OBS_DIR, f)).filter(fs.existsSync)
      .map(f => fs.readFileSync(f, 'utf8')).join('\n');
    const m = ini.match(/^SceneCollectionFile=(.+)$/m);
    if (m) {
      const raw = m[1].trim();
      collectionFile = raw.endsWith('.json') ? raw : raw + '.json';
    }
  }

  head('4. Scene collection & referenced media');
  if (!collectionFile || !fs.existsSync(path.join(scenesDir, collectionFile))) {
    bad(`could not resolve the current scene collection — import it via OBS → Scene Collection → Import`);
    console.log(`     available: ${fs.existsSync(scenesDir) ? fs.readdirSync(scenesDir).filter(f => f.endsWith('.json')).join(', ') : '(none)'}`);
  } else {
    const c = JSON.parse(fs.readFileSync(path.join(scenesDir, collectionFile), 'utf8'));
    const sceneCount = (c.sources || []).filter(s => s.id === 'scene').length;
    ok(`collection "${collectionFile}" — ${sceneCount} scenes, ${(c.sources || []).length} sources`);

    const KEYS = ['local_file','file','path','image_path','video_path','image_file','sound_path','mask_image'];
    const seen = new Map();
    const walk = (o, ref) => {
      if (!o || typeof o !== 'object') return;
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'string' && KEYS.includes(k) && v.startsWith('/')) {
          if (!seen.has(v)) seen.set(v, ref);
        } else walk(v, ref);
      }
    };
    for (const s of c.sources || []) { walk(s.settings, s.name); for (const f of s.filters || []) walk(f.settings, `${s.name} [filter]`); }
    for (const t of c.transitions || []) walk(t.settings, `transition: ${t.name}`);

    // Where does each source appear, and is it actually shown there?
    // Scenes whose name ends in "*" are the operator's archive convention.
    const placement = new Map();
    for (const s of c.sources || []) {
      if (s.id !== 'scene') continue;
      const archived = s.name.trim().endsWith('*') || /^-+ Archive/i.test(s.name);
      for (const it of s.settings?.items || []) {
        if (!placement.has(it.name)) placement.set(it.name, []);
        placement.get(it.name).push({ scene: s.name, visible: !!it.visible, archived });
      }
    }
    const isLive = srcName => (placement.get(srcName) || []).some(x => x.visible && !x.archived);

    const missing = [...seen].filter(([p]) => !fs.existsSync(p));
    const bytes = [...seen].filter(([p]) => fs.existsSync(p)).reduce((a, [p]) => a + fs.statSync(p).size, 0);
    const critical = missing.filter(([, ref]) => isLive(ref.replace(' [filter]', '')));
    const legacy   = missing.filter(([, ref]) => !isLive(ref.replace(' [filter]', '')));

    if (!missing.length) ok(`all ${seen.size} referenced files present (${mb(bytes)})`);
    else ok(`${seen.size - missing.length} of ${seen.size} referenced files present (${mb(bytes)})`);

    if (critical.length) {
      bad(`${critical.length} MISSING file(s) are visible in a live scene — these WILL show as red/black on air`);
      for (const [p, ref] of critical) {
        const where = (placement.get(ref.replace(' [filter]', '')) || []).filter(x => x.visible && !x.archived).map(x => x.scene);
        console.log(`     ${ref}  →  ${p.replace(HOME, '~')}`);
        console.log(`        shown in: ${where.slice(0, 4).join(', ')}${where.length > 4 ? ` +${where.length - 4}` : ''}`);
      }
      console.log(`     NOTE: OBS only writes this file on quit / collection-switch, so a source you`);
      console.log(`           just relinked in the running OBS can still look missing here.`);
    } else if (missing.length) {
      ok('no missing file is visible in a live scene');
    }

    if (legacy.length) {
      meh(`${legacy.length} missing file(s) are hidden or in archived "*" scenes — safe to ignore`);
      for (const [p, ref] of legacy) console.log(`     ${ref}  →  ${p.replace(HOME, '~')}`);
    }

    const stingers = (c.transitions || []).filter(t => t.id === 'obs_stinger_transition');
    const badSting = stingers.filter(t => !t.settings?.path || !fs.existsSync(t.settings.path));
    badSting.length === 0
      ? ok(`${stingers.length} stinger transitions → ${path.basename(stingers[0]?.settings?.path || '?')}`)
      : bad(`${badSting.length} stinger(s) point at a missing file: ${badSting.map(t => t.name).join(', ')}`);

    // username check — absolute paths bake in the dev Mac's short name
    const foreign = [...seen].map(([p]) => p).filter(p => p.startsWith('/Users/') && !p.startsWith(HOME + '/'));
    if (foreign.length) {
      bad(`${foreign.length} path(s) reference a DIFFERENT user's home — this machine is "${path.basename(HOME)}"`);
      console.log(`     e.g. ${foreign[0]}`);
    } else ok(`all paths resolve under this machine's home (${path.basename(HOME)})`);
  }
}

// ── 5. websocket ───────────────────────────────────────────────────────────
head('5. OBS WebSocket (port 4455)');
try {
  const { default: OBSWebSocket } = await import('obs-websocket-js');
  const obs = new OBSWebSocket();
  await obs.connect('ws://localhost:4455', OBS_PW);
  const v = await obs.call('GetVersion');
  ok(`connected — OBS ${v.obsVersion}, websocket ${v.obsWebSocketVersion}`);
  const { scenes } = await obs.call('GetSceneList');
  const { inputs } = await obs.call('GetInputList');
  ok(`live: ${scenes.length} scenes, ${inputs.length} inputs`);

  // presets vs live
  const presetDir = path.join(REPO, 'data/obs exports');
  for (const f of fs.readdirSync(presetDir).filter(f => f.endsWith('.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(presetDir, f), 'utf8'));
    if (!p.scenes) continue;
    const liveScenes = new Set(scenes.map(s => s.sceneName));
    const liveInputs = new Set(inputs.map(i => i.inputName));
    const ms = Object.keys(p.scenes).filter(s => !liveScenes.has(s));
    const mi = Object.keys(p.inputs || {}).filter(i => !liveInputs.has(i));
    const label = `${f.replace('.json', '')} (${Object.keys(p.scenes).length} scenes)`;
    if (!ms.length && !mi.length) ok(`preset ${label} — fully applicable`);
    else meh(`preset ${label} — ${ms.length} scene(s), ${mi.length} input(s) not in this collection`);
  }
  await obs.disconnect();
} catch (e) {
  bad(`cannot reach OBS WebSocket: ${e.message}`);
  console.log('     Tools → WebSocket Server Settings → enable, port 4455, set the password');
}

// ── summary ────────────────────────────────────────────────────────────────
console.log(`\n\x1b[1mSummary:\x1b[0m \x1b[32m${pass} ok\x1b[0m, \x1b[33m${warn} warn\x1b[0m, \x1b[31m${fail} fail\x1b[0m`);
process.exit(fail ? 1 : 0);
