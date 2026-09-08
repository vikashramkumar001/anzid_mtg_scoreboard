// A pre-built library of Piltover Archive deck links, keyed by legend.
//
// The problem it solves: the operator runs the show from an iPad, but "Add
// Decklist" only exists on master-control, so pulling a deck in mid-show meant
// walking back to the laptop to paste a link. Saving the links ahead of time
// turns that into picking the legend's deck from a dropdown on the iPad.
//
// Links only — deliberately NOT the resolved decklist. Players edit their decks
// on Piltover right up to the event, and a cached copy would quietly serve a
// stale list. Every load re-fetches, so what goes on air is whatever the deck
// says right now.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractDeckId } from './piltover.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '../../data/deckLibrary.json');

let library = { decks: [] };

function load() {
    try {
        if (fs.existsSync(FILE)) {
            const parsed = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
            library = { decks: Array.isArray(parsed?.decks) ? parsed.decks : [] };
        }
    } catch (e) {
        // A corrupt file must not stop the server booting mid-show — start
        // empty and say so loudly.
        console.error('[deck-library] could not read', FILE, '-', e.message);
        library = { decks: [] };
    }
    return library;
}

function persist() {
    try {
        fs.writeFileSync(FILE, JSON.stringify(library, null, 2));
        return true;
    } catch (e) {
        console.error('[deck-library] save failed:', e.message);
        return false;
    }
}

load();

export function getDeckLibrary() {
    return library;
}

// Entries for one legend, most recently used first so the deck you keep
// reaching for stays at the top of the dropdown.
export function decksForLegend(legend) {
    const want = String(legend || '').trim().toLowerCase();
    if (!want) return [];
    return library.decks
        .filter((d) => String(d.legend || '').trim().toLowerCase() === want)
        .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
}

// Add or update. Returns { ok, error?, entry? }.
export function saveDeckEntry({ id, legend, label, link }) {
    const cleanLink = String(link || '').trim();
    if (!extractDeckId(cleanLink)) {
        return { ok: false, error: 'That does not look like a Piltover Archive deck link' };
    }
    const cleanLegend = String(legend || '').trim();
    if (!cleanLegend) return { ok: false, error: 'Pick a legend for this deck' };

    const entry = {
        id: id || `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        legend: cleanLegend,
        label: String(label || '').trim() || cleanLegend,
        link: cleanLink,
        addedAt: Date.now(),
        lastUsedAt: 0,
    };

    const i = library.decks.findIndex((d) => d.id === entry.id);
    if (i >= 0) {
        // Preserve the fields an edit should not reset.
        entry.addedAt = library.decks[i].addedAt || entry.addedAt;
        entry.lastUsedAt = library.decks[i].lastUsedAt || 0;
        library.decks[i] = entry;
    } else {
        library.decks.push(entry);
    }
    persist();
    return { ok: true, entry };
}

export function deleteDeckEntry(id) {
    const before = library.decks.length;
    library.decks = library.decks.filter((d) => d.id !== id);
    if (library.decks.length === before) return { ok: false, error: 'No such deck' };
    persist();
    return { ok: true };
}

// Called when a deck is actually loaded onto a board, so the dropdown can put
// the decks you use most at the top.
export function noteDeckUsed(id) {
    const d = library.decks.find((x) => x.id === id);
    if (!d) return;
    d.lastUsedAt = Date.now();
    persist();
}
