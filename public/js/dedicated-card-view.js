const socket = io();
let cardName = null;

// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const game_id = pathSegments[4];
const card_id = pathSegments[5];
const fallbackUrl = `/assets/images/cards/${game_id}/${game_id === 'mtg' ? 'magic' : 'vibes'}-card-back.jpg`;

// Listen for card view to display
socket.on('card-view-card-selected', (data) => {
    // data : mainDeck, sideDeck, playerName, archetype
    console.log('card to view from server', data);

    // check that data was meant for this card id and game id
    if (card_id === data['card-id'].toString() && game_id === data['game-id'].toString()) {
        cardName = data['name'];
        console.log('card to display data', cardName);
        // Call a function to render the card
        renderCard(data);
    }
});

// Function to render the card on the page
function renderCard(data) {
    const container = document.getElementById('card-view-container');
    const oldImg = container.querySelector('img'); // Get existing image (if any)

    const newImg = new Image();
    newImg.className = 'card-src fade-image';
    newImg.style.opacity = '0';
    newImg.onload = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'main-card-display';
        wrapper.appendChild(newImg);

        if (oldImg) {
            // Place both old and new images in the container
            const overlay = document.createElement('div');
            overlay.className = 'image-overlay';
            overlay.appendChild(oldImg);
            overlay.appendChild(newImg);

            container.innerHTML = '';
            wrapper.appendChild(overlay);
            container.appendChild(wrapper);

            // Start crossfade
            requestAnimationFrame(() => {
                oldImg.style.opacity = '0';
                newImg.style.opacity = '1';
            });

            // Remove old image after fade
            setTimeout(() => {
                if (overlay.contains(oldImg)) {
                    overlay.removeChild(oldImg);
                }
            }, 300); // match CSS transition time
        } else {
            container.innerHTML = '';
            container.appendChild(wrapper);

            requestAnimationFrame(() => {
                newImg.style.opacity = '1';
            });
        }
    };

    newImg.onerror = () => {
        console.warn('Image failed to load:', data.url);
        newImg.src = fallbackUrl;
    };

    newImg.src = data.url || fallbackUrl;
}

// on start - render fallback image
renderCard({url: ''});
