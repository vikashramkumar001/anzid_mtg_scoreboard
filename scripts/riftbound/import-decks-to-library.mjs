#!/usr/bin/env node
// Bulk-load a file of decklists into the deck library.
//
//   node scripts/riftbound/import-decks-to-library.mjs <file> [--server http://host:1378] [--replace]
//
// Expects blocks in Piltover export shape, optionally separated by a rule and
// carrying "# " comment lines:
//
//     ========================================
//     # Akali, Rogue Assassin
//     # Gorica — 1 of 1894 · 14-1-1 · Calm/Fury
//     ========================================
//     Legend:
//     1 Akali, Rogue Assassin
//     Champion:
//     ...
//
// These import as TEXT entries, not links: an archived tournament result
// cannot change, so there is nothing to re-fetch and they work with no
// internet at the venue.

import fs from 'fs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const server = (args.find((a) => a.startsWith('--server=')) || '--server=http://127.0.0.1:1378').split('=')[1];
const replace = args.includes('--replace');

if (!file) {
    console.error('usage: import-decks-to-library.mjs <file> [--server=http://host:1378] [--replace]');
    process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');

// A rule of = signs separates records, but a header block sits BETWEEN two
// rules — so the comments land in a different part than the deck they describe.
// Walk the parts and carry comments forward onto the next part that actually
// contains a deck, or the pilot and finish are silently lost.
const parts = raw.split(/^={10,}$/m).map((b) => b.trim()).filter(Boolean);
const records = [];
let carried = [];
const commentsOf = (b) => b.split('\n').filter((l) => l.startsWith('#')).map((l) => l.replace(/^#\s*/, '').trim());
for (const part of parts) {
    if (!/^\s*Legend:/m.test(part)) { carried = commentsOf(part); continue; }
    const own = commentsOf(part);
    records.push({ block: part, comments: own.length ? own : carried });
    carried = [];
}
if (!records.length) {
    for (const b of raw.split(/\n(?=Legend:)/).map((x) => x.trim()).filter(Boolean)) {
        records.push({ block: b, comments: commentsOf(b) });
    }
}

const decks = [];
for (const { block, comments } of records) {
    // Comment lines are metadata for humans; the parser must not see them.
    const text = block.split('\n').filter((l) => !l.startsWith('#') && !/^={10,}$/.test(l)).join('\n').trim();

    // The legend is authoritative from the deck itself, not the comment.
    const m = text.match(/^\s*Legend:\s*\n\s*\d+\s+(.+?)\s*$/m);
    if (!m) { console.warn(`  skipped a block with no Legend: section`); continue; }

    decks.push({
        legend: m[1],
        label: comments[1] || comments[0] || m[1],
        note: comments[1] || '',
        text,
    });
}

if (!decks.length) { console.error('no decks found in that file'); process.exit(1); }
console.log(`parsed ${decks.length} decks from ${file}`);

const res = await fetch(`${server}/api/deck-library/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decks, replace }),
});
const out = await res.json().catch(() => ({}));
if (!res.ok) { console.error('import failed:', out.error || res.status); process.exit(1); }

console.log(`added ${out.added}; library now holds ${out.total}`);
for (const f of out.failed || []) console.log(`  FAILED ${f.label}: ${f.error}`);
process.exit(out.failed?.length ? 1 : 0);
