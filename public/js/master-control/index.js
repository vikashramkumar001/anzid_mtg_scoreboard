import {initOverlayUpload} from './overlays.js';
import {initArchetypes} from './archetypes.js';
import {initMatches} from './matches.js';
import {initBrackets} from './brackets.js';
import {initCardView} from './card-view.js';

const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    initOverlayUpload(socket);
    initArchetypes(socket);
    initMatches(socket);
    initBrackets(socket);
    initCardView(socket);
});
