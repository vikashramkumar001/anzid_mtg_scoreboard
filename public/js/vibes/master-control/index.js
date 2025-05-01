import {initCardView} from './card-view.js';
import {initDeckView} from "./deck-view.js";

const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    initCardView(socket);
    initDeckView(socket)
});
