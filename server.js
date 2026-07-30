// server.js (Entry point)
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import routes from './routes/routes.js';
import registerSocketHandlers from './sockets/handlers.js';
import { RoomUtils } from './utils/room-utils.js';

import { loadControlData } from './features/control.js';
import { loadBracketData } from './features/brackets.js';
import { loadStandingsData } from './features/standings.js';
import { loadPairingsData } from './features/pairings.js';
import { loadStandingsApiData } from './features/standings-api.js';
import { loadAllCachedDecklists } from './features/decklist-lookup.js';
import { loadPlatformConfig } from './features/tournament-platforms.js';
import { loadLegendPortraits } from './features/best-of-legend.js';
import { loadArchetypeList } from './features/archetypes.js';
import { loadRoster } from './features/roster.js';
import { loadGroupAssignment } from './features/group-assignment.js';
import { startTimerBroadcast } from './features/timers.js';
import {loadCardListData as mtgLoadCardListData} from './features/mtg/cards.js'
import {loadCardListData as vibesLoadCardListData} from './features/vibes/cards.js'
import {loadCardListData as riftboundLoadCardListData} from './features/riftbound/cards.js'
import {loadCardListData as starwarsLoadCardListData} from './features/starwars/cards.js'
import { initOBSWebSocket } from './features/obs-websocket.js';
import { initCardVision } from './features/card-vision.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for local network
    methods: ["GET", "POST"]
  }
});

// Middleware to expose io and room utilities to routes (if needed)
app.use((req, res, next) => {
  req.io = io;
  req.RoomUtils = RoomUtils;
  next();
});

// Static files. `no-store` on the broadcast assets so OBS's CEF can't serve a
// stale re-encoded video / edited CSS-JS from its disk cache (it does this even
// with the default max-age=0, which forced full OBS restarts). Assets are local
// so re-fetching each load is cheap. (Revisit if live scene-loads feel slow —
// could scope to html/css/js/mp4 and version-query the big media instead.)
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
}));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use(express.json());

// Routes
app.use('/', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    host: '0.0.0.0'
  });
});

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
  // Load platform config FIRST so the per-event pairings/standings
  // loaders can filter cached files to the current tournament ID and
  // ignore stale data left behind from previous events.
  await loadPlatformConfig();
  await loadPairingsData();
  await loadStandingsApiData();
  await loadAllCachedDecklists();
  await loadLegendPortraits();
  await mtgLoadCardListData();
  await loadArchetypeList();
  await loadRoster();
  await loadGroupAssignment();
  await vibesLoadCardListData();
  await riftboundLoadCardListData();
  await starwarsLoadCardListData();

  // Connect to OBS WebSocket for scene transition events
  initOBSWebSocket(io);

  // Card-vision EBS: bridge live_loop.py's state.json to overlay clients
  // (socket.io now; Twitch PubSub once the extension is registered)
  initCardVision(app, io);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
    console.log(`Accessible at http://[YOUR_MAC_IP]:${PORT}`);
  });
}

initialize();
