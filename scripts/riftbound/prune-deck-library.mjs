#!/usr/bin/env node
// Prune the deck library on a RUNNING coverage-hub server, keeping only decks
// whose legend is one of the champions you name. Deletes go through the
// server's own socket API (delete-deck-library-entry), so the running server
// updates its in-memory library and rewrites data/deckLibrary.json itself —
// no restart, and every open master-control / iPad picker refreshes.
//
//   node scripts/riftbound/prune-deck-library.mjs --host http://192.168.4.20:1378 \
//        --keep "Vex,Rek'Sai,Lillia,Ornn,Azir,Jayce" [--dry-run]
//
// A legend matches a keep name when its champion (the part before the comma,
// e.g. "Rek'Sai" in "Rek'Sai, Void Burrower") equals it, apostrophes and case
// ignored. Anything that does not match is deleted.
import { io } from 'socket.io-client';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const HOST = (opt('--host', 'http://127.0.0.1:1378')).replace(/\/+$/, '');
const KEEP = (opt('--keep', '')).split(',').map(s => s.trim()).filter(Boolean);
const DRY = args.includes('--dry-run');
if (!KEEP.length) { console.error('usage: --keep "Vex,Rek\'Sai,..." [--host http://host:1378] [--dry-run]'); process.exit(2); }

const norm = (s) => String(s || '').toLowerCase().replace(/['’]/g, '').trim();
const champion = (legend) => norm(String(legend || '').split(',')[0]);
const keepSet = new Set(KEEP.map(norm));

const res = await fetch(`${HOST}/api/deck-library`);
if (!res.ok) { console.error(`GET ${HOST}/api/deck-library -> HTTP ${res.status}`); process.exit(1); }
const { decks = [] } = await res.json();

const keep = decks.filter(d => keepSet.has(champion(d.legend)));
const drop = decks.filter(d => !keepSet.has(champion(d.legend)));
console.log(`${HOST}: ${decks.length} entries — keep ${keep.length}, delete ${drop.length}${DRY ? ' (dry run)' : ''}`);
for (const d of keep) console.log(`  KEEP   ${d.legend}  —  ${d.label || d.link || ''}`);
for (const d of drop) console.log(`  DELETE ${d.legend}  —  ${d.label || d.link || ''}`);
if (DRY || !drop.length) process.exit(0);

const socket = io(HOST, { transports: ['websocket'] });
await new Promise((ok, fail) => { socket.on('connect', ok); socket.on('connect_error', fail); setTimeout(() => fail(new Error('connect timeout')), 8000); });
let deleted = 0, failed = 0;
for (const d of drop) {
  const ack = await new Promise(r => socket.emit('delete-deck-library-entry', { id: d.id }, r));
  if (ack && ack.ok) deleted++; else { failed++; console.error(`  failed: ${d.legend} — ${JSON.stringify(ack)}`); }
}
socket.disconnect();
const after = await (await fetch(`${HOST}/api/deck-library`)).json();
console.log(`deleted ${deleted}, failed ${failed}; library now has ${(after.decks || []).length} entries`);
process.exit(failed ? 1 : 0);
