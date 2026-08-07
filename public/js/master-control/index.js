import {initOverlayUpload} from './overlays.js';
import {initArchetypes} from './archetypes.js';
import {initRoster} from './roster.js';
import {initMatches} from './matches.js';
import {initBrackets} from './brackets.js';
import {initCardView} from './card-view.js';
import {initMetaBreakdown} from './meta-breakdown.js';
import {initCardDB} from './indexeddb-init.js';
import {initGameSelection} from './game-selection.js';
import {initTournamentPlatform} from './tournament-platform.js';
import {initAuthTokens} from './auth-tokens.js';
import {initDraftList} from './draft-list.js';
import {initGroups} from './groups.js';
import {initPlayerView} from './player-view.js';

const socket = io();

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Room Manager
    window.roomManager = new RoomManager(socket);
    
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
    initRoster(socket);
    initGameSelection(socket);
    initMatches(socket);
    initBrackets(socket);
    initCardView(socket);
    initMetaBreakdown(socket);
    initTournamentPlatform(socket);
    initAuthTokens(socket);
    initDraftList(socket);
    initGroups(socket);
    initPlayerView(socket);
});
