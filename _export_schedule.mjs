// _export_schedule.mjs — schedule-scene variant of _export_scene.mjs (same
// config schema) adding two ag-psd features the stock exporter ignores and
// this PSD (RFB_Schedule_UNL.psd) depends on:
//   1. CLIPPING MASKS — "Gradient copy" clips to MasterYi, "Swirl" (op .75)
//      clips to the right-rail "Rectangle 10 copy 2". A run of consecutive
//      clipping layers composites onto its base via source-atop, then the
//      result draws with the base's own blend/opacity (Photoshop's default
//      "blend clipped layers as group").
//   2. LAYER (raster) MASKS — "Bolts" has a default-0 mask that confines it
//      to a small top-right patch; the Leaves/Swirl masks shape their edges.
//      Mask canvas is grayscale; alpha = pixelAlpha * gray/255, with
//      mask.defaultColor filling outside the mask canvas bounds.
import { createCanvas } from "@napi-rs/canvas";
import * as agPsd from "ag-psd";
agPsd.initializeCanvas(createCanvas);
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const [PSD, OUT, CFG] = process.argv.slice(2);
if (!PSD || !OUT || !CFG) { console.error("usage: node _export_schedule.mjs <psd> <outdir> <config.json>"); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const cfg = JSON.parse(readFileSync(CFG, "utf8"));
const psd = agPsd.readPsd(readFileSync(PSD));
const crop = cfg.crop || { x: 0, y: 0, w: psd.width, h: psd.height };

const BLEND = { "normal":"source-over","multiply":"multiply","screen":"screen","overlay":"overlay","darken":"darken","lighten":"lighten","color dodge":"color-dodge","color burn":"color-burn","hard light":"hard-light","soft light":"soft-light","difference":"difference","exclusion":"exclusion","linear dodge (add)":"lighter" };

const G = (n) => { let f = null; const w = ls => (ls || []).forEach(l => { if (!f && l.name === n && l.children) { f = l; return; } if (l.children) w(l.children); }); w(psd.children); return f; };

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

// Layer pixels in crop space with its raster mask applied. Returns null if no pixels.
function layerToCropCanvas(l) {
  if (!l.canvas) return null;
  const c = createCanvas(crop.w, crop.h), ctx = c.getContext("2d");
  ctx.translate(-crop.x, -crop.y);
  ctx.drawImage(l.canvas, l.left || 0, l.top || 0);
  const m = l.mask;
  if (m && m.canvas && !m.disabled) {
    const mc = createCanvas(crop.w, crop.h), mctx = mc.getContext("2d");
    const def = m.defaultColor !== undefined ? m.defaultColor : 255;
    mctx.fillStyle = `rgb(${def},${def},${def})`;
    mctx.fillRect(0, 0, crop.w, crop.h);
    mctx.translate(-crop.x, -crop.y);
    mctx.drawImage(m.canvas, m.left || 0, m.top || 0);
    const img = ctx.getImageData(0, 0, crop.w, crop.h);
    const msk = mctx.getImageData(0, 0, crop.w, crop.h);
    const a = img.data, g = msk.data;
    for (let i = 0; i < a.length; i += 4) a[i + 3] = (a[i + 3] * g[i]) / 255;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, crop.w, crop.h);
    ctx.putImageData(img, 0, 0);
    ctx.restore();
  }
  return c;
}

function compositeLayer(ctx, cropCanvas, opacity, blendMode) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = opacity == null ? 1 : opacity;
  ctx.globalCompositeOperation = BLEND[(blendMode || "normal").toLowerCase()] || "source-over";
  ctx.drawImage(cropCanvas, 0, 0);
  ctx.restore();
}

function drawInto(ctx, ls, skip, ignoreHidden) {
  // Pre-filter to visible/unskipped so clip runs group correctly.
  const arr = (ls || []).filter(l => (!l.hidden || ignoreHidden) && !(skip && skip(l)));
  for (let i = 0; i < arr.length; i++) {
    const l = arr[i];
    if (l.children) { drawInto(ctx, l.children, skip, ignoreHidden); continue; }
    const base = layerToCropCanvas(l);
    if (!base) continue;
    // Collect the run of clipping layers sitting directly above this base.
    const clips = [];
    if (!l.clipping) {
      let j = i + 1;
      while (j < arr.length && !arr[j].children && arr[j].clipping) { clips.push(arr[j]); j++; }
      i = j - 1;
    }
    const bctx = base.getContext("2d");
    for (const c of clips) {
      const cc = layerToCropCanvas(c);
      if (!cc) continue;
      const bm = (c.blendMode || "normal").toLowerCase();
      if (bm !== "normal") console.warn(`  !! clip layer "${c.name}" blend ${bm} approximated as normal`);
      bctx.globalAlpha = c.opacity == null ? 1 : c.opacity;
      bctx.globalCompositeOperation = "source-atop";
      bctx.drawImage(cc, 0, 0);
      console.log(`     clip "${c.name}" -> base "${l.name}"`);
    }
    compositeLayer(ctx, base, l.opacity, l.blendMode);
  }
}

function renderOutput(out) {
  const c = createCanvas(crop.w, crop.h), ctx = c.getContext("2d");
  for (const spec of (out.groups || [])) {
    const g = G(spec.name);
    if (!g) { console.warn(`  !! group not found: ${spec.name}`); continue; }
    let children = g.children;
    if (spec.only) children = children.filter(ch => spec.only.includes(ch.name));
    drawInto(ctx, children, makeSkip(spec), !!spec.ignoreHidden);
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
