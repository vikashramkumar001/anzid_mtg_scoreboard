import fs from 'fs';
import {readPsd} from 'ag-psd';

const path = process.argv[2];
if (!path) { console.error('usage: node inspect-psb.mjs <path>'); process.exit(1); }
const stat = fs.statSync(path);
console.error(`Reading ${(stat.size / 1024 / 1024 / 1024).toFixed(2)} GB...`);
const buf = Buffer.allocUnsafe(stat.size);
const fd = fs.openSync(path, 'r');
const CHUNK = 256 * 1024 * 1024;
let pos = 0;
while (pos < stat.size) {
    const len = Math.min(CHUNK, stat.size - pos);
    fs.readSync(fd, buf, pos, len, pos);
    pos += len;
    process.stderr.write(`\r  ${(pos / stat.size * 100).toFixed(1)}%`);
}
fs.closeSync(fd);
process.stderr.write('\n');
console.error('Parsing PSB...');
const psd = readPsd(buf, {skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true});
console.log(`canvas: ${psd.width}×${psd.height}`);
function walk(layer, depth, filter) {
    const t = layer.top ?? 0, l = layer.left ?? 0, b = layer.bottom ?? 0, r = layer.right ?? 0;
    const w = r - l, h = b - t;
    const name = layer.name ?? '<root>';
    const fullPath = filter || name;
    if (!filter || fullPath.toLowerCase().includes('standing') || fullPath.toLowerCase().includes('010')) {
        const pad = '  '.repeat(depth);
        const vis = layer.hidden ? ' [hidden]' : '';
        console.log(`${pad}• ${name}${vis}  top=${t} left=${l}  ${w}×${h}  (right=${r}, bottom=${b})`);
    }
    if (layer.children) layer.children.forEach(c => walk(c, depth + 1, fullPath));
}
(psd.children || []).forEach(c => walk(c, 0, ''));
