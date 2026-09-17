#!/usr/bin/env node
// Load an event's "best of legend" decks — the highest PUBLISHED finisher on
// each legend — into a coverage-hub deck library.
//
//   node scripts/riftbound/best-of-to-library.mjs --event 889532 --name "RQ Singapore 2026" \
//        [--skip-legends "Ahri, Nine-Tailed Fox;Annie, Dark Child;..."] \
//        [--host http://127.0.0.1:1378] [--dry-run] [--out best-of-889532.json]
//
// --skip-legends (semicolon-separated, names contain commas) leaves out legends
// Riot does not award a Best-Of for — the "not competing for Best-Of" rows in
// the playriftbound.com Top Decks articles: Ahri, Annie, Kai'Sa, Lux, Miss
// Fortune, Sett, Teemo, Viktor, Volibear as of RQ Singapore 2026. Their best
// pilots are still printed, marked "skipped", so nothing is hidden.
//
// Sources (all from data/cardeio, nothing is fetched):
//   cache/event-<id>-decklists.json       who played which legend, and the list
//   cache/event-<id>-registrations.json   Riot ID ("Display Name") per User ID
//   standings-api-event-<id>-round-N.json final rank + record (highest N wins)
//
// A player counts only if they have a rank in the final standings snapshot, so
// cancelled registrations and players missing from the published standings
// never win a legend, whatever the registrations export says. Ties on rank
// cannot happen (ranks are unique); the standings tiebreak is kept anyway.
//
// Applying to a server (--host): the current library is fetched and every
// candidate is matched against it BY DECK CONTENT (legend + the same cards in
// every section), not by label. A match is updated in place (same id, new
// label — so a renamed Riot ID or a hand-typed label gets the standard one),
// anything else is added. Existing entries that match no candidate are left
// alone and listed, so a superseded "best of" is visible but never deleted.
// One POST to /api/deck-library/import does the work; the server persists and
// broadcasts, no restart.
//
// Privacy: only Riot IDs (Display Name / Game Name) are ever written or
// printed. Real names and emails in the source files are never read into
// the output.
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseDeckString } from '../../public/js/shared/deck-parse.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const EVENT = opt('--event');
const NAME = opt('--name');
const HOST = opt('--host', '').replace(/\/+$/, '');
const OUT = opt('--out');
const SKIP = new Set(opt('--skip-legends', '').split(';').map(s => s.trim().toLowerCase()).filter(Boolean));
const DRY = args.includes('--dry-run');
if (!EVENT || !NAME) { console.error('usage: --event <carde event id> --name "RQ Singapore 2026" [--host http://host:1378] [--dry-run] [--out file.json]'); process.exit(2); }

const cacheDir = path.join(ROOT, 'data/cardeio/cache');
const standingsDir = path.join(ROOT, 'data/cardeio');

// ---- inputs -----------------------------------------------------------------
const decklistFile = JSON.parse(readFileSync(path.join(cacheDir, `event-${EVENT}-decklists.json`), 'utf8'));
const decklists = Array.isArray(decklistFile) ? decklistFile : (decklistFile.decklists || []);
const registrations = JSON.parse(readFileSync(path.join(cacheDir, `event-${EVENT}-registrations.json`), 'utf8'));

const roundRe = new RegExp(`^standings-api-event-${EVENT}-round-(\\d+)\\.json$`);
const rounds = readdirSync(standingsDir).map(f => f.match(roundRe)).filter(Boolean).map(m => Number(m[1]));
if (!rounds.length) { console.error(`no standings-api-event-${EVENT}-round-N.json in data/cardeio`); process.exit(1); }
const finalRound = Math.max(...rounds);
const standingsFile = JSON.parse(readFileSync(path.join(standingsDir, `standings-api-event-${EVENT}-round-${finalRound}.json`), 'utf8'));
const standingsRows = Array.isArray(standingsFile) ? standingsFile : (standingsFile.standings || standingsFile.data || []);

// Riot ID per User ID — Display Name first, Game Name as the fallback.
const riotById = new Map();
for (const r of registrations) {
  const id = String(r['User ID'] ?? r.userId ?? '');
  const riot = String(r['Display Name'] || r['Game Name'] || '').trim();
  if (id && riot) riotById.set(id, riot);
}

