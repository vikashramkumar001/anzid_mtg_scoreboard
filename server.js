const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static('public'));

// Store match IDs using their socket IDs
let matchIds = {};

// In-memory storage for scores
let controlData = {};
let overlayBackgroundImage = '/assets/images/overlay.png'; // Default image

let defaultData = {
    'player-name-left': 'Player name',
    'player-pronouns-left': 'He/Him',
    'player-archetype-left': 'Deck name',
    'player-record-left': '0-0',
    'player-wins-left': '0',
    'player-poison-left': '0',
    'player-life-left': '20',
    'player-life-right': '20',
    'player-name-right': 'Player name',
    'player-pronouns-right': 'He/Him',
    'player-archetype-right': 'Deck name',
    'player-record-right': '0-0',
    'player-wins-right': '0',
    'player-poison-right': '0',
    'event-name': 'Event name',
    'event-round': 'Round 1 of 15',
    'event-format': 'Limited'
}

// Multer setup for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/assets/images/');
    },
    filename: (req, file, cb) => {
        cb(null, 'overlay.png'); // Always overwrite the overlay image
    }
});
const upload = multer({storage});

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the current scores to the newly connected client
    // socket.emit('getCurrentData', controlData);

    socket.on('updateScoreboard', ({control_id, current_state}) => {
        console.log(control_id);
        // console.log(current_state);
        // Check if the match already exists, if not create it
        if (!controlData.hasOwnProperty(control_id)) {
            controlData[control_id] = {}; // Initialize the score to 0 if match does not exist
        }
        controlData[control_id] = current_state; // Update the data for the specified match
        io.emit(`scoreboard-${control_id}-update`, controlData[control_id]); // Emit the updated data to the specific control
        // emit full control data
        io.emit('control-data-updated', controlData);
    });

    socket.on('getSavedState', ({control_id, medium}) => {
        console.log('request for score', control_id, medium);
        // Check if the match already exists, if not create it
        if (!controlData.hasOwnProperty(control_id)) {
            controlData[control_id] = defaultData; // Initialize the scoreboard if match does not exist
        }
        io.emit(`${medium}-${control_id}-saved-state`, controlData[control_id]); // Emit the existing data to the specific control
        // emit full control data
        io.emit('control-data-updated', controlData);
    });

    // Send the current overlay background image to the newly connected client
    socket.emit('overlayBackgroundUpdate', overlayBackgroundImage);

    // emit full control data
    io.emit('control-data-updated', controlData);

    // Listen for the 'registerControl' event to store the control ID
    socket.on('registerControl', (controlID) => {
        matchIds[socket.id] = controlID;
        console.log(`Control registered: ${controlID}`);
        // Check if the control already exists, if not create it
        if (!controlData.hasOwnProperty(controlID)) {
            controlData[controlID] = defaultData; // Initialize the scoreboard if match does not exist
        }
        io.emit(`control-${controlID}-saved-state`, controlData[controlID]); // Emit the existing data to the specific control
        // send update of control data change
        io.emit('control-data-updated', controlData);
    });

    // Listen for updates from the master control
    socket.on('master-control-matches-updated', (allControlData) => {
        console.log('Received updated control data from master control');

        // Update the in-memory controlData with the received data
        controlData = allControlData;

        // Iterate through each match in the updated control data
        Object.entries(allControlData).forEach(([matchId, matchData]) => {
            // Emit the updated data to all connected clients related to this match
            io.emit(`scoreboard-${matchId}-saved-state`, matchData);
            io.emit(`control-${matchId}-saved-state`, matchData);
            console.log(`Emitting updated data for match ${matchId} to control pages`);
        });
    });

    // When a user disconnects, remove their match data
    socket.on('disconnect', () => {
        const matchId = matchIds[socket.id];
        if (matchId) {
            console.log(`Match disconnected: ${matchId}`);
            // Remove the match data from controlData
            delete controlData[matchId];
            console.log(`Removed match ${matchId} from controlData.`);

            // Clean up the stored match ID
            delete matchIds[socket.id];

            // send update of control data change
            io.emit('control-data-updated', controlData);
        }
    });
});

// Routes for control and scoreboard pages
app.get('/control/:match/:delay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'control.html'));
});

app.get('/scoreboard/:match', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'));
});

// Route to upload the overlay image using form submission
app.post('/upload-overlay', upload.single('overlay'), (req, res) => {
    overlayBackgroundImage = '/assets/images/overlay.png'; // Set the new overlay image path
    io.emit('overlayBackgroundUpdate', overlayBackgroundImage); // Emit event to all clients
    res.json({success: true, newImageUrl: overlayBackgroundImage}); // Send a JSON response instead of redirecting
});

// Serve the master control HTML page
app.get('/master-control', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-control.html'));
});


const PORT = process.env.PORT || 1378;
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
