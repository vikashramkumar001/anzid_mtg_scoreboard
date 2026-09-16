#!/usr/bin/env node
// OFFLINE deck-library editor: prune to the named legends and/or add a text
// deck by editing data/deckLibrary.json directly. Use this ONLY when the
// coverage-hub server is NOT running on this machine (it keeps the library in
// memory and would overwrite the file on its next save). With a running
// server use prune-deck-library.mjs / add-deck-to-library.mjs instead.
//
//   node scripts/riftbound/deck-library-file.mjs --keep "Vex,Reksai,Lillia,Ornn,Azir,Jayce" \
//        [--add data/riftbound/deck-library-imports/x.txt --legend "Vex, Gloomist" --label "..."] \
//        [--path data/deckLibrary.json] [--dry-run]
import { readFileSync, writeFileSync, existsSync } from 'fs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const PATH = opt('--path', 'data/deckLibrary.json');
const KEEP = opt('--keep', '').split(',').map(s => s.trim()).filter(Boolean);
const ADD = opt('--add'), LEGEND = opt('--legend'), LABEL = opt('--label', '');
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
if (ADD) {
  if (!LEGEND) { console.error('--add needs --legend'); process.exit(2); }
  const text = readFileSync(ADD, 'utf8').trim();
  const dup = lib.decks.find(d => d.legend === LEGEND && (d.label || '') === (LABEL || LEGEND));
  if (dup) console.log(`add: already present (${dup.id}) — skipped`);
  else {
    // same shape saveDeckEntry() writes
    lib.decks.push({
      id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      legend: LEGEND, label: LABEL || LEGEND, link: '', text, note: '', addedAt: Date.now(), lastUsedAt: 0,
    });
    console.log(`add: ${LEGEND} — ${LABEL || LEGEND}`);
  }
}
if (DRY) { console.log(`(dry run — ${PATH} not written; would hold ${lib.decks.length} entries)`); process.exit(0); }
writeFileSync(PATH, JSON.stringify(lib, null, 2));
console.log(`${PATH}: ${lib.decks.length} entries written`);