// Final standing per player id. A player removed after the event leaves a
// row with no player but a rank still counted (Singapore has one at 14th);
// Riot's published placings close that gap, so ranks below it shift up by
// the number of empty rows above them. That keeps labels in step with
// playriftbound.com's "Top Decks" articles.
const emptyRanks = standingsRows
  .filter(row => !row?.player && Number.isFinite(Number(row?.rank)))
  .map(row => Number(row.rank));
const published = (rank) => rank - emptyRanks.filter(r => r < rank).length;
const standingById = new Map();
for (const row of standingsRows) {
  const pid = row?.player?.id;
  const rank = Number(row?.rank);
  if (pid == null || !Number.isFinite(rank)) continue;
  const u = row.user_event_status || {};
  standingById.set(String(pid), {
    rank: published(rank), apiRank: rank,
    matchPoints: Number(row.match_points ?? u.total_match_points ?? 0),
    won: Number(u.matches_won ?? 0), lost: Number(u.matches_lost ?? 0), drawn: Number(u.matches_drawn ?? 0),
  });
}
const rankedPlayers = standingById.size;
if (emptyRanks.length) console.log(`  ${emptyRanks.length} empty standings row(s) at rank ${emptyRanks.join(', ')} — placings below shift up to match the published numbering`);

// ---- deck text (master-control section format) -----------------------------
const byQtyThenName = (a, b) => (b.quantity - a.quantity) || a.name.localeCompare(b.name);
function section(title, cards) {
  return `${title}:\n${cards.slice().sort(byQtyThenName).map(c => `${c.quantity} ${c.name}`).join('\n')}`;
}
function deckToText(dl) {
  const secs = Object.fromEntries((dl.sections || []).map(s => [s.section_key, s.cards || []]));
  const aux = Object.fromEntries((dl.auxiliary_sections || []).map(s => [s.type_code, s.cards || []]));
  const parts = [
    section('Legend', aux.legend || []),
    section('Champion', aux.champion || []),
    section('MainDeck', secs.main || []),
    section('Battlefields', aux.battlefield || []),
    section('Runes', secs.rune_pool || []),
  ];
  if ((secs.sideboard || []).length) parts.push(section('Sideboard', secs.sideboard));
  return parts.join('\n\n') + '\n';
}
function legendOf(dl) {
  const aux = (dl.auxiliary_sections || []).find(s => s.type_code === 'legend');
  return aux?.cards?.[0]?.name || '';
}
function domainsOf(dl) {
  const d = Array.isArray(dl.domain_identity) ? dl.domain_identity : [];
  if (d.length) return d.join('/');
  const runes = ((dl.sections || []).find(s => s.section_key === 'rune_pool')?.cards || []).map(c => c.name.replace(/ Rune$/, ''));
  return [...new Set(runes)].sort().join('/');
}
const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

// Content fingerprint: legend + every section as a sorted multiset. Used to
// match candidates against library entries regardless of card order/labels.
function fingerprint(legend, text) {
  const p = parseDeckString(text);
  const norm = (lines) => (lines || []).map(l => l.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean).sort().join('|');
  return [String(legend).trim().toLowerCase(), norm(p.champion), norm(p.maindeck), norm(p.battlefield), norm(p.runepool), norm(p.sideboard)].join('#');
}

// ---- pick the best per legend ------------------------------------------------
const perLegend = new Map();   // legend -> { pilots, candidates: [] }
let noStanding = 0, noRiot = 0;
for (const dl of decklists) {
  const legend = legendOf(dl);
  if (!legend) continue;
  const entry = perLegend.get(legend) || { pilots: 0, candidates: [] };
  const pid = String(dl?.user?.id ?? '');
  const st = standingById.get(pid);
  if (!st) { noStanding++; perLegend.set(legend, entry); continue; }
  entry.pilots++;   // pilots = players on this legend who appear in the final standings
  const riot = riotById.get(pid);
  if (!riot) { noRiot++; perLegend.set(legend, entry); continue; }
  entry.candidates.push({ pid, riot, st, dl });
  perLegend.set(legend, entry);
}
const compare = (a, b) => (a.st.rank - b.st.rank) || (b.st.matchPoints - a.st.matchPoints) || (b.st.won - a.st.won);

