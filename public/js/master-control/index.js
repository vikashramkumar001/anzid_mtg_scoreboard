import {initOverlayUpload} from './overlays.js';
import {initArchetypes} from './archetypes.js';
import {initMatches} from './matches.js';
import {initBrackets} from './brackets.js';
import {initMTGCardView} from "./mtg-card-view.js";
import {initVibesCardView} from "./vibes-card-view.js";

const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    initOverlayUpload(socket);
    initArchetypes(socket);
    initMatches(socket);
    initBrackets(socket);
    initMTGCardView(socket);
    initVibesCardView(socket);
});
