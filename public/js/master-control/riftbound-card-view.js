export function initRiftboundCardView(socket) {

    const cardViewViewCardButton1 = document.querySelector('#riftbound-card-view #card-view-riftbound-display-button-1');
    const cardViewViewCardButton2 = document.querySelector('#riftbound-card-view #card-view-riftbound-display-button-2');
    const cardViewResetCard1Button = document.querySelector('#riftbound-card-view #card-view-riftbound-reset-button-1');
    const cardViewResetCard2Button = document.querySelector('#riftbound-card-view #card-view-riftbound-reset-button-2');
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
        const cardViewFields = document.querySelectorAll('#riftbound-card-view [id^="card-view-riftbound-input-autocomplete"]');

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

            function whichToRender(field, match) {
                if (field.id === 'card-view-riftbound-input-autocomplete-1') {
                    renderCardPreview1(match);
                }
                if (field.id === 'card-view-riftbound-input-autocomplete-2') {
                    renderCardPreview2(match);
                }
            }

            field.addEventListener('input', function () {
                const value = this.textContent.trim().toLowerCase();

                // Only filter and render the list if input has 2 or more characters
                if (value.length >= 1) {
                    // Ensure cardListData is an object
                    if (!cardListData || typeof cardListData !== 'object' || Array.isArray(cardListData)) {
                        dropdownList.style.display = 'none';
                        return;
                    }

                    const filteredCardsList = Object.keys(cardListData)
                        .filter(cardName => cardName.toLowerCase().includes(value))
                        .slice(0, 5); // Limit to top 5 results

                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);

                    // Check for exact match and show preview
                    const exactMatch = Object.keys(cardListData).find(cardName => cardName.toLowerCase() === value.toLowerCase());
                    if (exactMatch) {
                        whichToRender(field, exactMatch);
                    } else {
                        // Clear if no match
                        whichToRender(field, '');
                    }
                } else {
                    dropdownList.style.display = 'none';
                    // Clear preview
                    whichToRender(field, '');
                }
            });

            field.addEventListener('focus', function () {
                const value = this.textContent.trim().toLowerCase();

                // Check the current input value and filter if it has 2 or more characters
                if (value.length >= 1) {
                    // Ensure cardListData is an object
                    if (!cardListData || typeof cardListData !== 'object' || Array.isArray(cardListData)) {
                        dropdownList.style.display = 'none';
                        return;
                    }

                    const filteredCardsList = Object.keys(cardListData)
                        .filter(cardName => cardName.toLowerCase().includes(value))
                        .slice(0, 5); // Limit to top 5 results

                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);

                    // Check for exact match and show preview
                    const exactMatch = Object.keys(cardListData).find(cardName => cardName.toLowerCase() === value.toLowerCase());
                    if (exactMatch) {
                        whichToRender(field, exactMatch);
                    } else {
                        // Clear if no match
                        whichToRender(field, '');
                    }
                } else {
                    dropdownList.style.display = 'none';
                    // Clear preview
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

    function renderCardPreview1(cardName) {
        const previewEl = document.querySelector('#riftbound-card-view #card-preview-riftbound-1');
        const url = cardListData[cardName]?.imageUrl;

        if (url) {
            previewEl.innerHTML = `
            <div class="card mt-2">
                <img src="${url}" alt="${cardName}" class="card-img-top" style="max-height:300px; object-fit:contain;">
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
        const previewEl = document.querySelector('#riftbound-card-view #card-preview-riftbound-2');
        const url = cardListData[cardName]?.imageUrl;

        if (url) {
            previewEl.innerHTML = `
            <div class="card mt-2">
                <img src="${url}" alt="${cardName}" class="card-img-top" style="max-height:300px; object-fit:contain;">
                <div class="card-body text-center">
                    <strong>${cardName}</strong>
                </div>
            </div>
        `;
        } else {
            previewEl.innerHTML = '';
        }
    }

    function attachViewCard1ClickListener() {
        cardViewViewCardButton1.addEventListener('click', () => {
            const cardSelectInput = document.querySelector('#riftbound-card-view #card-view-riftbound-input-autocomplete-1');
            const data2send = {
                'card-selected': cardSelectInput.innerText,
                'card-id': 1,
                'game-id': 'riftbound'
            }
            console.log(data2send)
            socket.emit('view-selected-card', {cardSelected: data2send});
        })
    }

    function attachViewCard2ClickListener() {
        cardViewViewCardButton2.addEventListener('click', () => {
            const cardSelectInput = document.querySelector('#riftbound-card-view #card-view-riftbound-input-autocomplete-2');
            const data2send = {
                'card-selected': cardSelectInput.innerText,
                'card-id': 2,
                'game-id': 'riftbound'
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
                'game-id': 'riftbound'
            }
            socket.emit('view-selected-card', {cardSelected: data2send});
            // reset preview
            const previewEl = document.querySelector('#riftbound-card-view #card-preview-riftbound-1');
            previewEl.innerHTML = '';
            // reset input
            const cardSelectInput = document.querySelector('#riftbound-card-view #card-view-riftbound-input-autocomplete-1');
            cardSelectInput.innerText = '';
        })
    }

    function attachCardViewResetCard2ClickListener() {
        cardViewResetCard2Button.addEventListener('click', () => {
            const data2send = {
                'card-selected': '',
                'card-id': 2,
                'game-id': 'riftbound'
            }
            console.log(data2send)
            socket.emit('view-selected-card', {cardSelected: data2send});
            // reset preview
            const previewEl = document.querySelector('#riftbound-card-view #card-preview-riftbound-2');
            previewEl.innerHTML = '';
            // reset input
            const cardSelectInput = document.querySelector('#riftbound-card-view #card-view-riftbound-input-autocomplete-2');
            cardSelectInput.innerText = '';
        })
    }

    attachViewCard1ClickListener();
    attachViewCard2ClickListener();
    attachCardViewResetCard1ClickListener();
    attachCardViewResetCard2ClickListener();

    // send request for card list data from server
    socket.emit('riftbound-get-card-list-data');

    // handle receiving card list data from server
    socket.on('riftbound-card-list-data', ({cardListData: cardListDataFromServer}) => {
        // save card list data
        cardListData = cardListDataFromServer || {};
        // setup dropdown and autocomplete for card view section
        setupCardViewCustomDropdown();
    })

}