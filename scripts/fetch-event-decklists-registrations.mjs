#!/usr/bin/env node
/**
 * Fetch + cache decklists and registrations for one or more Carde events,
 * reusing the server's own exported fetchers (features/tournament-platforms.js).
 *
 * Usage: node scripts/fetch-event-decklists-registrations.mjs 683264 600265
 */
import 'dotenv/config';
import { fetchCardeioDecklist, fetchCardeioRegistrations } from '../features/tournament-platforms.js';

const ids = process.argv.slice(2);
if (!ids.length) { console.error('Pass event IDs as args'); process.exit(1); }

for (const id of ids) {
    try {
        console.log(`\n[${id}] decklists…`);
        await fetchCardeioDecklist(id);
    } catch (e) {
        console.error(`[${id}] decklists FAILED: ${e.response?.status || ''} ${e.message}`);
    }
    try {
        console.log(`[${id}] registrations…`);
        const r = await fetchCardeioRegistrations(id);
        console.log(`[${id}] registrations: ${r.count}`);
    } catch (e) {
        console.error(`[${id}] registrations FAILED: ${e.response?.status || ''} ${e.message}`);
    }
}
console.log('\nDONE');
