// Which card names in the cached Carde.io decklists does the server not
// recognise?
//
//   node scripts/riftbound/check-cardeio-names.mjs [cacheDir]
//
// Every name in every cached export (data/cardeio/cache/event-*-decklists.json
// by default) is run through findRiftboundCard(), the same lookup the importer,
// card vision and champion-watch use. Whatever comes back null is listed with
// the nearest card-DB name as a HINT for a human — nothing is matched
// automatically. A real rename goes into RIFTBOUND_CARD_NAME_ALIASES in
// config/riftbound/constants.js; a token or a card the DB simply lacks is a
// scraper matter.
//
// Exits 1 when an unresolved name sits within two edits of a DB name (a likely
// alias to review); names further away are reported but do not fail the run.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCardListData, getCardListData, findRiftboundCard } from '../../features/riftbound/cards.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const cacheDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(rootDir, 'data', 'cardeio', 'cache');

const quiet = console.log; console.log = () => {};
await loadCardListData();
console.log = quiet;
const dbNames = Object.keys(getCardListData());
if (!dbNames.length) { console.error('card DB is empty — nothing to check against'); process.exit(2); }

function editDistance(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return prev[b.length];
}

const nearest = (name) => dbNames
    .map(n => ({ n, d: editDistance(name, n) }))
    .sort((x, y) => x.d - y.d)[0];

const files = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter(f => /-decklists\.json$/.test(f)) : [];
if (!files.length) { console.error(`no event-*-decklists.json in ${cacheDir}`); process.exit(2); }

const unresolved = new Map();   // name -> { count, where: Set<section> }
let decks = 0, names = 0;
for (const file of files) {
    const { decklists = [] } = JSON.parse(fs.readFileSync(path.join(cacheDir, file), 'utf8'));
    for (const deck of decklists) {
        decks++;
        const seen = [];
        for (const s of deck.auxiliary_sections || []) for (const c of s.cards || []) seen.push([s.type_code, c.name]);
        for (const s of deck.sections || []) for (const c of s.cards || []) seen.push([s.section_key, c.name]);
        for (const [section, name] of seen) {
            if (!name) continue;
            names++;
            if (findRiftboundCard(name)) continue;
            const u = unresolved.get(name) || { count: 0, where: new Set() };
            u.count++; u.where.add(section);
            unresolved.set(name, u);
        }
    }
}

console.log(`${files.length} event(s), ${decks} decks, ${names} card names — ${unresolved.size} distinct name(s) unresolved`);
let likelyAliases = 0;
for (const [name, u] of [...unresolved].sort((a, b) => b[1].count - a[1].count)) {
    const near = nearest(name);
    const hint = near.d <= 2 ? `nearest "${near.n}" (${near.d} edit${near.d === 1 ? '' : 's'}) — alias candidate` : `nearest "${near.n}" (${near.d} edits) — probably not a rename`;
    if (near.d <= 2) likelyAliases++;
    console.log(`  ×${String(u.count).padEnd(5)} "${name}"  [${[...u.where].join(', ')}]  ${hint}`);
}
console.log(likelyAliases ? `\n${likelyAliases} alias candidate(s) to review in config/riftbound/constants.js RIFTBOUND_CARD_NAME_ALIASES` : '\nNo alias candidates.');
process.exit(likelyAliases ? 1 : 0);
