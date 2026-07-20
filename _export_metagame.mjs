import { createCanvas } from "@napi-rs/canvas";
import * as agPsd from "ag-psd";
agPsd.initializeCanvas(createCanvas);
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const PSD = process.argv[2];
const OUT = process.argv[3] || "/tmp/reskin/metagame";
mkdirSync(OUT, { recursive: true });
const psd = agPsd.readPsd(readFileSync(PSD));
const W = psd.width, H = psd.height;

const BLEND = { "normal":"source-over","multiply":"multiply","screen":"screen","overlay":"overlay","darken":"darken","lighten":"lighten","color dodge":"color-dodge","color burn":"color-burn","hard light":"hard-light","soft light":"soft-light","difference":"difference","exclusion":"exclusion","linear dodge (add)":"lighter" };

// find a group by name, recursively (groups nest under a top-level wrapper)
const G = (n) => { let f = null; const w = ls => (ls || []).forEach(l => { if (!f && l.name === n && l.children) { f = l; return; } if (l.children) w(l.children); }); w(psd.children); return f; };

function drawInto(ctx, ls, skip) {
  for (const l of (ls || [])) {
    if (l.hidden) continue;
    if (skip && skip(l)) continue;
    if (l.children) { drawInto(ctx, l.children, skip); continue; }
    if (!l.canvas) continue;
    ctx.globalAlpha = (l.opacity == null ? 1 : l.opacity);       // ag-psd opacity is 0..1
    ctx.globalCompositeOperation = BLEND[(l.blendMode || "normal").toLowerCase()] || "source-over";
    ctx.drawImage(l.canvas, l.left || 0, l.top || 0);
  }
}
// render a list of [groupName, skipFn] onto one canvas (per-group skip)
function render(specs) {
  const c = createCanvas(W, H), ctx = c.getContext("2d");
  for (const [groupName, skip] of specs) { const g = G(groupName); if (g) drawInto(ctx, g.children, skip); }
  return c;
}

// truth = the PSD's own full composite (ground-truth reference)
if (psd.canvas) writeFileSync(OUT + "/truth.png", psd.canvas.toBuffer("image/png"));
// bg (jungle) + central character, separately
writeFileSync(OUT + "/bg.png", render([["BG", null]]).toBuffer("image/png"));
writeFileSync(OUT + "/character.png", render([["Character", null]]).toBuffer("image/png"));
// frame = the 8 card FRAMES (skip per-card data: legend portrait + name + the
// TOTAL/SHARE *values*; keep the static TOTAL/SHARE labels, pills, dividers) +
// the headline + footer + foreground leaves.
const skipCardData = (l) => {
  const n = (l.name || "").toLowerCase();
  if (n.includes("sample")) return true;                                  // portrait placeholder
  if (l.text) { const t = n.replace(/copy.*/, "").trim(); return !(t.startsWith("total") || t.startsWith("share")); } // skip name + values, keep labels
  return false;
};
writeFileSync(OUT + "/frame.png", render([["Meta", skipCardData], ["Headline", null], ["Footer", null], ["Leaves & Branches", null]]).toBuffer("image/png"));

// Card-frame chrome ONLY (the 8 hextech card frames — boxes, panels, gold
// borders, corner gems, dividers, value pills, TOTAL/SHARE labels — minus the
// per-card data). Used as a pixel-perfect image so the gold chrome exactly
// matches the PSD; the dynamic data (portrait/name/values) layers over it.
// (skip the Polygon gem too — it sits ON TOP of the portrait, so it's a separate
// .mpd-hex element layered above the data, not part of the behind-data chrome.)
const skipChromeAndGem = (l) => skipCardData(l) || /^polygon/i.test(l.name || "");
writeFileSync(OUT + "/cards.png", render([["Meta", skipChromeAndGem]]).toBuffer("image/png"));

// CSS-recreation assets — the only genuinely un-CSS-able art. Everything else
// (card frames, pills, labels, divider, headline, footer text) is recreated in
// CSS. leaves = full-canvas transparent overlay (corner branches); logo =
// cropped event badge for the footer center.
writeFileSync(OUT + "/leaves.png", render([["Leaves & Branches", null]]).toBuffer("image/png"));
const findLayer = (n) => { let f = null; const w = ls => (ls || []).forEach(l => { if (!f && l.name === n && !l.children) f = l; if (l.children) w(l.children); }); w(psd.children); return f; };
const logo = findLayer("Regional Logo");
if (logo && logo.canvas) writeFileSync(OUT + "/logo.png", logo.canvas.toBuffer("image/png"));

console.log("metagame export done →", OUT, "(" + W + "x" + H + ")");
