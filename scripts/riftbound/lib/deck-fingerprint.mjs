// A deck's identity for the library tools: its legend plus the exact cards in
// every section, order- and case-insensitive. Labels are NOT part of it —
// labels get edited (by the operator, by best-of-to-library.mjs when it
// standardises them), and a tool that recognises a deck by its label will add
// it a second time after any rename. Every tool that asks "is this deck
// already in the library?" must use this.
import { parseDeckString } from '../../../public/js/shared/deck-parse.js';

const norm = (lines) => (lines || [])
  .map(l => String(l).trim().toLowerCase().replace(/\s+/g, ' '))
  .filter(Boolean).sort().join('|');

export function fingerprint(legend, text) {
  const p = parseDeckString(String(text || ''));
  return [
    String(legend || '').trim().toLowerCase(),
    norm(p.champion), norm(p.maindeck), norm(p.battlefield), norm(p.runepool), norm(p.sideboard),
  ].join('#');
}
