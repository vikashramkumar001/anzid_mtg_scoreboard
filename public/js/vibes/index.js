import {initCardView} from './card-view.js';

const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    initCardView(socket);
});
