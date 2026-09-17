#!/usr/bin/env node
// Add decklists (text, in master-control's section format) to the deck
// library of a RUNNING coverage-hub server via its socket API. The server
// updates its in-memory library and rewrites data/deckLibrary.json itself, so
// no restart is needed and every open picker refreshes.
//
//   node scripts/riftbound/add-deck-to-library.mjs --file deck.txt --legend "Vex, Gloomist" \
//        --label "aduig33 — Lucca Showdown, 6th" [--host http://host:1378]
//   node scripts/riftbound/add-deck-to-library.mjs --manifest data/riftbound/deck-library-imports/manifest.json \
//        [--host http://host:1378]
//
// --manifest loads every deck in { decks: [{file, legend, label}] } (files
// relative to the manifest). A deck already in the library — same legend and
// the same cards, whatever its label says now — is skipped, so re-running is
// safe even after entries have been relabelled. A single --file add is always
// sent as-is (no duplicate check), matching the master-control form.
import { io } from 'socket.io-client';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fingerprint } from './lib/deck-fingerprint.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const HOST = opt('--host', 'http://127.0.0.1:1378').replace(/\/+$/, '');
const file = opt('--file'), legend = opt('--legend'), label = opt('--label', '');
const MANIFEST = opt('--manifest');

// Build the list of decks to send.
let wanted = [];
if (MANIFEST) {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const decks = Array.isArray(manifest?.decks) ? manifest.decks : [];
  if (!decks.length) { console.error(`${MANIFEST}: no decks listed`); process.exit(2); }
  for (const m of decks) {
    if (!m || !m.file || !m.legend) { console.error(`manifest entry needs file + legend: ${JSON.stringify(m)}`); process.exit(2); }
    const path = resolve(dirname(MANIFEST), m.file);
    if (!existsSync(path)) { console.error(`manifest: missing file ${path}`); process.exit(2); }
    wanted.push({ legend: String(m.legend).trim(), label: String(m.label || m.legend).trim(), text: readFileSync(path, 'utf8').trim() });
  }
} else {
  if (!file || !legend) { console.error('usage: --file deck.txt --legend "Name, Title" [--label ...] [--host ...]  |  --manifest manifest.json [--host ...]'); process.exit(2); }
  wanted.push({ legend: legend.trim(), label: (label || legend).trim(), text: readFileSync(file, 'utf8').trim() });
}
for (const w of wanted) if (!w.text) { console.error(`empty decklist: ${w.legend} — ${w.label}`); process.exit(2); }

// Manifest mode skips decks the library already holds.
if (MANIFEST) {
  const res = await fetch(`${HOST}/api/deck-library`);
  if (!res.ok) { console.error(`GET ${HOST}/api/deck-library -> HTTP ${res.status}`); process.exit(1); }
  const { decks = [] } = await res.json();
  const have = new Map(decks.filter(d => d.text).map(d => [fingerprint(d.legend, d.text), d]));
  const keep = [];
  for (const w of wanted) {
    const hit = have.get(fingerprint(w.legend, w.text));
    if (hit) console.log(`already present — skipped: ${w.legend} — ${w.label}${hit.label !== w.label ? `  (in the library as "${hit.label}")` : ''}`);
    else keep.push(w);
  }
  wanted = keep;
  if (!wanted.length) { console.log(`manifest: nothing to add; library has ${decks.length} entries`); process.exit(0); }
}

const socket = io(HOST, { transports: ['websocket'] });
await new Promise((ok, fail) => {
  socket.on('connect', ok);
  socket.on('connect_error', fail);
  setTimeout(() => fail(new Error('connect timeout')), 8000);
}).catch(e => { console.error(`could not connect to ${HOST}: ${e.message}`); process.exit(1); });

let added = 0, failed = 0;
for (const w of wanted) {
  const res = await new Promise(r => socket.emit('save-deck-library-entry', { legend: w.legend, label: w.label, text: w.text }, r));
  if (res && res.ok) { added++; console.log(`added: ${w.legend} — ${w.label} (id ${res.entry?.id || res.id || '?'})`); }
  else { failed++; console.error(`FAILED: ${w.legend} — ${w.label}: ${JSON.stringify(res)}`); }
}
socket.disconnect();
const after = await fetch(`${HOST}/api/deck-library`).then(r => r.json()).catch(() => ({}));
console.log(`added ${added}, failed ${failed}; library now has ${(after.decks || []).length} entries`);
process.exit(failed ? 1 : 0);
