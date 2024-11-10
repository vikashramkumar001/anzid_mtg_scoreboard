import express from 'express';
import {createServer} from 'http';
import {Server} from 'socket.io';
import path from 'path';
import multer from 'multer';
import {promises as fs} from 'fs';
import {fileURLToPath} from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static('public'));

// Store match IDs using their socket IDs
let socketIDs = {};

// In-memory storage for scores
let controlData = {};
let overlayHeaderBackgroundImage = '/assets/images/overlay_header.png'; // Default header image
let overlayFooterBackgroundImage = '/assets/images/overlay_footer.png'; // Default header image

let defaultData = {
    'player-name-left': 'Player name',
    'player-pronouns-left': 'He/Him',
    'player-archetype-left': 'Archetype name',
    'player-record-left': '0-0',
    'player-wins-left': '0',
    'player-poison-left': '0',
    'player-life-left': '20',
    'player-life-right': '20',
    'player-name-right': 'Player name',
    'player-pronouns-right': 'He/Him',
    'player-archetype-right': 'Archetype name',
    'player-record-right': '0-0',
    'player-wins-right': '0',
    'player-poison-right': '0',
    'event-name': 'Event name',
    'event-round': 'Round 1 of 15',
    'event-format': 'Limited',
    'player-main-deck-left': '',
    'player-side-deck-left': '',
    'player-main-deck-right': '',
    'player-side-deck-right': ''
}

// Initialize the archetype list
let archetypeList = [];

function sortArchetypeList(archetypeList) {
    return archetypeList.sort((a, b) => a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}));
}

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, 'public', 'assets', 'images', 'archetypes');
fs.mkdir(uploadDir, {recursive: true}).catch(console.error);

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

const upload = multer({storage: storage});

const ARCHETYPE_LIST_FILE = path.join(__dirname, 'archetypeList.json');

// Function to load the archetype list from file
async function loadArchetypeList() {
    try {
        const data = await fs.readFile(ARCHETYPE_LIST_FILE, 'utf8');
        archetypeList = JSON.parse(data);
        console.log('Archetype list loaded successfully');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Archetype list file not found. Starting with an empty list.');
        } else {
            console.error('Error loading archetype list:', error);
        }
        archetypeList = [];
    }
}

// Function to save the archetype list to file
async function saveArchetypeList() {
    try {
        await fs.writeFile(ARCHETYPE_LIST_FILE, JSON.stringify(archetypeList, null, 2));
        console.log('Archetype list saved successfully');
    } catch (error) {
        console.error('Error saving archetype list:', error);
    }
}

// Load the archetype list when the server starts
loadArchetypeList();

// Configure multer for archetype image uploads
const archetypeImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const archetypeName = req.body.archetypeName || 'unknown_archetype';
        const sanitizedArchetypeName = archetypeName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'unknown_archetype';
        const fileExtension = path.extname(file.originalname) || '.png'; // Default to .png if no extension
        const filename = `archetype_${sanitizedArchetypeName}${fileExtension}`;
        cb(null, filename);
    }
});

