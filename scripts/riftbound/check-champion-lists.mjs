// Check the two hand-maintained champion lists against the card DB.
//
//   node scripts/riftbound/check-champion-lists.mjs
//
// The card DB (data/riftbound/riftboundCardNames.json) is the source of truth.
// A champion unit is a Unit whose name before the comma is a legend's character
// name ("Kai'Sa, Survivor" belongs to "Kai'Sa, Daughter of the Void"). The DB
// does not keep Piltover Archive's `super === 'Champion'` flag, so the legend
// list stands in for it.
//
// Spelling must match the DB exactly, capitals included: champion-watch.js and
// card-vision.js look champions up by exact DB key, and cardeioGetChampion()
// does a case-sensitive Set.has() on the Carde.io card name.
//
// Exits 1 on any drift, so it can gate a set ingestion.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RIFTBOUND_LEGENDS, RIFTBOUND_CHAMPIONS_LIST } from '../../public/js/riftbound/constants.js';
import { RIFTBOUND_CHAMPIONS, cardListDataPath } from '../../config/riftbound/constants.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const db = JSON.parse(fs.readFileSync(cardListDataPath, 'utf8'));

const characterOf = name => name.split(',')[0].trim();
const legendCharacters = new Set(Object.keys(RIFTBOUND_LEGENDS).map(characterOf));

const expected = Object.entries(db)
    .filter(([name, card]) => card.type === 'Unit' && name.includes(',') && legendCharacters.has(characterOf(name)))
    .map(([name]) => name)
    .sort();

function diff(label, names) {
    const have = new Set(names);
    const want = new Set(expected);
    const wantByLower = new Map(expected.map(n => [n.toLowerCase(), n]));
    const problems = [];

    for (const n of names) {
        if (want.has(n)) continue;
        const respelled = wantByLower.get(n.toLowerCase());
        problems.push(respelled
            ? `  spelling: "${n}" should be "${respelled}"`
            : `  unknown : "${n}" is not a champion unit in the card DB`);
    }
    for (const n of expected) {
        if (have.has(n)) continue;
        if (names.some(x => x.toLowerCase() === n.toLowerCase())) continue; // already reported as spelling
        problems.push(`  missing : "${n}" (${db[n].publicCode})`);
    }
    for (const n of new Set(names.filter((x, i) => names.indexOf(x) !== i))) {
        problems.push(`  dupe    : "${n}"`);
    }

    console.log(`${problems.length ? '✗' : '✓'} ${label} — ${names.length} listed, ${expected.length} in DB`);
    problems.forEach(p => console.log(p));
    return problems.length;
}

// A legend the DB has but RIFTBOUND_LEGENDS lacks would silently drop that
// character's champions from `expected`. Compared by character, because the DB
// keys the four starter legends as "Annie, Dark Child - Starter".
const legendProblems = [...new Set(Object.entries(db)
    .filter(([, card]) => card.type === 'Legend')
    .map(([name]) => characterOf(name)))]
    .filter(character => !legendCharacters.has(character));
if (legendProblems.length) {
    console.log('✗ Legend characters in the card DB with no RIFTBOUND_LEGENDS entry:');
    legendProblems.forEach(c => console.log(`  "${c}"`));
}

const total = legendProblems.length
    + diff('public/js/riftbound/constants.js RIFTBOUND_CHAMPIONS_LIST', RIFTBOUND_CHAMPIONS_LIST.map(c => c.name))
    + diff('config/riftbound/constants.js RIFTBOUND_CHAMPIONS', [...RIFTBOUND_CHAMPIONS]);

console.log(total ? `\n${total} problem(s). Card DB: ${path.relative(rootDir, cardListDataPath)}` : '\nBoth lists match the card DB.');
process.exit(total ? 1 : 0);
