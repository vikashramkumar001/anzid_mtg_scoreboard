#!/usr/bin/env node
// Resolver probe: node scripts/chat/ask.mjs riftbound "storm of shuriken"
// Prints what the chat bridge would put on air for that query.
import { loadCardListData as loadRb } from '../../features/riftbound/cards.js';
import { loadCardListData as loadMtg } from '../../features/mtg/cards.js';
const game = (process.argv[2] || 'riftbound').toLowerCase();
const query = process.argv.slice(3).join(' ');
if (game === 'mtg') await loadMtg(); else await loadRb();
const { resolveCardName } = await import('../../features/chat/resolve.js');
const r = resolveCardName(game, query);
console.log(JSON.stringify(r === null ? { query, result: null } : {
    query, onAir: r.name, prompts: !!r.ambiguous,
    options: r.ambiguous ? r.alternatives : undefined,
    via: r.typo ? `typo(d=${r.distance})` : r.fuzzy ? 'partial' : 'exact',
    contentWarning: !!r.contentWarning,
}, null, 2));
