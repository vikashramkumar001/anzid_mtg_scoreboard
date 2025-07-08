import {initOverlayUpload} from './overlays.js';
import {initArchetypes} from './archetypes.js';
import {initMatches} from './matches.js';
import {initBrackets} from './brackets.js';
import {initMTGCardView} from './mtg-card-view.js';
import {initVibesCardView} from './vibes-card-view.js';
import {initRiftboundCardView} from './riftbound-card-view.js';
import {initMetaBreakdown} from './meta-breakdown.js';
import {initCardDB} from './indexeddb-init.js';
import {initGameSelection} from './game-selection.js';

const socket = io();

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize IndexedDB first
    try {
        // Initialize MTG DB
        const mtgRes = await fetch("/data/cardNames.json");
        const mtgData = await mtgRes.json();
        await initCardDB("mtg", mtgData);

        // Initialize Riftbound DB
        const riftRes = await fetch("/data/riftbound/riftboundCardNames.json");
        const riftData = await riftRes.json();
        await initCardDB("riftbound", riftData);

    } catch (err) {
        console.error("Failed to initialize IndexedDB:", err);
    }
    // Then init modules
    initOverlayUpload(socket);
    initArchetypes(socket);
    initGameSelection(socket);
    initMatches(socket);
    initBrackets(socket);
    initMTGCardView(socket);
    initVibesCardView(socket);
    initRiftboundCardView(socket);
    initMetaBreakdown(socket);
});