const uploadArchetypeImage = multer({
    storage: archetypeImageStorage,
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

const CONTROL_DATA_FILE = path.join(__dirname, 'controlData.json');

async function loadControlData() {
    try {
        const data = await fs.readFile(CONTROL_DATA_FILE, 'utf8');
        controlData = JSON.parse(data);
        console.log('Control data loaded successfully');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Control data file not found. Starting with empty data.');
            controlData = {};
        } else {
            console.error('Error loading control data:', error);
            controlData = {};
        }
    }
}

async function saveControlData() {
    try {
        await fs.writeFile(CONTROL_DATA_FILE, JSON.stringify(controlData, null, 2));
        console.log('Control data saved successfully');
    } catch (error) {
        console.error('Error saving control data:', error);
    }
}

// Load control data when server starts
await loadControlData();

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the current scores to the newly connected client
    socket.on('updateScoreboard', async ({round_id, match_id, current_state}) => {
        console.log(round_id, match_id);
        if (!controlData.hasOwnProperty(round_id)) {
            controlData[round_id] = {};
        }
        if (!controlData[round_id].hasOwnProperty(match_id)) {
            controlData[round_id][match_id] = {};
        }
        controlData[round_id][match_id] = current_state;
        // Save the updated control data
        await saveControlData();
        io.emit(`scoreboard-${round_id}-${match_id}-update`, {
            matchData: controlData[round_id][match_id],
            archetypeList: sortArchetypeList(archetypeList),
        });
        io.emit('control-data-updated', controlData);
    });

    socket.on('getSavedState', async ({round_id, match_id, medium}) => {
        console.log('request for score', round_id, match_id, medium);
        // Check if the match already exists, if not create it
        if (!controlData.hasOwnProperty(round_id)) {
            controlData[round_id] = {};
        }
        if (!controlData[round_id].hasOwnProperty(match_id)) {
            controlData[round_id][match_id] = defaultData;  // Initialize the scoreboard if match does not exist
            // Save the updated control data
            await saveControlData();
        }
        io.emit(`${medium}-${round_id}-${match_id}-saved-state`, {
            matchData: controlData[round_id][match_id],
            archetypeList: sortArchetypeList(archetypeList),
        }); // Emit the existing data to the specific control
        // emit full control data
        io.emit('control-data-updated', controlData);
    });

    // Send the current overlay background images to the newly connected client
    io.emit('overlayHeaderBackgroundUpdate', overlayHeaderBackgroundImage);
    io.emit('overlayFooterBackgroundUpdate', overlayFooterBackgroundImage);

    // emit full control data
    io.emit('control-data-updated', controlData);

    // Listen for the 'registerControl' event to store the match id and control ID
    socket.on('registerControl', async (round_id, match_id) => {
        socketIDs[socket.id] = {'round_id': round_id, 'match_id': match_id};
        // Check if the control already exists, if not create it
        if (!controlData.hasOwnProperty(round_id)) {
            controlData[round_id] = {};
        }
        if (!controlData[round_id].hasOwnProperty(match_id)) {
            controlData[round_id][match_id] = defaultData;  // Initialize the scoreboard if match does not exist
            // Save the updated control data
            await saveControlData();
        }
        io.emit(`control-${round_id}-${match_id}-saved-state`, controlData[round_id][match_id]); // Emit the existing data to the specific control
        // send update of control data change
        io.emit('control-data-updated', controlData);
    });

    // Listen for updates from the master control
    socket.on('master-control-matches-updated', async (allControlData) => {
        console.log('Received updated control data from master control');
        controlData = allControlData;

        // Save the updated control data
        await saveControlData();

        // Iterate through each round and match in the updated control data
        Object.entries(allControlData).forEach(([round_id, roundData]) => {
            Object.entries(roundData).forEach(([match_id, matchData]) => {
                // Emit the updated data to all connected clients related to this match
                io.emit(`scoreboard-${round_id}-${match_id}-saved-state`, {
                    matchData: matchData,
                    archetypeList: sortArchetypeList(archetypeList)
                });
                io.emit(`control-${round_id}-${match_id}-saved-state`, matchData);
                console.log(`Emitting updated data for round ${round_id} match ${match_id} to control and scoreboard pages`);
            });
        });
    });

    // Handle request for initial archetype list
    socket.on('getArchetypeList', () => {
        console.log('sending archetype list update')
        io.emit('archetypeListUpdated', archetypeList);
    });

    // Handle adding a new archetype
    socket.on('addArchetype', (archetypeName) => {
        if (!archetypeList.some(archetype => archetype.name === archetypeName)) {
            archetypeList.push({name: archetypeName, imageUrl: null});
            io.emit('archetypeListUpdated', sortArchetypeList(archetypeList));
        }
    });

    // Handle adding multiple new archetypes
    socket.on('addArchetypes', async (archetypeNames) => {
        let updated = false;
        archetypeNames.forEach(archetypeName => {
            if (!archetypeList.some(archetype => archetype.name === archetypeName)) {
                archetypeList.push({name: archetypeName, imageUrl: null});
                updated = true;
            }
        });
        if (updated) {
            await saveArchetypeList();
            io.emit('archetypeListUpdated', sortArchetypeList(archetypeList));
        }
    });

    // Handle deleting a archetype
    socket.on('deleteArchetype', async (archetypeName) => {
        archetypeList = archetypeList.filter(archetype => archetype.name !== archetypeName);
        await saveArchetypeList();
        io.emit('archetypeListUpdated', sortArchetypeList(archetypeList));
    });

    // Handle archetype image upload
    socket.on('upload-archetype-image', async (archetypeName, imageUrl) => {
        const archetypeIndex = archetypeList.findIndex(archetype => archetype.name === archetypeName);
        if (archetypeIndex !== -1) {
            archetypeList[archetypeIndex].imageUrl = imageUrl;
            await saveArchetypeList();
            io.emit('archetypeListUpdated', sortArchetypeList(archetypeList));
        }
    });

    // When a user disconnects, remove their match data
    socket.on('disconnect', async () => {
        const temp = socketIDs[socket.id];
        // delete round/match from control data based on socket disconnected
        // if (temp) {
        //     console.log(`Match ${temp['match_id']} round ${temp['round_id']} disconnected`);
        //     delete controlData[temp['round_id']][temp['match_id']];
        //     console.log(`Removed match ${temp['match_id']} round ${temp['round_id']} from controlData.`);
        //     delete socketIDs[socket.id];
        //
        //     // Save the updated control data
        //     await saveControlData();
        //
        //     io.emit('control-data-updated', controlData);
        // }
    });

    // Handle deck display requests
    socket.on('display-deck', ({roundId, matchId, side}) => {
        if (controlData[roundId] && controlData[roundId][matchId]) {
            const matchData = controlData[roundId][matchId];
            const deckData = {
                mainDeck: matchData[`player-main-deck-${side}`] || [],
                sideDeck: matchData[`player-side-deck-${side}`] || [],
                playerName: matchData[`player-name-${side}`] || 'Unknown Player',
                archetype: matchData[`player-archetype-${side}`] || 'Unknown Archetype'
            };
            
            // Emit the deck data to all connected clients
            io.emit('deck-display-update', deckData);
        }
    });
});

