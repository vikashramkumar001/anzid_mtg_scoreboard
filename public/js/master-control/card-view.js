import {getAllCardsByGenre} from './indexeddb-init.js';

export function initCardView(socket) {

    const viewButton1 = document.getElementById('card-view-display-button-1');
    const viewButton2 = document.getElementById('card-view-display-button-2');
    const resetButton1 = document.getElementById('card-view-reset-button-1');
    const resetButton2 = document.getElementById('card-view-reset-button-2');
    const gameLabel = document.getElementById('card-view-game-label');

    let currentGame = 'mtg';
    let cardNames = [];      // flat list of display names for autocomplete
    let cardLookup = {};     // displayName -> { url, name, set? }

    // Game display names
    const GAME_LABELS = {
        mtg: 'MTG',
        vibes: 'Vibes',
        riftbound: 'Riftbound',
        starwars: 'Star Wars'
    };

    // ─── Card data loading per game ───

    async function loadMTGCards() {
        const cards = await getAllCardsByGenre('mtg');
        // Build a case-insensitive lookup map once (O(n) instead of O(n²))
        const lowerMap = {};
        for (const k of Object.keys(cards)) {
            lowerMap[k.toLowerCase()] = k;
        }
        cardNames = Object.keys(cards);
        cardLookup = {};
        for (const name of cardNames) {
            const singleFace = name.includes('//')
                ? name.split('//')[0].trim()
                : name.trim();
            const cleanedName = singleFace.replace(/^"+|"+$/g, '').replace(/&/g, 'and');
            const matchedKey = lowerMap[cleanedName.toLowerCase()];
            cardLookup[name] = { url: matchedKey ? cards[matchedKey]?.imageUrl : '', name };
        }
    }

    function loadVibesCards(cardListDataFromServer) {
        cardLookup = {};
        cardNames = Object.keys(cardListDataFromServer || {});
        for (const name of cardNames) {
            cardLookup[name] = { url: cardListDataFromServer[name], name };
        }
    }

    function loadRiftboundCards(cardListDataFromServer) {
        cardLookup = {};
        cardNames = Object.keys(cardListDataFromServer || {});
        for (const name of cardNames) {
            cardLookup[name] = { url: cardListDataFromServer[name]?.imageUrl || '', name };
        }
    }

    function loadStarWarsCards(cardListDataFromServer) {
        cardLookup = {};
        for (const set of Object.keys(cardListDataFromServer || {})) {
            const setMap = cardListDataFromServer[set] || {};
            for (const key of Object.keys(setMap)) {
                const entry = setMap[key];
                const baseRaw = (entry.image || key).split(/\\|\//).pop();
                const base = baseRaw.split('?')[0].split('#')[0];
                const filename = /\.[a-z0-9]+$/i.test(base) ? base : base + '.png';
                const url = `/assets/images/starwars/cards/${set}/${filename}`;
                const display = `${set}:${entry.name}`;
                cardLookup[display] = { set, name: entry.name, url };
            }
        }
        cardNames = Object.keys(cardLookup);
    }

    // ─── Socket listeners for card data ───

    socket.on('vibes-card-list-data', ({cardListData: data}) => {
        if (currentGame === 'vibes') {
            loadVibesCards(data);
        }
    });

    socket.on('riftbound-card-list-data', ({cardListData: data}) => {
        if (currentGame === 'riftbound') {
            loadRiftboundCards(data);
        }
    });

    socket.on('starwars-card-list-data', ({cardListData: data}) => {
        if (currentGame === 'starwars') {
            loadStarWarsCards(data);
        }
    });

    // ─── Game switching ───

    async function switchGame(game) {
        if (currentGame === game && cardNames.length > 0) return;
        currentGame = game;
        gameLabel.textContent = `${GAME_LABELS[game] || game} Card View`;

        // Clear inputs and previews
        clearAll();

        // Load card data for the new game
        cardNames = [];
        cardLookup = {};

        if (game === 'mtg') {
            await loadMTGCards();
        } else if (game === 'vibes') {
            socket.emit('vibes-get-card-list-data');
        } else if (game === 'riftbound') {
            socket.emit('riftbound-get-card-list-data');
        } else if (game === 'starwars') {
            socket.emit('starwars-get-card-list-data');
        }
    }

    socket.on('server-current-game-selection', ({gameSelection}) => {
        switchGame(gameSelection);
    });

    socket.on('game-selection-updated', ({gameSelection}) => {
        switchGame(gameSelection);
    });

    // ─── Autocomplete dropdown (set up once, not rebuilt) ───

    function renderDropdownList(dropdownList, items, field) {
        dropdownList.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.textContent = item;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = item;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = items.length > 0 ? 'block' : 'none';
    }

    // Store dropdown list elements for each slot
    const dropdownLists = {};

    function setupDropdowns() {
        const fields = document.querySelectorAll('#unified-card-view [id^="card-view-input-autocomplete-"]');

        fields.forEach(field => {
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown';
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);

            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list';
            wrapper.appendChild(dropdownList);

            const slotId = field.id === 'card-view-input-autocomplete-1' ? 1 : 2;
            dropdownLists[slotId] = dropdownList;

            function filterAndRender() {
                const minChars = currentGame === 'mtg' ? 2 : 1;
                const maxResults = currentGame === 'starwars' ? 10 : 5;
                const value = field.textContent.trim().toLowerCase();
                if (value.length >= minChars) {
                    const filtered = cardNames
                        .filter(name => name.toLowerCase().includes(value))
                        .slice(0, maxResults);
                    renderDropdownList(dropdownList, filtered, field);

                    const exact = cardNames.find(name => name.toLowerCase() === value);
                    renderPreview(slotId, exact || '');
                } else {
                    dropdownList.style.display = 'none';
                    renderPreview(slotId, '');
                }
            }

            field.addEventListener('input', filterAndRender);
            field.addEventListener('focus', filterAndRender);

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    // ─── Preview rendering ───

    function renderPreview(slotId, displayName) {
        const previewEl = document.getElementById(`card-preview-${slotId}`);
        if (!displayName) {
            previewEl.innerHTML = '';
            return;
        }

        const entry = cardLookup[displayName];
        if (!entry || !entry.url) {
            previewEl.innerHTML = '';
            return;
        }

        let extraInfo = '';
        if (entry.set) {
            extraInfo = `<div>${entry.set}</div>`;
        }

        previewEl.innerHTML = `
            <div class="card mt-2">
                <img src="${entry.url}" alt="${entry.name}" class="card-img-top" style="max-height:300px; object-fit:contain;">
                <div class="card-body text-center">
                    <strong>${entry.name}</strong>
                    ${extraInfo}
                </div>
            </div>
        `;
    }

    // ─── Button handlers ───

    function emitViewCard(slotId) {
        const field = document.getElementById(`card-view-input-autocomplete-${slotId}`);
        const data2send = {
            'card-selected': field.innerText,
            'card-id': slotId,
            'game-id': currentGame
        };
        socket.emit('view-selected-card', {cardSelected: data2send});
    }

    // Game-specific card back images
    const CARD_BACKS = {
        mtg: '/assets/images/mtg/cards/magic-card-back.jpg',
        vibes: '/assets/images/vibes/cards/vibes-card-back.png',
        riftbound: '/assets/images/riftbound/cards/riftbound-card-back.jpg',
        starwars: '/assets/images/starwars/cards/starwars-card-back.png'
    };

    function emitReset(slotId) {
        const data2send = {
            'card-selected': '',
            'card-id': slotId,
            'game-id': currentGame
        };
        socket.emit('view-selected-card', {cardSelected: data2send});
        document.getElementById(`card-view-input-autocomplete-${slotId}`).innerText = '';
        // Show game-specific card back in preview
        const cardBackUrl = CARD_BACKS[currentGame] || CARD_BACKS.mtg;
        document.getElementById(`card-preview-${slotId}`).innerHTML = `
            <div class="card mt-2">
                <img src="${cardBackUrl}" alt="Card Back" class="card-img-top" style="max-height:300px; object-fit:contain;">
            </div>
        `;
    }

    function clearAll() {
        for (const slotId of [1, 2]) {
            document.getElementById(`card-preview-${slotId}`).innerHTML = '';
            document.getElementById(`card-view-input-autocomplete-${slotId}`).innerText = '';
        }
    }

    viewButton1.addEventListener('click', () => emitViewCard(1));
    viewButton2.addEventListener('click', () => emitViewCard(2));
    resetButton1.addEventListener('click', () => emitReset(1));
    resetButton2.addEventListener('click', () => emitReset(2));

    // ─── Init: set up dropdowns once, then request game selection ───
    setupDropdowns();
    socket.emit('get-game-selection');
}
