export function initStarWarsCardView(socket) {

    const cardViewViewCardButton1 = document.querySelector('#starwars-card-view #card-view-starwars-display-button-1');
    const cardViewViewCardButton2 = document.querySelector('#starwars-card-view #card-view-starwars-display-button-2');
    const cardViewResetCard1Button = document.querySelector('#starwars-card-view #card-view-starwars-reset-button-1');
    const cardViewResetCard2Button = document.querySelector('#starwars-card-view #card-view-starwars-reset-button-2');
    let cardListData = {}; // mapping displayName -> {set,name,image}

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
                field.dispatchEvent(new Event('change'));
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = cards.length > 0 ? 'block' : 'none';
    }

    function setupCardViewCustomDropdown() {
        const cardViewFields = document.querySelectorAll('#starwars-card-view [id^="card-view-starwars-input-autocomplete"]');

        cardViewFields.forEach(field => {
            if (field.parentNode.classList.contains('custom-dropdown')) {
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown';
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);

            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list';
            wrapper.appendChild(dropdownList);

            function whichToRender(field, match) {
                if (field.id === 'card-view-starwars-input-autocomplete-1') {
                    renderCardPreview1(match);
                }
                if (field.id === 'card-view-starwars-input-autocomplete-2') {
                    renderCardPreview2(match);
                }
            }

            field.addEventListener('input', function () {
                const value = this.textContent.trim().toLowerCase();

                if (value.length >= 1) {
                    const filteredCardsList = Object.keys(cardListData)
                        .filter(cardName => cardName.toLowerCase().includes(value))
                        .slice(0, 10);

                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);

                    const exactMatch = Object.keys(cardListData).find(cardName => cardName.toLowerCase() === value.toLowerCase());
                    if (exactMatch) {
                        whichToRender(field, exactMatch);
                    } else {
                        whichToRender(field, '');
                    }
                } else {
                    dropdownList.style.display = 'none';
                    whichToRender(field, '');
                }
            });

            field.addEventListener('focus', function () {
                const value = this.textContent.trim().toLowerCase();
                if (value.length >= 1) {
                    const filteredCardsList = Object.keys(cardListData)
                        .filter(cardName => cardName.toLowerCase().includes(value))
                        .slice(0, 10);
                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);
                    const exactMatch = Object.keys(cardListData).find(cardName => cardName.toLowerCase() === value.toLowerCase());
                    if (exactMatch) {
                        whichToRender(field, exactMatch);
                    } else {
                        whichToRender(field, '');
                    }
                } else {
                    dropdownList.style.display = 'none';
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

    function renderCardPreview1(displayName) {
        const previewEl = document.querySelector('#starwars-card-view #card-preview-starwars-1');
        const entry = cardListData[displayName];
        if (entry && entry.url) {
            previewEl.innerHTML = `
            <div class="card mt-2">
                <img src="${entry.url}" alt="${entry.name}" class="card-img-top" style="max-height:300px; object-fit:contain;">
                <div class="card-body text-center">
                    <strong>${entry.name}</strong>
                    <div>${entry.set}</div>
                </div>
            </div>
        `;
        } else {
            previewEl.innerHTML = '';
        }
    }

    function renderCardPreview2(displayName) {
        const previewEl = document.querySelector('#starwars-card-view #card-preview-starwars-2');
        const entry = cardListData[displayName];
        if (entry && entry.url) {
            previewEl.innerHTML = `
            <div class="card mt-2">
                <img src="${entry.url}" alt="${entry.name}" class="card-img-top" style="max-height:300px; object-fit:contain;">
                <div class="card-body text-center">
                    <strong>${entry.name}</strong>
                    <div>${entry.set}</div>
                </div>
            </div>
        `;
        } else {
            previewEl.innerHTML = '';
        }
    }

    function attachViewCard1ClickListener() {
        cardViewViewCardButton1.addEventListener('click', () => {
            const cardSelectInput = document.querySelector('#starwars-card-view #card-view-starwars-input-autocomplete-1');
            const data2send = {
                'card-selected': cardSelectInput.innerText,
                'card-id': 1,
                'game-id': 'starwars'
            }
            socket.emit('view-selected-card', {cardSelected: data2send});
        })
    }

    function attachViewCard2ClickListener() {
        cardViewViewCardButton2.addEventListener('click', () => {
            const cardSelectInput = document.querySelector('#starwars-card-view #card-view-starwars-input-autocomplete-2');
            const data2send = {
                'card-selected': cardSelectInput.innerText,
                'card-id': 2,
                'game-id': 'starwars'
            }
            socket.emit('view-selected-card', {cardSelected: data2send});
        })
    }

    function attachCardViewResetCard1ClickListener() {
        cardViewResetCard1Button.addEventListener('click', () => {
            const data2send = {
                'card-selected': '',
                'card-id': 1,
                'game-id': 'starwars'
            }
            socket.emit('view-selected-card', {cardSelected: data2send});
            const previewEl = document.querySelector('#starwars-card-view #card-preview-starwars-1');
            previewEl.innerHTML = '';
            const cardSelectInput = document.querySelector('#starwars-card-view #card-view-starwars-input-autocomplete-1');
            cardSelectInput.innerText = '';
        })
    }

    function attachCardViewResetCard2ClickListener() {
        cardViewResetCard2Button.addEventListener('click', () => {
            const data2send = {
                'card-selected': '',
                'card-id': 2,
                'game-id': 'starwars'
            }
            socket.emit('view-selected-card', {cardSelected: data2send});
            const previewEl = document.querySelector('#starwars-card-view #card-preview-starwars-2');
            previewEl.innerHTML = '';
            const cardSelectInput = document.querySelector('#starwars-card-view #card-view-starwars-input-autocomplete-2');
            cardSelectInput.innerText = '';
        })
    }

    attachViewCard1ClickListener();
    attachViewCard2ClickListener();
    attachCardViewResetCard1ClickListener();
    attachCardViewResetCard2ClickListener();

    // Request starwars card list
    socket.emit('starwars-get-card-list-data');

    socket.on('starwars-card-list-data', ({cardListData: cardListDataFromServer}) => {
        // build flat display mapping: "SET:Name" -> {set,name,url}
        const flat = {};
        for (const set of Object.keys(cardListDataFromServer || {})) {
            const setMap = cardListDataFromServer[set] || {};
            for (const key of Object.keys(setMap)) {
                const entry = setMap[key];
                const baseRaw = (entry.image || key).split(/\\|\//).pop();
                const base = baseRaw.split('?')[0].split('#')[0];
                const filename = /\.[a-z0-9]+$/i.test(base) ? base : base + '.png';
                const url = `/assets/images/cards/starwars/${set}/${filename}`;
                const display = `${set}:${entry.name}`;
                flat[display] = { set, name: entry.name, url };
            }
        }
        cardListData = flat;
        setupCardViewCustomDropdown();
    });

}
