import OBSWebSocket from 'obs-websocket-js';
import { RoomUtils } from '../utils/room-utils.js';
import { getGameSelection, getVendorSelection, getPlayerCount } from '../config/constants.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRESETS_DIR = path.join(__dirname, '..', 'data', 'obs exports');
const BACKUPS_DIR = path.join(PRESETS_DIR, 'backups');
const LOGS_DIR = path.join(PRESETS_DIR, 'logs');

let _logStream = null;

function startLog(action, configName) {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    const now = new Date();
    const timestamp = now.getFullYear().toString() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0') + String(now.getSeconds()).padStart(2,'0');
    const logPath = path.join(LOGS_DIR, `${timestamp}_${action}_${configName}.txt`);
    _logStream = logPath;
    fs.writeFileSync(logPath, '');
}

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    if (_logStream) fs.appendFileSync(_logStream, line + '\n');
}

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

// ── Preset Helpers ──────────────────────────────────────────────────────────

function getPresetPath(game, vendor, playerCount) {
    return path.join(PRESETS_DIR, `${game}-obsconfig-${vendor}-${playerCount}.json`);
}

async function snapshotAllScenes() {
    if (!obs) return null;

    const { scenes: sceneList } = await obs.call('GetSceneList');
    const scenes = {};

    for (const scene of sceneList) {
        const sceneName = scene.sceneName;
        const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
        const sources = [];

        for (const item of sceneItems) {
            const { sceneItemTransform } = await obs.call('GetSceneItemTransform', {
                sceneName,
                sceneItemId: item.sceneItemId
            });
            const { sceneItemEnabled } = await obs.call('GetSceneItemEnabled', {
                sceneName,
                sceneItemId: item.sceneItemId
            });

            log(`[OBS Preset]   "${sceneName}" → "${item.sourceName}" | visible: ${sceneItemEnabled} | pos: (${sceneItemTransform.positionX}, ${sceneItemTransform.positionY}) | size: (${Math.round(sceneItemTransform.sourceWidth * sceneItemTransform.scaleX)}x${Math.round(sceneItemTransform.sourceHeight * sceneItemTransform.scaleY)}) | crop: L${sceneItemTransform.cropLeft} R${sceneItemTransform.cropRight} T${sceneItemTransform.cropTop} B${sceneItemTransform.cropBottom}`);

            sources.push({
                sourceName: item.sourceName,
                sceneItemId: item.sceneItemId,
                enabled: sceneItemEnabled,
                transform: sceneItemTransform
            });
        }

        scenes[sceneName] = { sources };
    }

    return scenes;
}

// ── Save Preset ─────────────────────────────────────────────────────────────

export async function savePreset() {
    const game = getGameSelection();
    const vendor = getVendorSelection();
    const playerCount = getPlayerCount();
    startLog('save', `${game}-obsconfig-${vendor}-${playerCount}`);

    if (!obs) {
        log('[OBS Preset] OBS not connected — cannot save');
        return { success: false, error: 'OBS not connected' };
    }

    try {
        const scenes = await snapshotAllScenes();
        const preset = {
            game,
            vendor,
            playerCount,
            savedAt: new Date().toISOString(),
            scenes
        };

        const filePath = getPresetPath(game, vendor, playerCount);
        fs.writeFileSync(filePath, JSON.stringify(preset, null, 2));
        log(`[OBS Preset] Saved: ${game}-${vendor}-${playerCount}`);
        return { success: true, file: `${game}-${vendor}-${playerCount}.json` };
    } catch (err) {
        log('[OBS Preset] Save failed:', err.message);
        return { success: false, error: err.message };
    }
}

// ── Restore Preset ──────────────────────────────────────────────────────────

