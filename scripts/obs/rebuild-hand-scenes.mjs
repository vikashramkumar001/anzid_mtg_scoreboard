// Rebuild the 4 "Match N - Live + Hand {Red,Blue}" OBS scenes so each mirrors
// its "Match N - Live + Card Overlay" scene, with the gameplay camera swapped
// for the corresponding hand camera (same transform / crop / scale).
//
// WHY a script: OBS preset restore only repositions EXISTING scene items — it
// cannot add/remove sources. Making the hand scenes' source list match the
// card-overlay's is a structural change that must go through OBS directly.
//
// RUN ON THE MACHINE WHERE OBS IS RUNNING (connects to ws://localhost:4455).
//   node scripts/obs/rebuild-hand-scenes.mjs            # DRY RUN (prints plan, no changes)
//   node scripts/obs/rebuild-hand-scenes.mjs --apply    # actually rebuild
// Override connection: OBS_WS_URL / OBS_WS_PASSWORD env vars.
//
// SAFE ORDERING: for each scene it ADDS the new (card-overlay-mirrored) items
// first, then REMOVES the old ones — so a mid-run failure leaves the scene with
// its old items intact (worst case: old + new duplicates), never empty.
// Idempotent: re-running produces the same result (old set is fully replaced).
//
// After running, restore each vendor's preset (master-control → Load OBS Preset)
// to apply that vendor's per-hand-scene positioning — the preset JSONs were
// updated in lockstep with this script (data/obs exports/riftbound-obsconfig-*-1v1.json).
import OBSWebSocket from 'obs-websocket-js';

const OBS_WS_URL = process.env.OBS_WS_URL || 'ws://localhost:4455';
const OBS_WS_PASSWORD = process.env.OBS_WS_PASSWORD || 'RRWtUPVpGf6myRvx';
const APPLY = process.argv.includes('--apply');

const COMBOS = [[1, 'Red'], [1, 'Blue'], [2, 'Red'], [2, 'Blue']];
const cardScene = (m) => `Match ${m} - Live + Card Overlay`;     // no asterisk = template
const handScene = (m, s) => `Match ${m} - Live + Hand ${s}`;
const gpCam = (m) => `Camera - Match ${m} Gameplay`;
const handCam = (m, s) => `Camera - Match ${m} Hand ${s}`;

// keep only writable transform props (mirrors features/obs-websocket.js applyScenes)
function writableTransform(t) {
  const { sourceWidth, sourceHeight, width, height, boundsWidth, boundsHeight, ...w } = t;
  if (w.boundsType && w.boundsType !== 'OBS_BOUNDS_NONE') { w.boundsWidth = boundsWidth; w.boundsHeight = boundsHeight; }
  return w;
}

const obs = new OBSWebSocket();

async function itemsOf(sceneName) {
  const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
  // GetSceneItemList (OBS WS v5) returns transform/enabled/locked/blend/index inline.
  return sceneItems.sort((a, b) => a.sceneItemIndex - b.sceneItemIndex);
}

async function rebuildOne(m, side) {
  const card = cardScene(m), hand = handScene(m, side), gp = gpCam(m), hc = handCam(m, side);
  const template = await itemsOf(card);
  const existing = await itemsOf(hand);

  // Build the planned source list (card-overlay order, gameplay → hand cam)
  const plan = template.map((it) => ({
    from: it.sourceName,
    sourceName: it.sourceName === gp ? hc : it.sourceName,
    enabled: it.sceneItemEnabled,
    locked: it.sceneItemLocked,
    blendMode: it.sceneItemBlendMode,
    index: it.sceneItemIndex,
    transform: it.sceneItemTransform,
  }));
  const swapped = plan.filter((p) => p.from === gp).length;

  console.log(`\n■ ${hand}  ⟵ clone of "${card}"`);
  console.log(`   current: ${existing.length} sources: ${existing.map((i) => i.sourceName).join(', ')}`);
  console.log(`   target : ${plan.length} sources: ${plan.map((p) => (p.sourceName === hc ? `**${p.sourceName}**` : p.sourceName)).join(', ')}`);
  if (swapped !== 1) { console.log(`   ⚠ expected exactly 1 "${gp}" in the template, found ${swapped} — SKIPPING this scene`); return; }
  const t = plan.find((p) => p.sourceName === hc).transform;
  console.log(`   ${hc} transform: pos(${t.positionX},${t.positionY}) crop L${t.cropLeft} R${t.cropRight} T${t.cropTop} B${t.cropBottom} scale(${t.scaleX.toFixed(3)},${t.scaleY.toFixed(3)})`);

  if (!APPLY) { console.log('   (dry run — no changes)'); return; }

  // 1) ADD the new items first (scene temporarily holds old + new)
  const created = [];
  for (const p of plan) {
    const { sceneItemId } = await obs.call('CreateSceneItem', { sceneName: hand, sourceName: p.sourceName, sceneItemEnabled: p.enabled });
    await obs.call('SetSceneItemTransform', { sceneName: hand, sceneItemId, sceneItemTransform: writableTransform(p.transform) });
    try { await obs.call('SetSceneItemLocked', { sceneName: hand, sceneItemId, sceneItemLocked: !!p.locked }); } catch {}
    if (p.blendMode) { try { await obs.call('SetSceneItemBlendMode', { sceneName: hand, sceneItemId, sceneItemBlendMode: p.blendMode }); } catch {} }
    created.push({ sceneItemId, index: p.index });
  }
  // 2) REMOVE the old items
  for (const it of existing) await obs.call('RemoveSceneItem', { sceneName: hand, sceneItemId: it.sceneItemId });
  // 3) Set final z-order (index) on the new items now that the old ones are gone
  for (const c of created.sort((a, b) => a.index - b.index)) {
    try { await obs.call('SetSceneItemIndex', { sceneName: hand, sceneItemId: c.sceneItemId, sceneItemIndex: c.index }); } catch {}
  }
  console.log(`   ✓ rebuilt (${plan.length} sources)`);
}

(async () => {
  console.log(`OBS rebuild-hand-scenes — ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no changes; pass --apply to write)'}`);
  await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD);
  const { obsVersion } = await obs.call('GetVersion');
  console.log(`connected to OBS ${obsVersion} @ ${OBS_WS_URL}`);
  for (const [m, s] of COMBOS) {
    try { await rebuildOne(m, s); }
    catch (e) { console.error(`   ✗ ${handScene(m, s)}: ${e.message}`); }
  }
  await obs.disconnect();
  console.log(`\nDone.${APPLY ? ' Now restore each vendor preset to apply per-vendor positioning.' : ' Re-run with --apply to write changes.'}`);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
