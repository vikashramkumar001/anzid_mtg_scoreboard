// Start/stop the card recognizer (card-vision/zone_watch.py) from master control.
//
// Why the server owns it rather than the operator SSH-ing in: the recognizer is
// the single most expensive thing on the box — ~1.5 cores constrained, and ~6.7
// cores if it falls back to searching all 1190 cards. On a machine encoding an
// official broadcast that difference is dropped frames, so it needs to be
// trivially switchable from the same screen everything else is driven from.
//
// Deliberately NOT persisted across restarts. A fresh server comes up with the
// recognizer OFF, because that is the safe state for a show; turning it on is
// always a deliberate act.
//
// The command is fixed — no operator input reaches the argument list.

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CV_DIR = path.join(__dirname, '../../card-vision');
const VENV_PY = path.join(CV_DIR, '.venv/bin/python3');
const SCRIPT = 'zone_watch.py';
const STATE = path.join(CV_DIR, 'state.json');
const LOG = path.join(CV_DIR, 'zone_watch.log');

let child = null;
let startedAt = null;
let lastError = null;
// The last few lines are what tells the operator whether it is constrained to a
// decklist or has fallen back to an open search — the difference that matters.
let tail = [];

const log = (m) => console.log(`[zone-watch] ${m}`);

function pushTail(chunk) {
    for (const line of String(chunk).split('\n')) {
        if (!line.trim()) continue;
        tail.push(line);
    }
    if (tail.length > 12) tail = tail.slice(-12);
}

export function zoneWatchStatus() {
    const installed = fs.existsSync(VENV_PY);
    // Read the pool mode straight out of the log lines rather than guessing.
    const poolLine = [...tail].reverse().find((l) => l.includes('pool:'));
    return {
        installed,
        running: !!child,
        pid: child?.pid || null,
        startedAt,
        uptimeMs: startedAt ? Date.now() - startedAt : 0,
        pool: poolLine ? poolLine.replace(/^\s*pool:\s*/, '').trim() : null,
        // The expensive state, called out explicitly.
        openSearch: !!poolLine && /open search/i.test(poolLine),
        lastError,
        tail: tail.slice(-6),
    };
}

export function startZoneWatch(io) {
    if (child) return { ok: true, already: true };
    if (!fs.existsSync(VENV_PY)) {
        lastError = 'recognizer not installed on this machine (card-vision/.venv missing — run deploy/install.sh)';
        return { ok: false, error: lastError };
    }
    lastError = null;
    tail = [];
    try {
        child = spawn(VENV_PY, ['-u', SCRIPT, '--interval', '1', '--out', 'state.json'], {
            cwd: CV_DIR,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (e) {
        lastError = e.message;
        child = null;
        return { ok: false, error: lastError };
    }
    startedAt = Date.now();
    const logStream = fs.createWriteStream(LOG, { flags: 'a' });
    for (const s of [child.stdout, child.stderr]) {
        s.on('data', (d) => { pushTail(d); logStream.write(d); io?.emit('zone-watch-updated', zoneWatchStatus()); });
    }
    // 'close' rather than 'exit': exit fires as soon as the process ends, while
    // its stdio may still be buffered — so the traceback we want to report has
    // not arrived yet and every failure reads as a bare exit code.
    child.on('close', (code, signal) => {
        log(`exited (code ${code}, signal ${signal})`);
        if (code && code !== 0) {
            // "exited with code 1" tells the operator nothing. The last
            // meaningful line of the traceback does — most failures here are
            // one of a few knowable things (OBS not running, wrong source
            // name, index not built), and the exception line names which.
            const cause = [...tail].reverse().find((l) => /Error|error:|Exception|refused|not found/i.test(l));
            lastError = cause ? cause.trim().slice(0, 160) : `exited with code ${code}`;
        }
        child = null; startedAt = null;
        logStream.end();
        io?.emit('zone-watch-updated', zoneWatchStatus());
    });
    log(`started pid ${child.pid}`);
    io?.emit('zone-watch-updated', zoneWatchStatus());
    return { ok: true, pid: child.pid };
}

export function stopZoneWatch(io) {
    if (!child) return { ok: true, already: true };
    const pid = child.pid;
    child.kill('SIGTERM');
    child = null; startedAt = null;
    // Clear the state file too. Leaving it frozen means the server keeps
    // broadcasting the last cards it saw, and any champion prompt that was up
    // stays up — looking live when nothing is watching.
    try { fs.writeFileSync(STATE, JSON.stringify({ updated: null, cycle: 0, cards: [] }, null, 1)); }
    catch (e) { log(`could not clear state.json: ${e.message}`); }
    log(`stopped pid ${pid}`);
    io?.emit('zone-watch-updated', zoneWatchStatus());
    return { ok: true };
}

export function initZoneWatchControl(io) {
    io.on('connection', (socket) => {
        socket.on('get-zone-watch', () => socket.emit('zone-watch-updated', zoneWatchStatus()));
        socket.on('start-zone-watch', (_p, ack) => { const r = startZoneWatch(io); if (typeof ack === 'function') ack(r); });
        socket.on('stop-zone-watch', (_p, ack) => { const r = stopZoneWatch(io); if (typeof ack === 'function') ack(r); });
    });
    // Never orphan the recognizer: if the server goes down the child must go
    // with it, or a second start later leaves two writing the same state file.
    for (const sig of ['exit', 'SIGINT', 'SIGTERM']) {
        process.on(sig, () => { if (child) child.kill('SIGTERM'); });
    }
    log(`control ready (recognizer ${fs.existsSync(VENV_PY) ? 'installed' : 'NOT installed'}; starts OFF)`);
}
