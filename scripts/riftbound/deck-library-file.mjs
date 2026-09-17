#!/usr/bin/env node
// OFFLINE deck-library editor: prune to the named legends and/or add text
// decks by editing data/deckLibrary.json directly. Use this ONLY when the
// coverage-hub server is NOT running on this machine (it keeps the library in
// memory and would overwrite the file on its next save). With a running
// server use prune-deck-library.mjs / add-deck-to-library.mjs instead.
//
//   node scripts/riftbound/deck-library-file.mjs --keep "Vex,Reksai,Lillia,Ornn,Azir,Jayce" \
//        [--add data/riftbound/deck-library-imports/x.txt --legend "Vex, Gloomist" --label "..."] \
//        [--manifest data/riftbound/deck-library-imports/manifest.json] \
//        [--path data/deckLibrary.json] [--dry-run]
//
// --manifest loads every deck listed in a manifest ({ decks: [{file, legend,
// label}] }, files relative to the manifest). A deck already in the library —
// same legend and the same cards, whatever its label says now — is skipped, so
// re-running is safe even after entries have been relabelled. Prune runs first,
// so a manifest deck is never pruned by the same invocation.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fingerprint } from './lib/deck-fingerprint.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const PATH = opt('--path', 'data/deckLibrary.json');
const KEEP = opt('--keep', '').split(',').map(s => s.trim()).filter(Boolean);
const ADD = opt('--add'), LEGEND = opt('--legend'), LABEL = opt('--label', '');
const MANIFEST = opt('--manifest');
const DRY = args.includes('--dry-run');

const norm = (s) => String(s || '').toLowerCase().replace(/['’]/g, '').trim();
const champion = (legend) => norm(String(legend || '').split(',')[0]);

const lib = existsSync(PATH) ? JSON.parse(readFileSync(PATH, 'utf8')) : { decks: [] };
lib.decks = Array.isArray(lib.decks) ? lib.decks : [];
const before = lib.decks.length;

if (KEEP.length) {
  const keepSet = new Set(KEEP.map(norm));
  const drop = lib.decks.filter(d => !keepSet.has(champion(d.legend)));
  for (const d of lib.decks) console.log(`  ${keepSet.has(champion(d.legend)) ? 'KEEP  ' : 'DELETE'} ${d.legend}  —  ${d.label || d.link || ''}`);
  lib.decks = lib.decks.filter(d => keepSet.has(champion(d.legend)));
  console.log(`prune: ${before} entries → keep ${lib.decks.length}, delete ${drop.length}`);
}

// Same shape saveDeckEntry() writes. Returns 'added' | 'skipped'.
function addDeck({ text, legend, label }) {
  const cleanLegend = String(legend || '').trim();
  const cleanLabel = String(label || '').trim() || cleanLegend;
  const cleanText = String(text || '').trim();
  if (!cleanLegend) throw new Error('a deck needs a legend');
  if (!cleanText) throw new Error(`empty decklist for ${cleanLegend} — ${cleanLabel}`);
  const fp = fingerprint(cleanLegend, cleanText);
  const dup = lib.decks.find(d => d.text && fingerprint(d.legend, d.text) === fp);
  if (dup) { console.log(`add: already present (${dup.id}) — skipped: ${cleanLegend} — ${cleanLabel}${dup.label !== cleanLabel ? `  (in the library as "${dup.label}")` : ''}`); return 'skipped'; }
  lib.decks.push({
    id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    legend: cleanLegend, label: cleanLabel, link: '', text: cleanText, note: '', addedAt: Date.now(), lastUsedAt: 0,
  });
  console.log(`add: ${cleanLegend} — ${cleanLabel}`);
  return 'added';
}

if (ADD) {
  if (!LEGEND) { console.error('--add needs --legend'); process.exit(2); }
  addDeck({ text: readFileSync(ADD, 'utf8'), legend: LEGEND, label: LABEL });
}

if (MANIFEST) {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const decks = Array.isArray(manifest?.decks) ? manifest.decks : [];
  if (!decks.length) { console.error(`${MANIFEST}: no decks listed`); process.exit(2); }
  let added = 0, skipped = 0;
  for (const m of decks) {
    if (!m || !m.file || !m.legend) { console.error(`manifest entry needs file + legend: ${JSON.stringify(m)}`); process.exit(2); }
    const file = resolve(dirname(MANIFEST), m.file);
    if (!existsSync(file)) { console.error(`manifest: missing file ${file}`); process.exit(2); }
    const r = addDeck({ text: readFileSync(file, 'utf8'), legend: m.legend, label: m.label });
    if (r === 'added') added++; else skipped++;
  }
  console.log(`manifest: ${decks.length} decks — added ${added}, already present ${skipped}`);
}

if (DRY) { console.log(`(dry run — ${PATH} not written; would hold ${lib.decks.length} entries)`); process.exit(0); }
writeFileSync(PATH, JSON.stringify(lib, null, 2));
console.log(`${PATH}: ${lib.decks.length} entries written`);
