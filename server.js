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
let scores = {
    match1: 0,
    match2: 0,
    match3: 0,
};

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the current scores to the newly connected client
    socket.emit('scoreUpdated', scores);

    socket.on('updateScore', ({ match, score }) => {
        console.log(match, score);
        // Check if the match already exists, if not create it
        if (!scores.hasOwnProperty(match)) {
            scores[match] = 0; // Initialize the score to 0 if match does not exist
        }
        scores[match] = score; // Update the score for the specified match
        io.emit(`${match}-update`, scores[match]); // Emit the updated score for the specific match
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Routes for control and scoreboard pages
app.get('/control/:match/:score', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'control.html'));
});

app.get('/scoreboard/:match/:score', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
