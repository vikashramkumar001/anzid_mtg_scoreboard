export function initDeckView(socket) {

    // Query all buttons and inputs
    const mainDeckDisplayButtons = document.querySelectorAll('#deck-view-control [id^=vibes-deck-view-display-deck-]');
    const mainDeckTextAreas = document.querySelectorAll('#deck-view-control [id^=vibes-deck-view-main-deck-input-]');

    mainDeckTextAreas.forEach((mainDeckTextArea, index) => {
        mainDeckTextArea.textContent = '';
        const mainDeckDisplayButton = mainDeckDisplayButtons[index];

        mainDeckDisplayButton.addEventListener('click', function () {
            // get value from input
            const deckList = mainDeckTextArea.value
                .split(/\n+/)
                .map(card => card.trim())
                .filter(card => card !== '');

            // send socket emit to server with index (adjusted to 1-based)
            socket.emit('vibes-main-deck-display-clicked', {index: index + 1, deckList});
        });
    });
}
