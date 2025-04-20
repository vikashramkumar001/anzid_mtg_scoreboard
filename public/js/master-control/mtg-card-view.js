export function initMTGCardView(socket) {

    const cardViewViewCard1Button = document.querySelector('#mtg-card-view #card-view-mtg-display-button-1');
    const cardViewViewCard2Button = document.querySelector('#mtg-card-view #card-view-mtg-display-button-2');
    const cardViewResetCard1Button = document.querySelector('#mtg-card-view #card-view-mtg-reset-button-1');
    const cardViewResetCard2Button = document.querySelector('#mtg-card-view #card-view-mtg-reset-button-2');
    let cardListData = [];

    function renderDropdownListForCardView(dropdownList, cards, field) {
        dropdownList.innerHTML = '';
        cards.forEach(card => {
            const div = document.createElement('div');
            div.textContent = card;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = card;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change')); // Trigger change event
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = cards.length > 0 ? 'block' : 'none';
    }

    function setupCardViewCustomDropdown() {
        const cardViewFields = document.querySelectorAll('#mtg-card-view [id^="card-view-mtg-input-autocomplete-"]');

        cardViewFields.forEach(field => {
            if (field.parentNode.classList.contains('custom-dropdown')) {
                return; // Skip if already set up
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown';
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);

            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list';
            wrapper.appendChild(dropdownList);

            function whichToRender(field, card) {
                if (field.id === 'card-view-mtg-input-autocomplete-1') {
                    renderCardPreview1(card);
                }
                if (field.id === 'card-view-mtg-input-autocomplete-2') {
                    renderCardPreview2(card);
                }
            }

            field.addEventListener('input', function () {
                const value = this.textContent.trim().toLowerCase();

                // Only filter and render the list if input has 2 or more characters
                if (value.length >= 2) {
                    const filteredCardsList = cardListData.filter(card => card.toLowerCase().includes(value))
                        .slice(0, 5); // Limit to top 5 results
                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);
                    // Check for exact match and show preview
                    const exactMatch = cardListData.find(cardName => cardName.toLowerCase() === value.toLowerCase());
                    if (exactMatch) {
                        whichToRender(field, exactMatch);
                    } else {
                        // Clear if no match
                        whichToRender(field, '');
                    }
                } else {
                    dropdownList.style.display = 'none'; // Hide dropdown if less than 2 characters
                    // Clear preview
                    whichToRender(field, '');
                }
            });

            field.addEventListener('focus', function () {
                const value = this.textContent.trim().toLowerCase();

                // Check the current input value and filter if it has 2 or more characters
                if (value.length >= 2) {
                    const filteredCardsList = cardListData.filter(card => card.toLowerCase().includes(value))
                        .slice(0, 5); // Limit to top 5 results
                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);
                    // Check for exact match and show preview
                    const exactMatch = cardListData.find(cardName => cardName.toLowerCase() === value.toLowerCase());
                    if (exactMatch) {
                        whichToRender(field, exactMatch);
                    } else {
                        // Clear if no match
                        whichToRender(field, '');
                    }
                } else {
                    dropdownList.style.display = 'none'; // Hide dropdown if less than 2 characters
                    // Clear if no match
                    whichToRender(field, '');
                }
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    function getURLFromCardName(cardName) {
        // For double-faced cards, use only the first face name before the "//"
        const singleFace = cardName.includes('//')
            ? cardName.split('//')[0].trim()
            : cardName.trim();

        // Remove leading/trailing quotes and sanitize
        const cleanedName = singleFace.replace(/^"+|"+$/g, '').replace(/&/g, 'and');

        // Encode for URL
        const encodedName = encodeURIComponent(cleanedName);

        return `https://api.scryfall.com/cards/named?exact=${encodedName}&format=image`;
    }


    function renderCardPreview1(cardName) {
        const previewEl = document.getElementById('card-preview-mtg-1');
        const url = getURLFromCardName(cardName);

        if (cardName) {
            previewEl.innerHTML = `
            <div class="card mt-2">
                <img src="${url}" alt="${cardName}" class="card-img-top mt-2" style="max-height:300px; object-fit:contain;">
                <div class="card-body text-center">
                    <strong>${cardName}</strong>
                </div>
            </div>
        `;
        } else {
            previewEl.innerHTML = '';
        }
    }

    function renderCardPreview2(cardName) {
        const previewEl = document.getElementById('card-preview-mtg-2');
        const url = getURLFromCardName(cardName);

        if (cardName) {
            previewEl.innerHTML = `
            <div class="card mt-2">
                <img src="${url}" alt="${cardName}" class="card-img-top mt-2" style="max-height:300px; object-fit:contain;">
                <div class="card-body text-center">
                    <strong>${cardName}</strong>
                </div>
            </div>
        `;
        } else {
            previewEl.innerHTML = '';
        }
    }

    function attachCardViewViewCard1ClickListener() {
        cardViewViewCard1Button.addEventListener('click', () => {
            const cardSelectInput = document.querySelector('#mtg-card-view #card-view-mtg-input-autocomplete-1');
            const data2send = {
                'card-selected': cardSelectInput.innerText,
                'card-id': 1,
                'game-id': 'mtg'
            }
            console.log(data2send)
            socket.emit('view-selected-card', {cardSelected: data2send});
        })
    }

    function attachCardViewViewCard2ClickListener() {
        cardViewViewCard2Button.addEventListener('click', () => {
            const cardSelectInput = document.querySelector('#mtg-card-view #card-view-mtg-input-autocomplete-2');
            const data2send = {
                'card-selected': cardSelectInput.innerText,
                'card-id': 2,
                'game-id': 'mtg'
            }
            console.log(data2send)
            socket.emit('view-selected-card', {cardSelected: data2send});
        })
    }

    function attachCardViewResetCard1ClickListener() {
        cardViewResetCard1Button.addEventListener('click', () => {
            const data2send = {
                'card-selected': '',
                'card-id': 1,
                'game-id': 'mtg'
            }
            socket.emit('view-selected-card', {cardSelected: data2send});
            // reset preview
            const previewEl = document.querySelector('#mtg-card-view #card-preview-mtg-1');
            previewEl.innerHTML = '';
            // reset input
            const cardSelectInput = document.querySelector('#mtg-card-view #card-view-mtg-input-autocomplete-1');
            cardSelectInput.innerText = '';
        })
    }

    function attachCardViewResetCard2ClickListener() {
        cardViewResetCard2Button.addEventListener('click', () => {
            const data2send = {
                'card-selected': '',
                'card-id': 2,
                'game-id': 'mtg'
            }
            console.log(data2send)
            socket.emit('view-selected-card', {cardSelected: data2send});
            // reset preview
            const previewEl = document.querySelector('#mtg-card-view #card-preview-mtg-2');
            previewEl.innerHTML = '';
            // reset input
            const cardSelectInput = document.querySelector('#mtg-card-view #card-view-mtg-input-autocomplete-2');
            cardSelectInput.innerText = '';
        })
    }

    attachCardViewViewCard1ClickListener();
    attachCardViewViewCard2ClickListener();
    attachCardViewResetCard1ClickListener();
    attachCardViewResetCard2ClickListener();

    // send request for card list data from server
    socket.emit('mtg-get-card-list-data');

    // handle receiving card list data from server
    socket.on('mtg-card-list-data', ({cardListData: cardListDataFromServer}) => {
        // console.log('got card list data from server', cardListDataFromServer);
        // save card list data
        cardListData = cardListDataFromServer;
        // setup dropdown and autocomplete for card view section
        setupCardViewCustomDropdown();
    })

}