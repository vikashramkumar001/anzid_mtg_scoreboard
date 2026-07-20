import { createCanvas } from "@napi-rs/canvas";
import * as agPsd from "ag-psd";
agPsd.initializeCanvas(createCanvas);
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const PSD = process.argv[2];
const OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const psd = agPsd.readPsd(readFileSync(PSD));
const W = psd.width, H = psd.height;

// PSD blend mode -> canvas globalCompositeOperation
const BLEND = {
  "normal": "source-over", "multiply": "multiply", "screen": "screen", "overlay": "overlay",
  "darken": "darken", "lighten": "lighten", "color dodge": "color-dodge", "color burn": "color-burn",
  "hard light": "hard-light", "soft light": "soft-light", "difference": "difference", "exclusion": "exclusion",
  "linear dodge (add)": "lighter", "hue": "hue", "saturation": "saturation", "color": "color", "luminosity": "luminosity"
};

function composite(groups, skip) {
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  const draw = (ls) => {
    for (const l of (ls || [])) {
      if (l.hidden) continue;
      if (skip && skip(l)) continue;
      if (l.children) { draw(l.children); continue; }
      if (!l.canvas) continue;
      ctx.globalAlpha = (l.opacity == null ? 1 : l.opacity); // ag-psd opacity is 0..1
      ctx.globalCompositeOperation = BLEND[(l.blendMode || "normal").toLowerCase()] || "source-over";
      ctx.drawImage(l.canvas, l.left || 0, l.top || 0);
    }
  };
  for (const g of groups) if (g) draw(g.children);
  return c;
}

// Groups live under a top-level "RFB_Standings_UNL" wrapper — find by name recursively.
function G(name) {
  let found = null;
  const walk = (ls) => { for (const l of (ls || [])) { if (!found && l.name === name && l.children) { found = l; return; } if (l.children) walk(l.children); } };
  walk(psd.children);
  return found;
}

writeFileSync(OUT + "/bg.png", composite([G("BG")]).toBuffer("image/png"));
writeFileSync(OUT + "/char.png", composite([G("Character")]).toBuffer("image/png"));
// frame = footer + table chrome (row bars + gold pills) + foreground leaves,
// MINUS all table TEXT (column headers AND row data) — the page renders those
// as DOM. Footer branding (y>900) stays baked. Skip text in the table band.
const isTableText = (l) => !!l.text && (l.top || 0) >= 100 && (l.top || 0) <= 900;
writeFileSync(OUT + "/frame.png", composite([G("Footer"), G("Leaderboard"), G("Leaves & Branches")], isTableText).toBuffer("image/png"));

// base = bg + character glow MINUS the static Poppy (for compositing the animated Poppy on top)
writeFileSync(OUT + "/base.png", composite([G("BG"), G("Character")], l => l.name === "Poppy").toBuffer("image/png"));
// gradient = just the character glow on transparent (overlay between an ANIMATED bg and Poppy)
writeFileSync(OUT + "/gradient.png", composite([G("Character")], l => l.name === "Poppy").toBuffer("image/png"));

console.log("exported bg.png, char.png, frame.png, base.png, gradient.png to", OUT);