export async function restorePreset(game, vendor, playerCount) {
    startLog('restore', `${game}-obsconfig-${vendor}-${playerCount}`);

    if (!obs) {
        log('[OBS Preset] OBS not connected — skipping restore');
        return;
    }

    const filePath = getPresetPath(game, vendor, playerCount);
    if (!fs.existsSync(filePath)) {
        log(`[OBS Preset] No preset for ${game}-${vendor}-${playerCount}`);
        return;
    }

    try {
        // Auto-backup current state before restoring
        const backupScenes = await snapshotAllScenes();
        if (backupScenes) {
            const now = new Date();
    const timestamp = now.getFullYear().toString() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0') + String(now.getSeconds()).padStart(2,'0');
            const backupPath = path.join(BACKUPS_DIR, `backup-${timestamp}.json`);
            fs.writeFileSync(backupPath, JSON.stringify({
                savedAt: new Date().toISOString(),
                reason: `auto-backup before restoring ${game}-${vendor}-${playerCount}`,
                scenes: backupScenes
            }, null, 2));
            log(`[OBS Preset] Backup saved: ${path.basename(backupPath)}`);
        }

        const preset = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let applied = 0;
        let skipped = 0;

        for (const [sceneName, sceneData] of Object.entries(preset.scenes)) {
            // Get all live scene items to handle duplicate source names (paste reference)
            let liveItems;
            try {
                const result = await obs.call('GetSceneItemList', { sceneName });
                liveItems = result.sceneItems;
            } catch (err) {
                log(`[OBS Preset] Skipped scene "${sceneName}": ${err.message}`);
                continue;
            }

            // Build occurrence map: sourceName → [sceneItemId, sceneItemId, ...]
            const liveOccurrences = {};
            for (const item of liveItems) {
                if (!liveOccurrences[item.sourceName]) liveOccurrences[item.sourceName] = [];
                liveOccurrences[item.sourceName].push(item.sceneItemId);
            }

            // Track which occurrence we're on per source name
            const presetOccurrenceCount = {};

            for (const source of sceneData.sources) {
                try {
                    const name = source.sourceName;
                    if (!presetOccurrenceCount[name]) presetOccurrenceCount[name] = 0;
                    const occIdx = presetOccurrenceCount[name]++;

                    const liveIds = liveOccurrences[name];
                    if (!liveIds || occIdx >= liveIds.length) {
                        log(`[OBS Preset] Skipped "${name}" (occurrence ${occIdx}) in "${sceneName}": not found`);
                        skipped++;
                        continue;
                    }
                    const sceneItemId = liveIds[occIdx];

                    // Read current state for before/after comparison
                    const { sceneItemTransform: curT } = await obs.call('GetSceneItemTransform', { sceneName, sceneItemId });
                    const { sceneItemEnabled: curE } = await obs.call('GetSceneItemEnabled', { sceneName, sceneItemId });
                    const t = source.transform;
                    const fmtT = (tr, en) => `pos (${tr.positionX}, ${tr.positionY}) | size (${Math.round((tr.sourceWidth || 0) * (tr.scaleX || 1))}x${Math.round((tr.sourceHeight || 0) * (tr.scaleY || 1))}) | crop L${tr.cropLeft} R${tr.cropRight} T${tr.cropTop} B${tr.cropBottom} | visible: ${en}`;
                    log(`[OBS Preset]   "${sceneName}" → "${name}" (occurrence ${occIdx}, id ${sceneItemId})`);
                    log(`[OBS Preset]     BEFORE: ${fmtT(curT, curE)}`);
                    log(`[OBS Preset]     AFTER:  ${fmtT(t, source.enabled)}`);

                    // Filter to only writable transform properties
                    const { sourceWidth, sourceHeight, width, height, boundsWidth, boundsHeight, ...writableTransform } = source.transform;
                    if (writableTransform.boundsType && writableTransform.boundsType !== 'OBS_BOUNDS_NONE') {
                        writableTransform.boundsWidth = boundsWidth;
                        writableTransform.boundsHeight = boundsHeight;
                    }
                    await obs.call('SetSceneItemTransform', {
                        sceneName,
                        sceneItemId,
                        sceneItemTransform: writableTransform
                    });

                    await obs.call('SetSceneItemEnabled', {
                        sceneName,
                        sceneItemId,
                        sceneItemEnabled: source.enabled
                    });

                    applied++;
                } catch (err) {
                    log(`[OBS Preset] Skipped ${source.sourceName} in "${sceneName}": ${err.message}`);
                    skipped++;
                }
            }
        }

        log(`[OBS Preset] Restored ${game}-${vendor}-${playerCount}: ${applied} applied, ${skipped} skipped`);
    } catch (err) {
        log('[OBS Preset] Restore failed:', err.message);
    }
}

// ── Connection ──────────────────────────────────────────────────────────────

async function connect() {
    obs = new OBSWebSocket();

    try {
        await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD);
        log('[OBS WebSocket] Connected');

        let pendingScene = null;

        obs.on('SceneTransitionStarted', async () => {
            try {
                const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
                pendingScene = currentProgramSceneName;
                log(`[OBS WebSocket] Transition started → target: ${pendingScene}`);
                handleSceneChange(pendingScene);
            } catch (err) {
                log('[OBS WebSocket] Error querying scene:', err.message);
            }
        });

        // Fallback: catch scene changes that don't go through transitions
        obs.on('CurrentProgramSceneChanged', (data) => {
            const sceneName = data.sceneName;
            if (sceneName === pendingScene) {
                pendingScene = null;
                return; // Already handled during transition
            }
            log(`[OBS WebSocket] Program scene changed to: ${sceneName} (fallback)`);
            handleSceneChange(sceneName);
        });

        obs.on('ConnectionClosed', () => {
            log('[OBS WebSocket] Connection closed — reconnecting...');
            scheduleReconnect();
        });

    } catch (err) {
        log(`[OBS WebSocket] Failed to connect: ${err.message}`);
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
