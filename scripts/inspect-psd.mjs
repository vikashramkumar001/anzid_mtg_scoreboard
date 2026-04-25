// One-off: dump layer names + pixel bounds from a PSD so we can derive CSS
// pixel coords for overlay elements (e.g. player icons). Usage:
//   node scripts/inspect-psd.mjs <path-to-psd>
// Run with no args to inspect both hand-left and hand-right flyquest-2v2 PSDs.
import fs from 'fs';
import {readPsd} from 'ag-psd';
// NOTE: skipping canvas init — we only need layer bounds, not bitmaps.

const DEFAULTS = [
    'public/assets/images/mtg/scoreboard/frame/mtg-scoreboard-frame-hand-left-flyquest-2v2',
    'public/assets/images/mtg/scoreboard/frame/mtg-scoreboard-frame-hand-right-flyquest-2v2',
];

function walk(layer, depth, out) {
    const pad = '  '.repeat(depth);
    const t = layer.top ?? 0;
    const l = layer.left ?? 0;
    const b = layer.bottom ?? 0;
    const r = layer.right ?? 0;
    const w = r - l;
    const h = b - t;
    const vis = layer.hidden ? ' [hidden]' : '';
    const name = layer.name ?? '<root>';
    out.push(`${pad}• ${name}${vis}  top=${t} left=${l}  ${w}×${h}  (right=${r}, bottom=${b})`);
    if (layer.children) layer.children.forEach(c => walk(c, depth + 1, out));
}

const paths = process.argv.length > 2 ? [process.argv[2]] : DEFAULTS;
for (const rel of paths) {
    const full = rel.startsWith('/') ? rel : `${process.cwd()}/${rel}`;
    if (!fs.existsSync(full)) {
        console.error(`missing: ${full}`);
        continue;
    }
    const buf = fs.readFileSync(full);
    const psd = readPsd(buf, {skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true});
    console.log(`\n=== ${rel} (${psd.width}×${psd.height}) ===`);
    const out = [];
    (psd.children || []).forEach(c => walk(c, 0, out));
    console.log(out.join('\n'));
}
