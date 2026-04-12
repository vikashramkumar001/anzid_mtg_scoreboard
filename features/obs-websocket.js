import OBSWebSocket from 'obs-websocket-js';
import { RoomUtils } from '../utils/room-utils.js';

const OBS_WS_URL = 'ws://localhost:4455';
const OBS_WS_PASSWORD = 'RRWtUPVpGf6myRvx';
const RECONNECT_INTERVAL = 5000;

// Scene name mappings
const METAGAME_SCENE = 'Event Slides - Metagame';
const STANDINGS_SCENE_MAP = {
    'Standings - Current Round 1-16': 1,
    'Standings - Current Round 17-32': 2,
    'Standings - Current Round 33-48': 3,
    'Standings - Current Round 49-64': 4,
};

let obs = null;
let io = null;
let reconnectTimer = null;
let wasOnStandings = false;
let lastProgramScene = null;

const METAGAME_DELAY = 1400;
const STANDINGS_DELAY = 2000;

function handleSceneChange(sceneName) {
    if (sceneName === lastProgramScene) return;
    lastProgramScene = sceneName;

    // Metagame
    if (sceneName === METAGAME_SCENE) {
        setTimeout(() => {
            RoomUtils.emitWithRoomMapping(io, 'obs-animate-metagame', {});
        }, METAGAME_DELAY);
    }

    // Standings
    const standingsPage = STANDINGS_SCENE_MAP[sceneName];
    if (standingsPage) {
        RoomUtils.emitWithRoomMapping(io, 'obs-standings-page', { page: standingsPage });
        wasOnStandings = true;
    } else if (wasOnStandings) {
        setTimeout(() => {
            RoomUtils.emitWithRoomMapping(io, 'obs-left-standings', {});
        }, STANDINGS_DELAY);
        wasOnStandings = false;
    }
}

async function connect() {
    obs = new OBSWebSocket();

    try {
        await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD);
        console.log('[OBS WebSocket] Connected');

        let pendingScene = null;

        obs.on('SceneTransitionStarted', async () => {
            try {
                const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
                pendingScene = currentProgramSceneName;
                console.log(`[OBS WebSocket] Transition started → target: ${pendingScene}`);
                handleSceneChange(pendingScene);
            } catch (err) {
                console.error('[OBS WebSocket] Error querying scene:', err.message);
            }
        });

        // Fallback: catch scene changes that don't go through transitions
        obs.on('CurrentProgramSceneChanged', (data) => {
            const sceneName = data.sceneName;
            if (sceneName === pendingScene) {
                pendingScene = null;
                return; // Already handled during transition
            }
            console.log(`[OBS WebSocket] Program scene changed to: ${sceneName} (fallback)`);
            handleSceneChange(sceneName);
        });

        obs.on('ConnectionClosed', () => {
            console.log('[OBS WebSocket] Connection closed — reconnecting...');
            scheduleReconnect();
        });

    } catch (err) {
        console.error(`[OBS WebSocket] Failed to connect: ${err.message}`);
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, RECONNECT_INTERVAL);
}

export function initOBSWebSocket(socketIo) {
    io = socketIo;
    connect();
}
