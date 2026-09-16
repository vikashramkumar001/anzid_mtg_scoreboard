#!/usr/bin/env node
// Add one decklist (text, in master-control's section format) to the deck
// library of a RUNNING coverage-hub server via its socket API.
//   node scripts/riftbound/add-deck-to-library.mjs --file deck.txt --legend "Vex, Gloomist" \
//        --label "aduig33 — Lucca Showdown, 6th" [--host http://host:1378]
import { io } from 'socket.io-client';
import { readFileSync } from 'fs';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const HOST = opt('--host', 'http://127.0.0.1:1378').replace(/\/+$/, '');
const file = opt('--file'), legend = opt('--legend'), label = opt('--label', '');
if (!file || !legend) { console.error('usage: --file deck.txt --legend "Name, Title" [--label ...] [--host ...]'); process.exit(2); }
const text = readFileSync(file, 'utf8');
const socket = io(HOST, { transports: ['websocket'] });
const timeout = setTimeout(() => { console.error('connect timeout'); process.exit(1); }, 8000);
socket.on('connect', () => {
  clearTimeout(timeout);
  socket.emit('save-deck-library-entry', { legend, label, text }, (res) => {
    console.log(res && res.ok ? `added: ${legend} — ${label} (id ${res.id || res.entry?.id || '?'})` : `FAILED: ${JSON.stringify(res)}`);
    socket.disconnect(); process.exit(res && res.ok ? 0 : 1);
  });
});
