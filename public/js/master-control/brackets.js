export function initBrackets(socket) {

    let bracketData = {};
    let standingsDataRaw = '';
    let standingsDataParsed = {};
    let namesFromStandings = [];

    const standingsSubmitButton = document.getElementById('bracket-standings-update-button');
    const standingsInput = document.getElementById('brackets-standings-input');

    // send request for bracket data - we can do this because the html for bracket is hardcoded at start
    socket.emit('get-bracket-data');

    socket.on('bracket-data', ({bracketData: bracketDataFromServer}) => {
        console.log('got bracket data', bracketDataFromServer);
        bracketData = bracketDataFromServer;
        // populate all standings text boxes per round
        populateBracketData();
    })

    function populateBracketData() {
        Object.keys(bracketData).forEach((bracket_id) => {
            renderBracket(bracket_id);
        })
    }

    function renderBracket(bracket_id) {
        let bracketField = document.getElementById(`${bracket_id}`);
        bracketField.innerHTML = bracketData[bracket_id];
    }

    // function to gather bracket data when update is clicked
    function attachBracketUpdateClickListener() {
        const bracketUpdateButton = document.querySelector(`#bracket-update-button`);

        bracketUpdateButton.addEventListener('click', () => {
            const bracketValues = extractBracketData();
            // send update to server to handle storage
            socket.emit('bracket-updated', {bracketValues});
        });
    }

    // actually call the attach button listener
    attachBracketUpdateClickListener();

    function extractBracketData() {
        // Select the parent container
        const bracketControl = document.querySelector('#bracket-control');

        // Select all child divs within the container with class 'editable' and IDs starting with 'bracket-'
        const bracketFields = bracketControl.querySelectorAll('[id^="bracket-"].editable');

        // Create a structure to hold the ID-value pairs
        const bracketValues = {};

        // Loop through each selected element
        bracketFields.forEach(div => {
            const id = div.id; // Get the id of the div
            // Get the content of the div (editable input)
            bracketValues[id] = div.textContent.trim(); // Add the id-value pair to the structure
        });
        return bracketValues
    }

    // STANDINGS HANDLING

    standingsInput.textContent = '';

    function attachSubmitStandingsClickListener() {
        standingsSubmitButton.addEventListener('click', function () {
            // reset
            resetStandingsData();
            // grab data from input
            standingsDataRaw = standingsInput.value;
            // process raw standings data into structured object
            processStandingsData();
            // now auto-populate brackets 1-8
            autoPopulateBrackets();
            // setup custom name dropdowns using names from standings
            setupCustomNameDropdowns();
        })
    }

    attachSubmitStandingsClickListener();

    function resetStandingsData() {
        standingsDataRaw = '';
        standingsDataParsed = {};
        namesFromStandings = [];
    }

    function processStandingsData() {
        // use raw standings data and try to get it into a structured format
        standingsDataParsed = {};

        if (typeof standingsDataRaw !== 'string' || standingsDataRaw.trim() === '') {
            return;
        }

        // Split the input into lines
        const lines = standingsDataRaw
            .split('\n')
            .map(line => line.trim());

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) continue; // Skip empty lines

            // Check if the line starts with a number (Rank)
            if (/^\d+/.test(line)) {
                const rank = line.split(' ')[0]; // The rank is the first part of the line
                const playerInfo = lines[++i].trim(); // The next line contains the player's name
                const archetype = lines[++i].trim(); // The next line contains the archetype
                const record = lines[++i].trim().split(/\s+/)[0]; // First space-delimited entry in the next line
                let firstName = '', lastName = '';
                if (playerInfo.includes(',')) {
                    // "Last, First [optional extra]"
                    [lastName, firstName] = playerInfo.split(',').map(part => part.trim());
                    firstName = firstName.split(' ')[0]; // Only take the first word of firstName
                } else {
                    // "First Last [optional extra]"
                    [firstName, lastName] = playerInfo.trim().split(' ');
                }
                const name = `${firstName} ${lastName}`;

                standingsDataParsed[rank] = {
                    rank: parseInt(rank, 10),
                    name: name,
                    archetype: archetype,
                    record: record
                };
            }
        }
        console.log('standings obj', standingsDataParsed)
    }

    function clearAutoPopulatedBrackets() {
        const startingID = 'bracket-quarterfinal';
        for (let x = 0; x < 8; x++) {
            let nameInput = document.getElementById(`${startingID}-${x + 1}-name`);
            let archetypeInput = document.getElementById(`${startingID}-${x + 1}-archetype`);
            let rankInput = document.getElementById(`${startingID}-${x + 1}-rank`);
            nameInput.textContent = '';
            archetypeInput.textContent = '';
            rankInput.textContent = '';
        }
    }

    function autoPopulateBrackets() {
        // use the structured standings to populate brackets 1-8
        // clear previous values auto-populated
        clearAutoPopulatedBrackets();
        // name, archetype, rank
        const maxEntries = Math.min(8, Object.keys(standingsDataParsed).length);
        const startingID = 'bracket-quarterfinal';
        for (let x = 0; x < maxEntries; x++) {
            let nameInput = document.getElementById(`${startingID}-${x + 1}-name`);
            let archetypeInput = document.getElementById(`${startingID}-${x + 1}-archetype`);
            let rankInput = document.getElementById(`${startingID}-${x + 1}-rank`);
            nameInput.textContent = standingsDataParsed[x + 1]['name'];
            archetypeInput.textContent = standingsDataParsed[x + 1]['archetype'];
            rankInput.textContent = standingsDataParsed[x + 1]['rank'];
        }
    }

    function setupCustomNameDropdowns() {
        const nameInputs = document.querySelectorAll('#bracket-control [id^="bracket-"][id$="-name"].editable');
        namesFromStandings = [...new Set(Object.values(standingsDataParsed).map(player => player.name))];
        console.log(namesFromStandings)
        nameInputs.forEach(field => {
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
                const filteredNames = namesFromStandings.filter(name => name.toLowerCase().includes(value))
                    .slice(0, 5); // Limit to top 5 results
                renderDropdownList(dropdownList, filteredNames, field);
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, namesFromStandings, field);
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    function renderDropdownList(dropdownList, names, field) {
        dropdownList.innerHTML = '';
        names.forEach(name => {
            const div = document.createElement('div');
            div.textContent = name;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = name;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change')); // Trigger change event
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = names.length > 0 ? 'block' : 'none';
    }

    // END STANDINGS HANDLING

}