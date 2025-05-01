export function initDeckView(socket) {

    const mainDeckDisplayButton = document.querySelector('#deck-view-control #vibes-deck-view-display-deck');
    const mainDeckTextArea = document.querySelector('#deck-view-control #vibes-deck-view-main-deck-input');

    mainDeckTextArea.textContent = '';

    function attachDeckViewDisplayButtonListener() {
        mainDeckDisplayButton.addEventListener('click', function () {
            // get value from input
            const deckList = mainDeckTextArea.value
                .split(/\n+/)
                .map(card => card.trim())
                .filter(card => card !== '');
            // send socket emit to server
            socket.emit('vibes-main-deck-display-clicked', deckList)
        })
    }

    attachDeckViewDisplayButtonListener();

}