// Handle header overlay upload
app.post('/upload-header-overlay', upload.single('overlay_header'), (req, res) => {
    if (req.file) {
        const newImageUrl = '/assets/images/overlay_header.png';
        io.emit('overlayHeaderBackgroundUpdate', newImageUrl);
        res.json({success: true, newImageUrl: newImageUrl});
    } else {
        res.status(400).json({success: false, message: 'No file uploaded'});
    }
});

// Handle footer overlay upload
app.post('/upload-footer-overlay', upload.single('overlay_footer'), (req, res) => {
    if (req.file) {
        const newImageUrl = '/assets/images/overlay_footer.png';
        io.emit('overlayFooterBackgroundUpdate', newImageUrl);
        res.json({success: true, newImageUrl: newImageUrl});
    } else {
        res.status(400).json({success: false, message: 'No file uploaded'});
    }
});

// Routes for control and scoreboard pages
app.get('/control/:round/:match/:delay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'control.html'));
});

app.get('/scoreboard/:round/:match', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'));
});

// Serve the master control HTML page
app.get('/master-control', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-control.html'));
});

// Serve the deck display HTML page
app.get('/deck-display', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'deck-display.html'));
});

// Serve the side deck display HTML page
app.get('/side-deck-display', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'side-deck-display.html'));
});

// Handle archetype image upload
app.post('/upload-archetype-image', uploadArchetypeImage.single('image'), async (req, res) => {
    if (req.file) {
        const {archetypeName} = req.body;
        const imageUrl = '/assets/images/archetypes/' + req.file.filename;
        const archetypeIndex = archetypeList.findIndex(archetype => archetype.name === archetypeName);
        if (archetypeIndex !== -1) {
            // Update the archetype list with the new image URL
            archetypeList[archetypeIndex].imageUrl = imageUrl;

            try {
                // Save the updated archetype list
                await saveArchetypeList();
                res.json({success: true, imageUrl: imageUrl});
            } catch (error) {
                console.error('Error updating archetype image:', error);
                res.status(500).json({success: false, message: 'Error updating archetype image'});
            }
        } else {
            // If archetype not found, delete the uploaded file
            await fs.unlink(req.file.path).catch(console.error);
            res.status(404).json({success: false, message: 'Archetype not found'});
        }
    } else {
        res.status(400).json({success: false, message: 'No file uploaded'});
    }
});

const PORT = process.env.PORT || 1378;

async function startServer() {
    await loadControlData();
    server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
}

startServer();
