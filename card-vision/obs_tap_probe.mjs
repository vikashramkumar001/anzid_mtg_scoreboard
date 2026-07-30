#!/usr/bin/env node
// Probe: can we pull a native-4K screenshot of the overhead cam source from OBS
// while the canvas stays 1080p? Lists all inputs + resolutions, then saves a
// full-res grab of the biggest video source (or the one named on argv).
import OBSWebSocket from 'obs-websocket-js';
import fs from 'fs';
import { fileURLToPath } from 'url';

const obs = new OBSWebSocket();
// usage: node obs_tap_probe.mjs [ws-url] [sourceName]
const url = process.argv[2] || 'ws://localhost:4455';
const wanted = process.argv[3] || null;

try {
    await obs.connect(url, 'RRWtUPVpGf6myRvx');
} catch (e) {
    console.error(`OBS not reachable on ${url} —`, e.message);
    process.exit(2);
}

const { baseWidth, baseHeight, outputWidth, outputHeight } =
    await obs.call('GetVideoSettings');
console.log(`canvas ${baseWidth}x${baseHeight} | output ${outputWidth}x${outputHeight}\n`);

const { inputs } = await obs.call('GetInputList');
const vids = [];
for (const inp of inputs) {
    // width/height come from the source's active video; probe via a tiny screenshot
    try {
        const shot = await obs.call('GetSourceScreenshot', {
            sourceName: inp.inputName, imageFormat: 'jpg', imageWidth: 32, imageHeight: 32,
        });
        if (shot.imageData) vids.push(inp.inputName);
    } catch { /* not a video-producing input */ }
}

console.log('video-producing inputs:');
const dims = {};
for (const name of vids) {
    // native size: request with no imageWidth/Height -> source render size
    try {
        const shot = await obs.call('GetSourceScreenshot', { sourceName: name, imageFormat: 'png' });
        const buf = Buffer.from(shot.imageData.split(',')[1], 'base64');
        // PNG IHDR: width @16..20, height @20..24
        const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
        dims[name] = { w, h, buf };
        console.log(`  ${name.padEnd(40)} ${w}x${h}`);
    } catch (e) {
        console.log(`  ${name.padEnd(40)} (screenshot failed: ${e.message})`);
    }
}

const pick = wanted && dims[wanted] ? wanted
    : Object.entries(dims).sort((a, b) => b[1].w * b[1].h - a[1].w * a[1].h)[0]?.[0];
if (!pick) { console.error('no capturable video source found'); process.exit(1); }

const out = fileURLToPath(new URL('./samples/obs_tap_grab.png', import.meta.url));
fs.writeFileSync(out, dims[pick].buf);
console.log(`\nsaved full-res grab of "${pick}" (${dims[pick].w}x${dims[pick].h}) -> ${out}`);
await obs.disconnect();
