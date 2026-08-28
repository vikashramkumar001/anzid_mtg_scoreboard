#!/usr/bin/env node
// End-to-end demo of the chat card viewer. Drives the REAL bridge (resolver,
// cooldown, prompt store, operator yield) with a recording socket and a fake
// Twitch sender, and prints the transcript both sides would actually see.
//
//   node scripts/chat/demo.mjs
//
// Scenes that are not ABOUT the cooldown run with it set to 0 so the demo does
// not idle for 18s between them; the cooldown scene uses the real 18000ms.
process.env.CHAT_BRIDGE_ENABLED = 'true';
process.env.TWITCH_CHANNEL = 'demo';

import { setGameSelection } from '../../config/constants.js';
import { loadCardListData as loadRb } from '../../features/riftbound/cards.js';
await loadRb();
setGameSelection('riftbound');

const { initChatBridge } = await import('../../features/chat-bridge.js');
const { noteOperatorCard, releaseSlot } = await import('../../features/card-slot-owner.js');

const C = { dim:'\x1b[2m', b:'\x1b[1m', g:'\x1b[32m', y:'\x1b[33m', c:'\x1b[36m', m:'\x1b[35m', x:'\x1b[0m' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let onAir = null, botLines = [];
const record = (ev, data) => {
    if (!/card-view-card-selected/.test(ev)) return;
    if (String(data['card-id']) !== '3') return;
    onAir = data.name || null;
};
const io = {
    emit: record,
    to: () => ({ emit: record }),
    sockets: { emit: record },
};
const app = { get() {}, post() {} };

let bridge, uid = 100;
const users = new Map();
const idFor = n => { if (!users.has(n)) users.set(n, String(++uid)); return users.get(n); };

function makeBridge(opts = {}) {
    bridge?.stop?.();
    onAir = null; releaseSlot('3');
    bridge = initChatBridge(app, io, {
        connect: false, cooldownMs: 0, dwellMs: 60000,
        say: async m => { botLines.push(m); },
        ...opts,
    });
    return bridge;
}

async function chat(user, text, opts = {}) {
    botLines = [];
    const before = onAir;
    bridge._test.handle({ platform: 'twitch', userId: idFor(user), displayName: user, text, firstMsg: !!opts.firstMsg });
    await sleep(opts.wait ?? 40);
    console.log(`  ${C.c}${user.padStart(13)}${C.x} ${C.dim}│${C.x} ${text}`);
    for (const l of botLines) console.log(`  ${C.m}${'anzidbot'.padStart(13)}${C.x} ${C.dim}│${C.x} ${C.y}${l}${C.x}`);
    if (onAir !== before) {
        console.log(onAir
            ? `  ${' '.repeat(13)} ${C.dim}└─▶${C.x} ${C.g}ON AIR: ${C.b}${onAir}${C.x}`
            : `  ${' '.repeat(13)} ${C.dim}└─▶${C.x} ${C.dim}viewer cleared${C.x}`);
    } else if (!botLines.length) {
        console.log(`  ${' '.repeat(13)} ${C.dim}└─▶ ignored — nothing changes on screen${C.x}`);
    }
}
const scene = (n, t) => console.log(`\n${C.b}${n}. ${t}${C.x}\n  ${C.dim}${'─'.repeat(70)}${C.x}`);
const note = t => console.log(`  ${C.dim}· ${t}${C.x}`);

console.log(`\n${C.b}Chat card viewer — Riftbound${C.x} ${C.dim}· real bridge, real card data${C.x}`);

// 1 ─────────────────────────────────────────────────────────────────────────
makeBridge();
scene(1, 'A name that identifies exactly one card');
await chat('Sarah_TCG', '!card against the odds');
await chat('mkelly', '[[storm of shuriken]]');
note('the [[brackets]] form works too, and the subtitle alone is enough');

// 2 ─────────────────────────────────────────────────────────────────────────
makeBridge({ promptWindowMs: 1200 });
scene(2, 'A champion with three printings — chat picks');
await chat('Sarah_TCG', '!card irelia');
await chat('Sarah_TCG', '2');

// 3 ─────────────────────────────────────────────────────────────────────────
makeBridge({ promptWindowMs: 1200 });
scene(3, 'Nobody answers — option 1 goes up so the stream never waits');
await chat('quietguy', '!c kennen');
await sleep(1500);
console.log(`  ${' '.repeat(13)} ${C.dim}└─▶${C.x} ${C.g}ON AIR: ${C.b}${onAir}${C.x} ${C.dim}(auto-picked after the window)${C.x}`);

// 4 ─────────────────────────────────────────────────────────────────────────
makeBridge({ promptWindowMs: 1200 });
scene(4, 'Typos — the same request, fumbled on a phone');
await chat('phone_thumbs', '!card irleia');
await chat('phone_thumbs', '3');
makeBridge();
await chat('typo_andy', '!card rekssai');
await chat('typo_andy', '!card againts the odds');

// 5 ─────────────────────────────────────────────────────────────────────────
makeBridge();
scene(5, 'Junk and hostile input — nothing reaches the screen');
for (const t of ['!card <script>alert(1)</script>', '!card asdfgh', '!card pikachu', '!card ;;;;;;', '!card ' + 'a'.repeat(90)])
    await chat('troll_99', t);
note('no reply either — a bot that argues with trolls is a bot they keep poking');

// 6 ─────────────────────────────────────────────────────────────────────────
makeBridge({ cooldownMs: 18000 });
scene(6, 'Cooldown — real 18s, and the bot says it once, not once per viewer');
await chat('first_up', '!card ashe');
for (const u of ['eager1', 'eager2', 'eager3']) await chat(u, '!card teemo');
note('eager2 and eager3 were dropped silently — 30 people in a cooldown must not become 30 bot messages');

// 7 ─────────────────────────────────────────────────────────────────────────
makeBridge();
scene(7, 'The operator is using the viewer — chat yields');
await chat('Sarah_TCG', '!card ashe');
noteOperatorCard({ 'card-selected': 'Jinx, Loose Cannon', 'card-id': '2' });
console.log(`  ${C.dim}${'operator'.padStart(13)} │ puts up Jinx, Loose Cannon on the right-hand viewer${C.x}`);
await chat('Sarah_TCG', '!card viktor');
note('chat is refused while the operator owns the slot — silently, so nobody spams to get through');

// 8 ─────────────────────────────────────────────────────────────────────────
makeBridge();
scene(8, 'Brand-new accounts are ignored (raid protection)');
await chat('throwaway_a', '!card ashe', { firstMsg: true });
note("a first-ever message in the channel never shows a card");

bridge?.stop?.();
console.log('');
process.exit(0);
