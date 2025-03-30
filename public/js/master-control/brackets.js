export function initBrackets(socket) {

    let bracketData = {};

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
}