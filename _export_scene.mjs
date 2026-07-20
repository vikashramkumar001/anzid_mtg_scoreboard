// Generic UNLEASHED-scene PSD exporter — parameterized generalization of
// _export_metagame.mjs / _export_standings.mjs. Renders named layer GROUPS
// (with per-group skip rules) to PNGs for the broadcast reskin pages.
//
//   node _export_scene.mjs <psd-path> <out-dir> <config.json>
//
// config.json shape:
// {
//   "crop": {"x":0, "y":1180, "w":1920, "h":1080},   // optional viewport (e.g. Most Played Cards stacked variants)
//   "truth": true,                                    // write truth.png from the PSD's own composite
//   "outputs": [
//     { "file": "frame.png",
//       "groups": [
//         { "name": "Boxes",              // group name (found recursively; a hidden group still renders — its CHILDREN's hidden flags are respected)
//           "ignoreHidden": false,         // true = render even hidden descendants (careful: shows alternates)
//           "only": ["Match_1", ...],      // optional: render only these direct children
//           "skip": { "text": true,        // skip ALL text layers in the group…
//                     "names": ["Sample"], // …skip layers whose name contains any of these (case-insensitive)
//                     "regex": "^polygon" },
//           "keepTextRegex": "^(total|share)"  // …except text layers matching this (overrides skip.text)
//         }
//       ] },
//     { "file": "logo.png", "layer": "Regional Logo" }   // single-layer extract at native bounds (bounds logged)
//   ]
// }
//
// NOTE: ag-psd layer opacity is ALREADY 0..1 — never divide by 255 (the bug that
// once made every export blank-white).
import { createCanvas } from "@napi-rs/canvas";
import * as agPsd from "ag-psd";
agPsd.initializeCanvas(createCanvas);
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const [PSD, OUT, CFG] = process.argv.slice(2);
if (!PSD || !OUT || !CFG) { console.error("usage: node _export_scene.mjs <psd> <outdir> <config.json>"); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const cfg = JSON.parse(readFileSync(CFG, "utf8"));
const psd = agPsd.readPsd(readFileSync(PSD));
const crop = cfg.crop || { x: 0, y: 0, w: psd.width, h: psd.height };

const BLEND = { "normal":"source-over","multiply":"multiply","screen":"screen","overlay":"overlay","darken":"darken","lighten":"lighten","color dodge":"color-dodge","color burn":"color-burn","hard light":"hard-light","soft light":"soft-light","difference":"difference","exclusion":"exclusion","linear dodge (add)":"lighter" };

// find a group by name, recursively (groups nest under a top-level wrapper)
const G = (n) => { let f = null; const w = ls => (ls || []).forEach(l => { if (!f && l.name === n && l.children) { f = l; return; } if (l.children) w(l.children); }); w(psd.children); return f; };
const findLayer = (n) => { let f = null; const w = ls => (ls || []).forEach(l => { if (!f && l.name === n && !l.children) f = l; if (l.children) w(l.children); }); w(psd.children); return f; };

function makeSkip(spec) {
  if (!spec) return null;
  const s = spec.skip || {};
  const names = (s.names || []).map(x => x.toLowerCase());
  const rx = s.regex ? new RegExp(s.regex, "i") : null;
  const keepRx = spec.keepTextRegex ? new RegExp(spec.keepTextRegex, "i") : null;
  return (l) => {
    const n = (l.name || "").toLowerCase();
    if (keepRx && l.text && keepRx.test(n)) return false;
    if (s.text && l.text) return true;
    if (names.some(x => n.includes(x))) return true;
    if (rx && rx.test(l.name || "")) return true;
    return false;
  };
}

function drawInto(ctx, ls, skip, ignoreHidden) {
  for (const l of (ls || [])) {
    if (l.hidden && !ignoreHidden) continue;
    if (skip && skip(l)) continue;
    if (l.children) { drawInto(ctx, l.children, skip, ignoreHidden); continue; }
    if (!l.canvas) continue;
    ctx.globalAlpha = (l.opacity == null ? 1 : l.opacity);       // ag-psd opacity is 0..1
    ctx.globalCompositeOperation = BLEND[(l.blendMode || "normal").toLowerCase()] || "source-over";
    ctx.drawImage(l.canvas, l.left || 0, l.top || 0);
  }
}

function renderOutput(out) {
  if (out.layer) {                                    // single-layer extract at native bounds
    const l = findLayer(out.layer);
    if (!l || !l.canvas) { console.warn(`  !! layer not found: ${out.layer}`); return; }
    writeFileSync(`${OUT}/${out.file}`, l.canvas.toBuffer("image/png"));
    console.log(`  ${out.file}  (layer "${out.layer}" @ ${l.left},${l.top} ${l.canvas.width}x${l.canvas.height})`);
    return;
  }
  const c = createCanvas(crop.w, crop.h), ctx = c.getContext("2d");
  ctx.translate(-crop.x, -crop.y);
  for (const spec of (out.groups || [])) {
    const g = G(spec.name);
    if (!g) { console.warn(`  !! group not found: ${spec.name}`); continue; }
    let children = g.children;
    if (spec.only) children = children.filter(ch => spec.only.includes(ch.name));
    drawInto(ctx, children, makeSkip(spec), !!spec.ignoreHidden);   // note: g's OWN hidden flag is ignored by design
  }
  writeFileSync(`${OUT}/${out.file}`, c.toBuffer("image/png"));
  console.log(`  ${out.file}`);
}

console.log(`export ${PSD.split("/").pop()} (${psd.width}x${psd.height}) crop ${crop.x},${crop.y} ${crop.w}x${crop.h} → ${OUT}`);
if (cfg.truth && psd.canvas) {
  const c = createCanvas(crop.w, crop.h), ctx = c.getContext("2d");
  ctx.drawImage(psd.canvas, -crop.x, -crop.y);
  writeFileSync(`${OUT}/truth.png`, c.toBuffer("image/png"));
  console.log("  truth.png");
}
for (const out of (cfg.outputs || [])) renderOutput(out);
console.log("done");
