#!/usr/bin/env node
/**
 * One-time migration: rename legacy unscoped cache files
 *   data/cardeio/pairings-api-round-{N}.json
 *   data/cardeio/standings-api-round-{N}.json
 * to the new event-scoped naming
 *   data/cardeio/pairings-api-event-{eventId}-round-{N}.json
 *   data/cardeio/standings-api-event-{eventId}-round-{N}.json
 *
 * Inspects each file's player user IDs and compares against every cached
 * decklist payload under data/cardeio/cache/event-*-decklists.json.
 * Whichever event has the highest overlap (above a 50% threshold) is the
 * file's owning event — rename to the scoped form. Files that don't match
 * any event with confidence are left in place (the new loader simply
 * ignores them, so they're harmless).
 *
 * Run once after pulling the event-scoped-cache change. Idempotent.
 *
 * Usage:
 *   node scripts/migrate-cache-to-event-scoped.mjs              # dry-run
 *   node scripts/migrate-cache-to-event-scoped.mjs --apply      # actually rename
 */
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARDEIO_DIR = path.join(__dirname, '..', 'data', 'cardeio');
const CACHE_DIR = path.join(CARDEIO_DIR, 'cache');
const APPLY = process.argv.includes('--apply');
const MATCH_THRESHOLD = 0.5;  // 50% of file's players must be in event

// Build Map<eventId, Set<userIdNumber>> from every cached decklist payload.
async function loadEventUserIds() {
    const byEvent = new Map();
    let entries;
    try {
        entries = await fs.readdir(CACHE_DIR);
    } catch (e) {
        console.error(`No cache dir at ${CACHE_DIR}`);
        return byEvent;
    }
    for (const fname of entries) {
        const m = fname.match(/^event-(\d+)-decklists\.json$/);
        if (!m) continue;
        const eventId = m[1];
        try {
            const raw = await fs.readFile(path.join(CACHE_DIR, fname), 'utf8');
            const data = JSON.parse(raw);
            const decklists = Array.isArray(data) ? data : (data?.decklists || []);
            const set = new Set();
            for (const dl of decklists) {
                const uid = dl?.user?.id;
                if (uid != null) set.add(Number(uid));
            }
            byEvent.set(eventId, set);
            console.log(`[Decklists] event ${eventId}: ${set.size} unique players`);
        } catch (e) {
            console.error(`[Decklists] Failed ${fname}: ${e.message}`);
        }
    }
    return byEvent;
}

// Extract player user IDs from a pairings file.
function userIdsFromPairings(matches) {
    const set = new Set();
    if (!Array.isArray(matches)) return set;
    for (const m of matches) {
        const rels = m.player_match_relationships || [];
        for (const rel of rels) {
            const uid = rel?.user_event_status?.user?.id ?? rel?.player?.id;
            if (uid != null) set.add(Number(uid));
        }
    }
    return set;
}

// Extract player user IDs from a standings file.
function userIdsFromStandings(rows) {
    const set = new Set();
    if (!Array.isArray(rows)) return set;
    for (const row of rows) {
        const uid = row?.user_event_status?.user?.id ?? row?.player?.id;
        if (uid != null) set.add(Number(uid));
    }
    return set;
}

// Pick the event whose decklist user IDs overlap most heavily with the
// file's player IDs. Returns { eventId, overlap, total } or null if no
// event reaches MATCH_THRESHOLD.
function pickOwningEvent(fileUserIds, byEvent) {
    if (fileUserIds.size === 0) return null;
    let best = null;
    for (const [eventId, eventSet] of byEvent.entries()) {
        let overlap = 0;
        for (const uid of fileUserIds) {
            if (eventSet.has(uid)) overlap++;
        }
        const pct = overlap / fileUserIds.size;
        if (!best || pct > best.pct) {
            best = { eventId, overlap, total: fileUserIds.size, pct };
        }
    }
    if (!best || best.pct < MATCH_THRESHOLD) return null;
    return best;
}

