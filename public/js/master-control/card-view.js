export function initCardView(socket) {

    const cardViewViewCardButton = document.querySelector('#card-view-display-button');
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
        const cardViewFields = document.querySelectorAll('[id="card-view-card-autocomplete"]');

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
                if (value.length >= 2) {
                    const filteredCardsList = cardListData.filter(card => card.toLowerCase().includes(value))
                        .slice(0, 5); // Limit to top 5 results
                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);
                } else {
                    dropdownList.style.display = 'none'; // Hide dropdown if less than 2 characters
                }
            });

            field.addEventListener('focus', function () {
                const value = this.textContent.trim().toLowerCase();

                // Check the current input value and filter if it has 2 or more characters
                if (value.length >= 2) {
                    const filteredCardsList = cardListData.filter(card => card.toLowerCase().includes(value))
                        .slice(0, 5); // Limit to top 5 results
                    renderDropdownListForCardView(dropdownList, filteredCardsList, field);
                } else {
                    dropdownList.style.display = 'none'; // Hide dropdown if less than 2 characters
                }
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    function attachCardViewViewCardClickListener() {
        cardViewViewCardButton.addEventListener('click', () => {
            const cardSelectInput = document.getElementById('card-view-card-autocomplete');
            const data2send = {
                'card-selected': cardSelectInput.innerText
            }
            console.log(data2send)
            socket.emit('card-view-view-card', {cardSelected: data2send});
        })
    }

    attachCardViewViewCardClickListener();

    // send request for card list data from server
    socket.emit('get-card-list-data');

    // handle receiving card list data from server
    socket.on('card-list-data', ({cardListData: cardListDataFromServer}) => {
        // console.log('got card list data from server', cardListDataFromServer);
        // save card list data
        cardListData = cardListDataFromServer;
        // setup dropdown and autocomplete for card view section
        setupCardViewCustomDropdown();
    })

}