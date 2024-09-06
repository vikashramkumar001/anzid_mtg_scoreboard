const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static('public'));

// In-memory storage for scores
let controlData = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the current scores to the newly connected client
    // socket.emit('getCurrentData', controlData);

    socket.on('updateScoreboard', ({control_id, current_state}) => {
        console.log(control_id);
        console.log(current_state);
        // Check if the match already exists, if not create it
        if (!controlData.hasOwnProperty(control_id)) {
            controlData[control_id] = {}; // Initialize the score to 0 if match does not exist
        }
        controlData[control_id] = current_state; // Update the data for the specified match
        io.emit(`scoreboard-${control_id}-update`, controlData[control_id]); // Emit the updated data to the specific control
    });

    socket.on('getSavedState', ({control_id, medium}) => {
        console.log('request for score', control_id, medium);
        // Check if the match already exists, if not create it
        if (!controlData.hasOwnProperty(control_id)) {
            controlData[control_id] = {
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
            } // Initialize the scoreboard if match does not exist
        }
        io.emit(`${medium}-${control_id}-saved-state`, controlData[control_id]); // Emit the existing data to the specific control
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Routes for control and scoreboard pages
app.get('/control/:match/:delay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'control.html'));
});

app.get('/scoreboard/:match', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