const picks = [];
const skipped = [];
for (const [legend, { pilots, candidates }] of perLegend) {
  if (!candidates.length) continue;
  candidates.sort(compare);
  const best = candidates[0];
  if (SKIP.has(legend.toLowerCase())) { skipped.push({ legend, best, pilots }); continue; }
  const text = deckToText(best.dl);
  const record = `${best.st.won}-${best.st.lost}-${best.st.drawn}`;
  picks.push({
    legend,
    label: `${best.riot} — ${NAME}, ${ordinal(best.st.rank)} · ${record} · ${domainsOf(best.dl)}`,
    text,
    note: `Best of legend, ${NAME} (Carde.io event ${EVENT}, final standings round ${finalRound}); ${pilots} ranked pilots on this legend`
      + (emptyRanks.length ? `; placings follow the published numbering (${emptyRanks.length} vacated row${emptyRanks.length > 1 ? 's' : ''} closed)` : ''),
    rank: best.st.rank, riot: best.riot, pilots,
    fingerprint: fingerprint(legend, text),
  });
}
picks.sort((a, b) => a.rank - b.rank);

console.log(`${NAME} (event ${EVENT}): ${decklists.length} decklists, ${rankedPlayers} ranked players in round ${finalRound}, ${perLegend.size} legends`);
console.log(`  ${picks.length} legends picked${skipped.length ? `, ${skipped.length} legends skipped (--skip-legends)` : ''}; ignored ${noStanding} decklists with no published standing, ${noRiot} with no Riot ID`);
for (const p of picks) console.log(`  ${String(p.rank).padStart(4)}  ${p.legend.padEnd(34)} ${p.label}`);
for (const s of skipped.sort((a, b) => a.best.st.rank - b.best.st.rank)) console.log(`  skip  ${s.legend.padEnd(34)} ${s.best.riot} — ${ordinal(s.best.st.rank)} · ${s.best.st.won}-${s.best.st.lost}-${s.best.st.drawn} · ${s.pilots} pilots (--skip-legends)`);

if (OUT) {
  writeFileSync(OUT, JSON.stringify({ event: EVENT, name: NAME, finalRound, rankedPlayers, picks }, null, 2));
  console.log(`wrote ${OUT}`);
}
if (!HOST) process.exit(0);

// ---- apply to a running server --------------------------------------------------
const libRes = await fetch(`${HOST}/api/deck-library`);
if (!libRes.ok) { console.error(`GET ${HOST}/api/deck-library -> HTTP ${libRes.status}`); process.exit(1); }
const { decks: existing = [] } = await libRes.json();
// An identical list can legitimately be a best-of at two events (the same
// pilot, the same 40 cards, two placings), so a content match only adopts an
// entry written for THIS event or one with no event in its note (hand-added).
const eventOf = (note) => (String(note || '').match(/Carde\.io event (\d+)/) || [])[1];
const existingByFp = new Map();
for (const d of existing) {
  if (!d.text) continue;   // link entries are re-fetched live; nothing to compare
  const ev = eventOf(d.note);
  if (ev && ev !== String(EVENT)) continue;
  existingByFp.set(fingerprint(d.legend, d.text), d);
}

const toSend = [];
let updates = 0, adds = 0, unchanged = 0;
const matchedIds = new Set();
for (const p of picks) {
  const hit = existingByFp.get(p.fingerprint);
  const entry = { legend: p.legend, label: p.label, text: p.text, note: p.note };
  if (hit) {
    matchedIds.add(hit.id);
    if (hit.label === p.label && (hit.note || '') === p.note) { unchanged++; continue; }
    updates++; toSend.push({ id: hit.id, ...entry });
    console.log(`  update  ${p.legend}: "${hit.label}" -> "${p.label}"`);
  } else {
    adds++; toSend.push(entry);
    console.log(`  add     ${p.legend}: ${p.label}`);
  }
}
const untouched = existing.filter(d => !matchedIds.has(d.id));
console.log(`${HOST}: ${adds} to add, ${updates} to relabel, ${unchanged} already current; ${untouched.length} existing entries not part of this event's best-of (left alone):`);
for (const d of untouched) console.log(`    ${d.legend}  —  ${d.label || d.link}`);

if (DRY) { console.log('(dry run — nothing sent)'); process.exit(0); }
if (!toSend.length) { console.log('nothing to do'); process.exit(0); }
const res = await fetch(`${HOST}/api/deck-library/import`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decks: toSend }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok || !body.ok) { console.error(`import failed: HTTP ${res.status} ${JSON.stringify(body).slice(0, 400)}`); process.exit(1); }
console.log(`imported ${body.added} entries; library now has ${body.total}`);
