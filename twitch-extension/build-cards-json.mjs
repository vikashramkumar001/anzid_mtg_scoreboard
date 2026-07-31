#!/usr/bin/env node
/**
 * build-cards-json.mjs — bundle a compact card DB for the Twitch extension.
 *
 * Reads  data/riftbound/riftboundCardNames.json  (name -> full card record)
 * Writes twitch-extension/cards.json             (publicCode -> compact record)
 *
 * Compact record: { n: name, t: type, d: "Domain/Domain", e: energy, r: rarity }
 * No images/URLs — the overlay builds image URLs from IMAGE_BASE + code.
 *
 * Run from the repo root:
 *   node twitch-extension/build-cards-json.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, '..', 'data', 'riftbound', 'riftboundCardNames.json');
const outPath = join(here, 'cards.json');

const src = JSON.parse(readFileSync(srcPath, 'utf8'));

const out = {};
let skipped = 0;

for (const [name, card] of Object.entries(src)) {
  const code = card && card.publicCode;
  if (!code) { skipped++; continue; }

  const rec = { n: name };
  if (card.type) rec.t = card.type;
  if (Array.isArray(card.domain) && card.domain.length) rec.d = card.domain.join('/');
  if (card.energy !== undefined && card.energy !== null && card.energy !== '') rec.e = String(card.energy);
  if (card.rarity) rec.r = card.rarity;

  out[code] = rec;
}

writeFileSync(outPath, JSON.stringify(out));

console.log(`cards.json: ${Object.keys(out).length} cards written to ${outPath}` +
            (skipped ? ` (${skipped} entries without publicCode skipped)` : ''));
