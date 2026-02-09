import { getAllCardsByGenre } from './indexeddb-init.js';

export function initDraftList(socket) {
    // Shared card data
    let cards = {};
    let cardNames = [];

    // Initialize card data from IndexedDB
    async function loadCards() {
        try {
            cards = await getAllCardsByGenre('mtg');
            cardNames = Object.keys(cards);
            console.log(`[DraftList] Loaded ${cardNames.length} cards`);
        } catch (error) {
            console.error('[DraftList] Failed to load cards:', error);
        }
    }

    // Initialize a draft list hub for a given slot
    function initSlot(slotId) {
        // DOM elements for this slot
        const cardSearchInput = document.getElementById(`draft-list-${slotId}-card-search`);
        const dropdownList = document.getElementById(`draft-list-${slotId}-dropdown`);
        const addCardButton = document.getElementById(`draft-list-${slotId}-add-card`);
        const nextPackButton = document.getElementById(`draft-list-${slotId}-next-pack`);
        const clearButton = document.getElementById(`draft-list-${slotId}-clear`);
        const updateButton = document.getElementById(`draft-list-${slotId}-update`);
        const viewCardButton = document.getElementById(`draft-list-${slotId}-view-card`);
        const resetCardButton = document.getElementById(`draft-list-${slotId}-reset-card`);
        const draftListItems = document.getElementById(`draft-list-${slotId}-items`);
        const cardPreview = document.getElementById(`draft-list-${slotId}-card-preview`);
        const noPreview = document.getElementById(`draft-list-${slotId}-no-preview`);
        const playerNameInput = document.getElementById(`draft-list-${slotId}-player-name`);
        const playerPronounsInput = document.getElementById(`draft-list-${slotId}-player-pronouns`);
        const playerArchetypeInput = document.getElementById(`draft-list-${slotId}-player-archetype`);
        const playerManaSymbolsInput = document.getElementById(`draft-list-${slotId}-player-mana-symbols`);

        // State for this slot
        let currentPack = 1;
        let draftList = [{ 'card-name': 'Pack 1' }];
        let selectedCard = null;

        // Render dropdown list
        function renderDropdown(filteredCards) {
            dropdownList.innerHTML = '';
            filteredCards.forEach(cardName => {
                const div = document.createElement('div');
                div.textContent = cardName;
                div.classList.add('dropdown-item');
                div.addEventListener('click', () => {
                    cardSearchInput.value = cardName;
                    selectedCard = cardName;
                    dropdownList.style.display = 'none';
                    showCardPreview(cardName);
                });
                dropdownList.appendChild(div);
            });
            dropdownList.style.display = filteredCards.length > 0 ? 'block' : 'none';
        }

        // Show card preview
        function showCardPreview(cardName) {
            if (cardName && cards[cardName]) {
                const url = cards[cardName].imageUrl || cards[cardName];
                cardPreview.src = url;
                cardPreview.style.display = 'block';
                noPreview.style.display = 'none';
            } else {
                cardPreview.style.display = 'none';
                noPreview.style.display = 'block';
            }
        }

        // Render draft list UI
        function renderDraftList() {
            draftListItems.innerHTML = '';
            let pickNumber = 0;

            draftList.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';

                const cardName = item['card-name'];
                const isPackHeader = cardName.toLowerCase().startsWith('pack ');

                if (isPackHeader) {
                    pickNumber = 0;
                    li.innerHTML = `<strong>${cardName}</strong>`;
                    li.style.backgroundColor = '#f8f9fa';
                } else {
                    pickNumber++;
                    const isHighlighted = item.highlighted;
                    if (isHighlighted) {
                        li.style.backgroundColor = '#fff3cd';
                        li.style.fontWeight = 'bold';
                    }
                    li.innerHTML = `
                        <span>${isHighlighted ? '<strong style="color: #d63384;">' + pickNumber + '.</strong>' : pickNumber + '.'} ${cardName}</span>
                        <div>
                            <button class="btn btn-sm ${isHighlighted ? 'btn-warning' : 'btn-outline-warning'} draft-list-highlight" data-index="${index}" title="Highlight">&#9733;</button>
                            <button class="btn btn-sm btn-outline-primary draft-list-insert" data-index="${index}" title="Insert above">+</button>
                            <button class="btn btn-sm btn-outline-danger draft-list-remove" data-index="${index}">&times;</button>
                        </div>
                    `;
                }

                draftListItems.appendChild(li);
            });

            // Add click handlers for remove buttons
            draftListItems.querySelectorAll('.draft-list-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    removeCard(index);
                });
            });

            // Add click handlers for insert buttons
            draftListItems.querySelectorAll('.draft-list-insert').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    insertCard(index);
                });
            });

            // Add click handlers for highlight buttons
            draftListItems.querySelectorAll('.draft-list-highlight').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    toggleHighlight(index);
                });
            });
        }

        // Add card to draft list
        function addCard() {
            const cardName = cardSearchInput.value.trim();
            if (!cardName) return;

            const matchedKey = cardNames.find(name => name.toLowerCase() === cardName.toLowerCase());
            const cardData = matchedKey ? cards[matchedKey] : null;
            if (!cardData) {
                console.warn('[DraftList] Card not found:', cardName);
                return;
            }

            const cardEntry = {
                'card-name': matchedKey,
                'card-url': cardData.imageUrl || cardData,
                'mana-cost': cardData.manaCost || ''
            };

            draftList.push(cardEntry);

            // Auto-add next pack after 14 cards in current pack
            const cardsInCurrentPack = getCardsInCurrentPack();
            console.log(`[DraftList] Cards in current pack: ${cardsInCurrentPack}, currentPack: ${currentPack}, draftList:`, draftList.map(c => c['card-name']));
            if (cardsInCurrentPack >= 14 && currentPack < 3) {
                currentPack++;
                draftList.push({ 'card-name': `Pack ${currentPack}` });
                if (currentPack >= 3) {
                    nextPackButton.disabled = true;
                }
            }

            renderDraftList();
            broadcastUpdate();

            cardSearchInput.value = '';
            selectedCard = null;
            showCardPreview(null);
        }

        // Insert card before a given index
        function insertCard(beforeIndex) {
            const cardName = cardSearchInput.value.trim();
            if (!cardName) return;

            const matchedKey = cardNames.find(name => name.toLowerCase() === cardName.toLowerCase());
            const cardData = matchedKey ? cards[matchedKey] : null;
            if (!cardData) {
                console.warn('[DraftList] Card not found:', cardName);
                return;
            }

            const cardEntry = {
                'card-name': matchedKey,
                'card-url': cardData.imageUrl || cardData,
                'mana-cost': cardData.manaCost || ''
            };

            draftList.splice(beforeIndex, 0, cardEntry);
            rebuildPackStructure();
            renderDraftList();
            broadcastUpdate();

            cardSearchInput.value = '';
            selectedCard = null;
            showCardPreview(null);
        }

        // Toggle highlight on a card
        function toggleHighlight(index) {
            const item = draftList[index];
            if (item && !item['card-name'].toLowerCase().startsWith('pack ')) {
                item.highlighted = !item.highlighted;
                renderDraftList();
                broadcastUpdate();
            }
        }

        // Count cards after the last pack header
        function getCardsInCurrentPack() {
            let count = 0;
            for (let i = draftList.length - 1; i >= 0; i--) {
                if (draftList[i]['card-name'].toLowerCase().startsWith('pack ')) break;
                count++;
            }
            return count;
        }

        // Remove card from draft list
        function removeCard(index) {
            const item = draftList[index];
            if (item && item['card-name'].toLowerCase().startsWith('pack ')) {
                return;
            }

            draftList.splice(index, 1);
            rebuildPackStructure();
            renderDraftList();
            broadcastUpdate();
        }

        // Rebuild pack headers based on 14 cards per pack
        function rebuildPackStructure() {
            const allCards = draftList.filter(item => !item['card-name'].toLowerCase().startsWith('pack '));
            draftList = [{ 'card-name': 'Pack 1' }];
            let packNum = 1;

            allCards.forEach((card, i) => {
                draftList.push(card);
                if ((i + 1) % 14 === 0 && i + 1 < allCards.length && packNum < 3) {
                    packNum++;
                    draftList.push({ 'card-name': `Pack ${packNum}` });
                }
            });

            currentPack = packNum;
            nextPackButton.disabled = (currentPack >= 3);
        }

        // Add next pack
        function addNextPack() {
            if (currentPack >= 3) {
                console.log('[DraftList] Already at Pack 3');
                return;
            }

            currentPack++;
            draftList.push({ 'card-name': `Pack ${currentPack}` });
            renderDraftList();
            broadcastUpdate();

            if (currentPack >= 3) {
                nextPackButton.disabled = true;
            }
        }

        // Clear draft list
        function clearDraftList() {
            currentPack = 1;
            draftList = [{ 'card-name': 'Pack 1' }];
            nextPackButton.disabled = false;
            renderDraftList();
            broadcastUpdate();
        }

        // Broadcast update to server
        function broadcastUpdate() {
            const playerName = playerNameInput.value.trim();
            const playerPronouns = playerPronounsInput.value.trim();
            const playerArchetype = playerArchetypeInput.value.trim();
            const playerManaSymbols = playerManaSymbolsInput.value.trim();

            console.log(`[DraftList ${slotId}] Broadcasting update:`, playerName, draftList.length, 'cards');

            socket.emit('update-draft-list', {
                slotId,
                playerName,
                playerPronouns,
                playerArchetype,
                playerManaSymbols,
                draftList
            });
        }

        // Event listeners
        cardSearchInput.addEventListener('input', () => {
            const value = cardSearchInput.value.trim().toLowerCase();

            if (value.length >= 2) {
                const filtered = cardNames
                    .filter(name => name.toLowerCase().includes(value))
                    .slice(0, 10);
                renderDropdown(filtered);

                const exact = cardNames.find(name => name.toLowerCase() === value);
                if (exact) {
                    selectedCard = exact;
                    showCardPreview(exact);
                }
            } else {
                dropdownList.style.display = 'none';
            }
        });

        cardSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCard();
            }
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const container = document.getElementById(`draft-list-${slotId}-card-search-container`);
            if (container && !container.contains(e.target)) {
                dropdownList.style.display = 'none';
            }
        });

        addCardButton.addEventListener('click', addCard);
        nextPackButton.addEventListener('click', addNextPack);
        clearButton.addEventListener('click', clearDraftList);
        updateButton.addEventListener('click', broadcastUpdate);

        viewCardButton.addEventListener('click', () => {
            const cardName = selectedCard || cardSearchInput.value.trim();
            if (!cardName) return;
            socket.emit('view-selected-card', {
                cardSelected: {
                    'card-selected': cardName,
                    'card-id': parseInt(slotId),
                    'game-id': 'mtg'
                }
            });
        });

        resetCardButton.addEventListener('click', () => {
            socket.emit('view-selected-card', {
                cardSelected: {
                    'card-selected': '',
                    'card-id': parseInt(slotId),
                    'game-id': 'mtg'
                }
            });
        });

        // Broadcast when player info changes
        playerNameInput.addEventListener('input', broadcastUpdate);
        playerPronounsInput.addEventListener('input', broadcastUpdate);
        playerArchetypeInput.addEventListener('input', broadcastUpdate);
        playerManaSymbolsInput.addEventListener('input', broadcastUpdate);

        // Initialize
        renderDraftList();

        console.log(`[DraftList ${slotId}] Slot initialized`);
    }

    // Load cards first, then initialize both slots
    loadCards().then(() => {
        initSlot('1');
        initSlot('2');
    });

    console.log('[DraftList] Module initialized');
}
