#!/usr/bin/env node
// Grab N sequential frames of one OBS source: node grab_frames.mjs <ws-url> <source> [n] [ms]
import OBSWebSocket from 'obs-websocket-js';
import fs from 'fs';
import { fileURLToPath } from 'url';

const [url, source, nStr, msStr] = process.argv.slice(2);
const n = parseInt(nStr || '4', 10), ms = parseInt(msStr || '1200', 10);
const obs = new OBSWebSocket();
await obs.connect(url, 'RRWtUPVpGf6myRvx');
for (let k = 0; k < n; k++) {
    const shot = await obs.call('GetSourceScreenshot', { sourceName: source, imageFormat: 'png' });
    const out = fileURLToPath(new URL(`./samples/live_seq_${k}.png`, import.meta.url));
    fs.writeFileSync(out, Buffer.from(shot.imageData.split(',')[1], 'base64'));
    console.log(`frame ${k} saved`);
    if (k < n - 1) await new Promise(r => setTimeout(r, ms));
}
await obs.disconnect();
