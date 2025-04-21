export function initMetaBreakdown(socket) {

    let currentArchetypeList = [];
    let cardListData = [];
    const metaBreakdownDisplayButton = document.querySelector('#meta-breakdown-control #meta-breakdown-display-button');

    function extractMetaBreakdownFromInputs() {
        const metaBreakdownInputs = document.querySelectorAll('#meta-breakdown-control [id^="meta-breakdown-"].editable');
        let metaBreakdownData = {};
        metaBreakdownInputs.forEach(function (div) {
            // use id of div as key
            metaBreakdownData[div.id] = div.textContent.trim();
        })
        return metaBreakdownData;
    }

    function attachMetaBreakdownDisplayButtonListener() {
        metaBreakdownDisplayButton.addEventListener('click', function () {
            // get data from all inputs
            const metaBreakdownData = extractMetaBreakdownFromInputs();
            console.log(metaBreakdownData);
            // emit data
            socket.emit('send-meta-breakdown-data', metaBreakdownData);
        })
    }

    function renderDropdownList(dropdownList, items, field, type) {
        dropdownList.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            let itemName = '';
            if (type === 'archetype') {
                itemName = item.name;
            }
            if (type === 'card') {
                itemName = item;
            }
            div.textContent = itemName;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = itemName;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change')); // Trigger change event
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = items.length > 0 ? 'block' : 'none';
    }

    // set up for dropdowns - archetype / mtg cards 1/2
    function setupArchetypeDropdowns() {
        const archetypeFields = document.querySelectorAll('#meta-breakdown-control [id^="meta-breakdown-archetype-"]');

        archetypeFields.forEach(field => {
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
                const filteredArchetypes = currentArchetypeList.filter(archetype => archetype.name.toLowerCase().includes(value))
                    .slice(0, 5); // Limit to top 5 results
                renderDropdownList(dropdownList, filteredArchetypes, field, 'archetype');
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, currentArchetypeList, field, 'archetype');
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    function setupCardDropdown() {
        const cardViewFields = document.querySelectorAll('#meta-breakdown-control [id^="meta-breakdown-key-card-"]');

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
                    renderDropdownList(dropdownList, filteredCardsList, field, 'card');
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
                    renderDropdownList(dropdownList, filteredCardsList, field, 'card');
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

    // setup numbers only for inputs - decimals only
    function attachCountInputsListener() {
        const countInputsFields = document.querySelectorAll('[id^="meta-breakdown-day"][id*="-percent-"], [id^="meta-breakdown-day"][id*="-count-"]');
        countInputsFields.forEach(function (div) {
            div.addEventListener('keydown', function (e) {
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                const isNumber = /^[0-9]$/.test(e.key);
                const isDecimal = e.key === '.';

                // Prevent if not a number, decimal point, or allowed key
                if (!isNumber && !allowedKeys.includes(e.key) && !isDecimal) {
                    e.preventDefault();
                }

                // Prevent multiple decimals
                if (isDecimal) {
                    const currentText = (e.target.innerText || '').trim();
                    if (currentText.includes('.')) {
                        e.preventDefault();
                    }
                }
            });

            div.addEventListener('paste', function (e) {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');

                // Remove non-digit/non-dot characters and ensure only one dot
                let digitsOnly = text.replace(/[^0-9.]/g, '');
                const firstDotIndex = digitsOnly.indexOf('.');
                if (firstDotIndex !== -1) {
                    digitsOnly = digitsOnly.slice(0, firstDotIndex + 1) +
                        digitsOnly.slice(firstDotIndex + 1).replace(/\./g, '');
                }

                const selection = window.getSelection();
                if (!selection.rangeCount) return;
                selection.deleteFromDocument();
                selection.getRangeAt(0).insertNode(document.createTextNode(digitsOnly));
            });
        })
    }


    // Request initial archetype list when page loads
    // - this is called in another controller at start up - not needed here
    // socket.emit('getArchetypeList');

    // Listen for updated archetype list from server
    socket.on('archetypeListUpdated', (archetypes) => {
        // save archetype list from server
        currentArchetypeList = archetypes;
        // setup dropdowns using data
        setupArchetypeDropdowns();
    });

    // send request for card list data from server
    // - this is called in mtg controller already - no need to call it here
    // socket.emit('mtg-get-card-list-data');

    // handle receiving card list data from server
    socket.on('mtg-card-list-data', ({cardListData: cardListDataFromServer}) => {
        // console.log('got card list data from server', cardListDataFromServer);
        // save card list data
        cardListData = cardListDataFromServer;
        // setup dropdown and autocomplete for card view section
        setupCardDropdown();
    })

    // attach all listeners
    attachMetaBreakdownDisplayButtonListener();
    attachCountInputsListener();

}