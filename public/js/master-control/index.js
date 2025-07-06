import {initOverlayUpload} from './overlays.js';
import {initArchetypes} from './archetypes.js';
import {initMatches} from './matches.js';
import {initBrackets} from './brackets.js';
import {initMTGCardView} from './mtg-card-view.js';
import {initVibesCardView} from './vibes-card-view.js';
import {initRiftboundCardView} from './riftbound-card-view.js';
import {initMetaBreakdown} from './meta-breakdown.js';
import {initCardDB} from './indexeddb-init.js';

const socket = io();

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize IndexedDB first
    try {
        const res = await fetch("/data/cardNames.json");
        const data = await res.json();
        await initCardDB("mtg", data);
    } catch (err) {
        console.error("Failed to initialize IndexedDB:", err);
    }
    // Then init modules
    initOverlayUpload(socket);
    initArchetypes(socket);
    initMatches(socket);
    initBrackets(socket);
    initMTGCardView(socket);
    initVibesCardView(socket);
    initRiftboundCardView(socket);
    initMetaBreakdown(socket);
});
