export function initCardView(socket) {

    const cardViewViewCardButton = document.querySelector('#card-view-view-card-button');
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

            // add event listener for preview
            div.addEventListener('click', function () {
                field.textContent = card;
                dropdownList.style.display = 'none';
                renderCardPreview(card); // <-- ADD THIS LINE
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change'));
            });

        });
        dropdownList.style.display = cards.length > 0 ? 'block' : 'none';
    }

    function setupCardViewCustomDropdown() {
        const cardViewFields = document.querySelectorAll('[id^="card-view-input-autocomplete"]');

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

            field.addEventListener('input', function () {
                const value = this.textContent.trim().toLowerCase();

                // Only filter and render the list if input has 2 or more characters
                if (value.length >= 1) {
                    const filteredCardsList = Object.keys(cardListData)
                        .filter(cardName => cardName.toLowerCase().includes(value))
                        .slice(0, 5); // Limit to top 5 results

                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);

                    // Check for exact match and show preview
                    const exactMatch = Object.keys(cardListData).find(cardName => cardName.toLowerCase() === value.toLowerCase());
                    if (exactMatch) {
                        renderCardPreview(exactMatch);
                    } else {
                        renderCardPreview(''); // Clear if no match
                    }

                } else {
                    dropdownList.style.display = 'none';
                }
            });

            field.addEventListener('focus', function () {
                const value = this.textContent.trim().toLowerCase();

                // Check the current input value and filter if it has 2 or more characters
                if (value.length >= 1) {
                    const filteredCardsList = Object.keys(cardListData)
                        .filter(cardName => cardName.toLowerCase().includes(value))
                        .slice(0, 5); // Limit to top 5 results

                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);

                    // Check for exact match and show preview
                    const exactMatch = Object.keys(cardListData).find(cardName => cardName.toLowerCase() === value.toLowerCase());
                    if (exactMatch) {
                        renderCardPreview(exactMatch);
                    } else {
                        renderCardPreview(''); // Clear if no match
                    }
                } else {
                    dropdownList.style.display = 'none';
                    renderCardPreview('');
                }
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    function renderCardPreview(cardName) {
        const previewEl = document.getElementById('card-preview');
        const url = cardListData[cardName];

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

    function attachViewCardClickListener() {
        cardViewViewCardButton.addEventListener('click', () => {
            const cardSelectInput = document.getElementById('card-view-input-autocomplete');
            const data2send = {
                'card-selected': cardSelectInput.innerText
            }
            console.log(data2send)
            socket.emit('vibes-card-view-view-card', {cardSelected: data2send});
        })
    }

    attachViewCardClickListener();

    // send request for card list data from server
    socket.emit('vibes-get-card-list-data');

    // handle receiving card list data from server
    socket.on('vibes-card-list-data', ({cardListData: cardListDataFromServer}) => {
        console.log('got card list data from server', cardListDataFromServer);
        // save card list data
        cardListData = cardListDataFromServer;
        // setup dropdown and autocomplete for card view section
        setupCardViewCustomDropdown();
    })

}