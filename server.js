// server.js (Entry point)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import routes from './routes/routes.js';
import registerSocketHandlers from './sockets/handlers.js';

import { loadControlData } from './features/control.js';
import { loadBracketData } from './features/brackets.js';
import { loadStandingsData } from './features/standings.js';
import { loadCardListData } from './features/cards.js';
import { loadArchetypeList } from './features/archetypes.js';
import { startTimerBroadcast } from './features/timers.js';
import {loadCardListData as vibesLoadCardListData} from './features/vibes/cards.js'
import {loadCardListData as riftboundLoadCardListData} from './features/riftbound/cards.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware to expose io to routes (if needed)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use(express.json());

// Routes
app.use('/', routes);

// Sockets
registerSocketHandlers(io);
startTimerBroadcast(io);

// Port
const PORT = process.env.PORT || 1378;

// Init all data and start server
async function initialize() {
  await loadControlData();
  await loadBracketData();
  await loadStandingsData();
  await loadCardListData();
  await loadArchetypeList();
  await vibesLoadCardListData();
  await riftboundLoadCardListData();

  server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

initialize();
