const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static('public'));

// Store match IDs using their socket IDs
let matchIds = {};

// In-memory storage for scores
let controlData = {};
let overlayHeaderBackgroundImage = '/assets/images/overlay_header.png'; // Default header image
let overlayFooterBackgroundImage = '/assets/images/overlay_footer.png'; // Default header image

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

// Initialize the deck list
let deckList = [];

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, 'public', 'assets', 'images', 'decks');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/assets/images/')
    },
    filename: function (req, file, cb) {
        // Use fixed filenames for header and footer overlays
        if (file.fieldname === 'overlay_header') {
            cb(null, 'overlay_header.png')
        } else if (file.fieldname === 'overlay_footer') {
            cb(null, 'overlay_footer.png')
        } else {
            cb(new Error('Invalid field name'), null)
        }
    }
});

const upload = multer({ storage: storage });

const DECK_LIST_FILE = path.join(__dirname, 'deckList.json');

// Function to load the deck list from file
async function loadDeckList() {
    try {
        const data = await fs.readFile(DECK_LIST_FILE, 'utf8');
        deckList = JSON.parse(data);
        console.log('Deck list loaded successfully');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Deck list file not found. Starting with an empty list.');
        } else {
            console.error('Error loading deck list:', error);
        }
        deckList = [];
    }
}

// Function to save the deck list to file
async function saveDeckList() {
    try {
        await fs.writeFile(DECK_LIST_FILE, JSON.stringify(deckList, null, 2));
        console.log('Deck list saved successfully');
    } catch (error) {
        console.error('Error saving deck list:', error);
    }
}

// Load the deck list when the server starts
loadDeckList();

// Configure multer for deck image uploads
const deckImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const deckName = req.body.deckName || 'unknown_deck';
        const sanitizedDeckName = deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'unknown_deck';
        const fileExtension = path.extname(file.originalname) || '.png'; // Default to .png if no extension
        const filename = `deck_${sanitizedDeckName}${fileExtension}`;
        cb(null, filename);
    }
});

const uploadDeckImage = multer({ 
    storage: deckImageStorage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the current scores to the newly connected client
    // socket.emit('getCurrentData', controlData);

    socket.on('updateScoreboard', ({control_id, current_state}) => {
        console.log(control_id);
        // Check if the match already exists, if not create it
        if (!controlData.hasOwnProperty(control_id)) {
            controlData[control_id] = {}; // Initialize the score to 0 if match does not exist
        }
        controlData[control_id] = current_state; // Update the data for the specified match
        io.emit(`scoreboard-${control_id}-update`, {
            matchData: controlData[control_id],
            deckList: deckList
        }); // Emit the updated data to the specific control
        // emit full control data
        io.emit('control-data-updated', controlData);
    });

    socket.on('getSavedState', ({control_id, medium}) => {
        console.log('request for score', control_id, medium);
        // Check if the match already exists, if not create it
        if (!controlData.hasOwnProperty(control_id)) {
            controlData[control_id] = defaultData; // Initialize the scoreboard if match does not exist
        }
        io.emit(`${medium}-${control_id}-saved-state`, {
            matchData: controlData[control_id],
            deckList: deckList
        }); // Emit the existing data to the specific control
        // emit full control data
        io.emit('control-data-updated', controlData);
    });

    // Send the current overlay background images to the newly connected client
    socket.emit('overlayHeaderBackgroundUpdate', overlayHeaderBackgroundImage);
    socket.emit('overlayFooterBackgroundUpdate', overlayFooterBackgroundImage);

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
            io.emit(`scoreboard-${matchId}-saved-state`, {matchData:matchData, deckList: deckList});
            io.emit(`control-${matchId}-saved-state`, matchData);
            console.log(`Emitting updated data for match ${matchId} to control pages`);
        });
    });

    // Handle request for initial deck list
    socket.on('getDeckList', () => {
        socket.emit('deckListUpdated', deckList);
    });

    // Handle adding a new deck
    socket.on('addDeck', (deckName) => {
        if (!deckList.some(deck => deck.name === deckName)) {
            deckList.push({ name: deckName, imageUrl: null });
            io.emit('deckListUpdated', deckList);
        }
    });

    // Handle adding multiple new decks
    socket.on('addDecks', async (deckNames) => {
        let updated = false;
        deckNames.forEach(deckName => {
            if (!deckList.some(deck => deck.name === deckName)) {
                deckList.push({ name: deckName, imageUrl: null });
                updated = true;
            }
        });
        if (updated) {
            await saveDeckList();
            io.emit('deckListUpdated', deckList);
        }
    });

    // Handle deleting a deck
    socket.on('deleteDeck', async (deckName) => {
        deckList = deckList.filter(deck => deck.name !== deckName);
        await saveDeckList();
        io.emit('deckListUpdated', deckList);
    });

    // Handle deck image upload
    socket.on('upload-deck-image', async (deckName, imageUrl) => {
        const deckIndex = deckList.findIndex(deck => deck.name === deckName);
        if (deckIndex !== -1) {
            deckList[deckIndex].imageUrl = imageUrl;
            await saveDeckList();
            io.emit('deckListUpdated', deckList);
        }
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

// Handle header overlay upload
app.post('/upload-header-overlay', upload.single('overlay_header'), (req, res) => {
    if (req.file) {
        const newImageUrl = '/assets/images/overlay_header.png';
        io.emit('overlayHeaderBackgroundUpdate', newImageUrl);
        res.json({ success: true, newImageUrl: newImageUrl });
    } else {
        res.status(400).json({ success: false, message: 'No file uploaded' });
    }
});

// Handle footer overlay upload
app.post('/upload-footer-overlay', upload.single('overlay_footer'), (req, res) => {
    if (req.file) {
        const newImageUrl = '/assets/images/overlay_footer.png';
        io.emit('overlayFooterBackgroundUpdate', newImageUrl);
        res.json({ success: true, newImageUrl: newImageUrl });
    } else {
        res.status(400).json({ success: false, message: 'No file uploaded' });
    }
});

// Serve the master control HTML page
app.get('/master-control', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-control.html'));
});

// Handle deck image upload
app.post('/upload-deck-image', uploadDeckImage.single('image'), async (req, res) => {
    if (req.file) {
        const { deckName } = req.body;
        const imageUrl = '/assets/images/decks/' + req.file.filename;
        const deckIndex = deckList.findIndex(deck => deck.name === deckName);
        if (deckIndex !== -1) {
            // Update the deck list with the new image URL
            deckList[deckIndex].imageUrl = imageUrl;
            
            try {
                // Save the updated deck list
                await saveDeckList();
                res.json({ success: true, imageUrl: imageUrl });
            } catch (error) {
                console.error('Error updating deck image:', error);
                res.status(500).json({ success: false, message: 'Error updating deck image' });
            }
        } else {
            // If deck not found, delete the uploaded file
            await fs.unlink(req.file.path).catch(console.error);
            res.status(404).json({ success: false, message: 'Deck not found' });
        }
    } else {
        res.status(400).json({ success: false, message: 'No file uploaded' });
    }
});

const PORT = process.env.PORT || 1378;
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