async function main() {
    console.log(APPLY ? '[Migration] APPLY MODE — files will be renamed' : '[Migration] DRY RUN — pass --apply to actually rename');
    const byEvent = await loadEventUserIds();
    if (byEvent.size === 0) {
        console.error('No event decklist caches found — cannot determine ownership. Exiting.');
        process.exit(1);
    }

    let entries;
    try {
        entries = await fs.readdir(CARDEIO_DIR);
    } catch (e) {
        console.error(`Cannot read ${CARDEIO_DIR}: ${e.message}`);
        process.exit(1);
    }

    const legacyPairings = entries
        .map(f => ({ f, m: f.match(/^pairings-api-round-(\d+)\.json$/) }))
        .filter(x => x.m);
    const legacyStandings = entries
        .map(f => ({ f, m: f.match(/^standings-api-round-(\d+)\.json$/) }))
        .filter(x => x.m);

    const plan = [];
    const skipped = [];

    for (const { f, m } of legacyPairings) {
        const roundNumber = m[1];
        try {
            const raw = await fs.readFile(path.join(CARDEIO_DIR, f), 'utf8');
            const matches = JSON.parse(raw);
            const ids = userIdsFromPairings(matches);
            const pick = pickOwningEvent(ids, byEvent);
            if (!pick) {
                skipped.push({ f, reason: `no event matched above ${(MATCH_THRESHOLD * 100).toFixed(0)}% (file has ${ids.size} players)` });
                continue;
            }
            const newName = `pairings-api-event-${pick.eventId}-round-${roundNumber}.json`;
            plan.push({ from: f, to: newName, pick });
        } catch (e) {
            skipped.push({ f, reason: e.message });
        }
    }

    for (const { f, m } of legacyStandings) {
        const roundNumber = m[1];
        try {
            const raw = await fs.readFile(path.join(CARDEIO_DIR, f), 'utf8');
            const rows = JSON.parse(raw);
            const ids = userIdsFromStandings(rows);
            const pick = pickOwningEvent(ids, byEvent);
            if (!pick) {
                skipped.push({ f, reason: `no event matched above ${(MATCH_THRESHOLD * 100).toFixed(0)}% (file has ${ids.size} players)` });
                continue;
            }
            const newName = `standings-api-event-${pick.eventId}-round-${roundNumber}.json`;
            plan.push({ from: f, to: newName, pick });
        } catch (e) {
            skipped.push({ f, reason: e.message });
        }
    }

    console.log(`\n[Migration] Plan: ${plan.length} rename(s), ${skipped.length} skip(s)`);
    for (const p of plan) {
        console.log(`  ${p.from}  →  ${p.to}   (event ${p.pick.eventId}, ${(p.pick.pct * 100).toFixed(1)}% overlap, ${p.pick.overlap}/${p.pick.total} players)`);
    }
    if (skipped.length > 0) {
        console.log('\n[Migration] Skipped:');
        for (const s of skipped) console.log(`  ${s.f} — ${s.reason}`);
    }

    if (!APPLY) {
        console.log('\nDRY RUN — no files renamed. Re-run with --apply to commit.');
        return;
    }

    let renamed = 0;
    let failed = 0;
    for (const p of plan) {
        const fromPath = path.join(CARDEIO_DIR, p.from);
        const toPath = path.join(CARDEIO_DIR, p.to);
        try {
            // Don't overwrite an existing event-scoped file if both
            // exist (the newer one wins; keep the legacy under .bak).
            try {
                await fs.access(toPath);
                const bakPath = `${fromPath}.bak`;
                await fs.rename(fromPath, bakPath);
                console.log(`  ${p.from} → .bak (target ${p.to} already exists)`);
            } catch {
                await fs.rename(fromPath, toPath);
                console.log(`  ${p.from} → ${p.to}`);
                renamed++;
            }
        } catch (e) {
            console.error(`  FAILED ${p.from} → ${p.to}: ${e.message}`);
            failed++;
        }
    }
    console.log(`\n[Migration] Done — ${renamed} renamed, ${failed} failed.`);
}

main().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
