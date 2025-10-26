import {initCardView} from './card-view.js';
import {initDeckView} from "./deck-view.js";

const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);

document.addEventListener('DOMContentLoaded', () => {
    initCardView(socket);
    initDeckView(socket)
});
