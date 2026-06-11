import OBSWebSocket from 'obs-websocket-js';

const obs = new OBSWebSocket();
try {
    await obs.connect('ws://localhost:4455', 'RRWtUPVpGf6myRvx');

    const list = await obs.call('GetSceneTransitionList');
    const originallyActive = list.currentSceneTransitionName;

    console.log(`\nRaw list count: ${list.transitions.length}`);
    console.log(`Currently active: "${originallyActive}"\n`);

    // Show raw list with UUIDs to see if duplicate names are real
    console.log('Raw list with UUIDs:');
    console.log('─'.repeat(110));
    for (const t of list.transitions) {
        console.log(`  "${t.transitionName}"`.padEnd(45) + `${t.transitionKind}`.padEnd(32) + `uuid=${t.transitionUuid}`);
    }
    console.log('─'.repeat(110));

    // Dedupe by UUID — UUID is the actual identity. Some OBS profiles
    // end up reporting the same transition multiple times in the list,
    // or have duplicate-named transitions that share underlying state.
    const seen = new Set();
    const unique = list.transitions.filter(t => {
        if (seen.has(t.transitionUuid)) return false;
        seen.add(t.transitionUuid);
        return true;
    });

    console.log(`\n${unique.length} unique transitions (deduped by UUID):\n`);
    console.log('─'.repeat(110));

    for (const t of unique) {
        try {
            await obs.call('SetCurrentSceneTransition', { transitionName: t.transitionName });
            // Wait for OBS to actually settle on the new transition.
            // SetCurrentSceneTransition resolves before OBS finishes
            // applying it, and GetCurrentSceneTransition can race —
            // poll until the active name matches what we just set.
            let cur = null;
            for (let attempts = 0; attempts < 10; attempts++) {
                cur = await obs.call('GetCurrentSceneTransition');
                if (cur.transitionName === t.transitionName) break;
                await new Promise(r => setTimeout(r, 50));
            }
            if (!cur || cur.transitionName !== t.transitionName) {
                console.log(`  "${t.transitionName}" — switch never settled (got "${cur?.transitionName}")`);
                continue;
            }
            const s = cur.transitionSettings ?? {};
            const isStinger = t.transitionKind === 'obs_stinger_transition';
            const tpType = s.tp_type === 1 ? 'frame' : 'time';
            const tp = s.tp_type === 1 ? `${s.transition_point_frame ?? 0}fr` : `${s.transition_point ?? 0}ms`;
            const path = s.path ? s.path.split('/').pop() : '';
            const star = t.transitionName === originallyActive ? '★ ' : '  ';

            if (isStinger) {
                console.log(
                    `${star}"${t.transitionName}"`.padEnd(45) +
                    `kind=${t.transitionKind}`.padEnd(32) +
                    `tp(${tpType})=${tp}`.padEnd(20) +
                    `dur=${cur.transitionDuration}ms`.padEnd(15) +
                    `video=${path}`
                );
            } else {
                console.log(
                    `${star}"${t.transitionName}"`.padEnd(45) +
                    `kind=${t.transitionKind}`.padEnd(32) +
                    `dur=${cur.transitionDuration}ms`
                );
            }
        } catch (err) {
            console.log(`  "${t.transitionName}" — error: ${err.message}`);
        }
    }
    console.log('─'.repeat(110));
    console.log('★ = currently active\n');

    await obs.call('SetCurrentSceneTransition', { transitionName: originallyActive });
    await obs.disconnect();
    process.exit(0);
} catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
}
