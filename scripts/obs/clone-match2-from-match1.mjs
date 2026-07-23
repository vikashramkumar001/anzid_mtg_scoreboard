// Make the Match 2 scenes mirror the Match 1 scenes, substituting "Match 1"
// sources for their "Match 2" equivalents. Fixes Match 2 having drifted to a
// 2v2-style camera layout — it should be a 1v1 clone of Match 1 with match-2
// cameras.
//
// For each of: "Card Overlay", "Hand Red", "Hand Blue":
//   Match 2 - Live + <type>  ⟵  Match 1 - Live + <type>
//   every source name containing "Match 1" → "Match 2" (transforms/visibility/
//   z-order/blend copied verbatim; shared sources like Audio-Ingest, Commentator,
//   Sponsors are kept as-is).
//
// RUN ON THE MACHINE WHERE OBS IS RUNNING (ws://localhost:4455).
//   node scripts/obs/clone-match2-from-match1.mjs            # DRY RUN
//   node scripts/obs/clone-match2-from-match1.mjs --apply    # write changes
// Same add-new-then-remove-old ordering as rebuild-hand-scenes.mjs (never empties
// a scene on failure). Idempotent.
import OBSWebSocket from 'obs-websocket-js';

const OBS_WS_URL = process.env.OBS_WS_URL || 'ws://localhost:4455';
const OBS_WS_PASSWORD = process.env.OBS_WS_PASSWORD || 'RRWtUPVpGf6myRvx';
const APPLY = process.argv.includes('--apply');
const TYPES = ['Card Overlay', 'Hand Red', 'Hand Blue'];

function writableTransform(t) {
  const { sourceWidth, sourceHeight, width, height, boundsWidth, boundsHeight, ...w } = t;
  if (w.boundsType && w.boundsType !== 'OBS_BOUNDS_NONE') { w.boundsWidth = boundsWidth; w.boundsHeight = boundsHeight; }
  return w;
}

const obs = new OBSWebSocket();
const itemsOf = async (sceneName) =>
  (await obs.call('GetSceneItemList', { sceneName })).sceneItems.sort((a, b) => a.sceneItemIndex - b.sceneItemIndex);

async function cloneOne(type, existingNames) {
  const src = `Match 1 - Live + ${type}`, dst = `Match 2 - Live + ${type}`;
  const template = await itemsOf(src);
  const current = await itemsOf(dst);

  const plan = template.map((it) => ({
    from: it.sourceName,
    sourceName: it.sourceName.replace('Match 1', 'Match 2'),
    enabled: it.sceneItemEnabled,
    locked: it.sceneItemLocked,
    blendMode: it.sceneItemBlendMode,
    index: it.sceneItemIndex,
    transform: it.sceneItemTransform,
  }));
  const missing = plan.map((p) => p.sourceName).filter((n) => !existingNames.has(n));

  console.log(`\n■ ${dst}  ⟵ clone of "${src}"`);
  console.log(`   current: ${current.map((i) => i.sourceName).join(', ')}`);
  console.log(`   target : ${plan.map((p) => (p.from !== p.sourceName ? `${p.sourceName}` : `${p.sourceName}(shared)`)).join(', ')}`);
  if (missing.length) { console.log(`   ⚠ missing sources, SKIPPING: ${missing.join(', ')}`); return; }
  if (!APPLY) { console.log('   (dry run — no changes)'); return; }

  const created = [];
  for (const p of plan) {
    const { sceneItemId } = await obs.call('CreateSceneItem', { sceneName: dst, sourceName: p.sourceName, sceneItemEnabled: p.enabled });
    await obs.call('SetSceneItemTransform', { sceneName: dst, sceneItemId, sceneItemTransform: writableTransform(p.transform) });
    try { await obs.call('SetSceneItemLocked', { sceneName: dst, sceneItemId, sceneItemLocked: !!p.locked }); } catch {}
    if (p.blendMode) { try { await obs.call('SetSceneItemBlendMode', { sceneName: dst, sceneItemId, sceneItemBlendMode: p.blendMode }); } catch {} }
    created.push({ sceneItemId, index: p.index });
  }
  for (const it of current) await obs.call('RemoveSceneItem', { sceneName: dst, sceneItemId: it.sceneItemId });
  for (const c of created.sort((a, b) => a.index - b.index)) {
    try { await obs.call('SetSceneItemIndex', { sceneName: dst, sceneItemId: c.sceneItemId, sceneItemIndex: c.index }); } catch {}
  }
  console.log(`   ✓ cloned (${plan.length} sources)`);
}

(async () => {
  console.log(`clone-match2-from-match1 — ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);
  await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD);
  const { obsVersion } = await obs.call('GetVersion');
  const scenes = (await obs.call('GetSceneList')).scenes.map((s) => s.sceneName);
  const inputs = (await obs.call('GetInputList')).inputs.map((i) => i.inputName);
  const existingNames = new Set([...scenes, ...inputs]);
  const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
  console.log(`connected to OBS ${obsVersion} | program scene: ${currentProgramSceneName}`);
  if (/Match 2 - Live \+ (Card Overlay|Hand Red|Hand Blue)$/.test(currentProgramSceneName) && APPLY) {
    console.error('REFUSING: a target Match 2 scene is currently ON PROGRAM. Switch away first.'); await obs.disconnect(); process.exit(1);
  }
  for (const type of TYPES) { try { await cloneOne(type, existingNames); } catch (e) { console.error(`   ✗ ${type}: ${e.message}`); } }
  await obs.disconnect();
  console.log(`\nDone.${APPLY ? '' : ' Re-run with --apply to write.'}`);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
