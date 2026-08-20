# Card Vision — Go-Live Runbook

Two surfaces tomorrow:
- **On-stream overlay** (all viewers): OBS browser source rendering confirmed
  cards over the gameplay camera. No Twitch dependencies.
- **Twitch extension, Hosted Test** (you + allowlisted testers): the real hover
  overlay. Public release for all viewers requires Twitch review — submit
  ASAP; typical turnaround is days, not hours.

## T-1 day (tonight)

- [ ] Deploy to the ingest box: `git pull`, `npm install`, restart the Node
      server, then `cd card-vision && bash deploy/install.sh` and install the
      LaunchAgent (full steps in `deploy/DEPLOY.md`). The index build takes
      ~1 min; the venv install a few minutes.
- [ ] Register the extension (Twitch dev console) — walkthrough in
      `twitch-extension/README.md`. Put the three values in the repo `.env`
      on the INGEST box: `TWITCH_EXT_CLIENT_ID`, `TWITCH_EXT_SECRET`,
      `TWITCH_BROADCASTER_ID`. Restart the Node server after.
- [ ] Upload the extension assets for **Hosted Test** (zip the
      twitch-extension dir contents; run `node build-cards-json.mjs` first)
      and add tester usernames (mods/regulars) to the allowlist.
- [ ] **Submit for review** (so "everyone on the channel" gets it as soon as
      Twitch approves): no external hosts are required by the v1 build —
      leave `IMAGE_BASE` empty (text-only card panel) to keep review simple.

## T-0, pre-show (≈30 min before)

- [ ] Overhead camera ON before anything else (it feeds everything).
- [ ] Framing + lighting check:
      `cd card-vision && .venv/bin/python3 roi_check.py`
      → brightness should say GOOD (≥50); every card area inside the yellow
      ROI box. If the framing moved, pass the corrected `--roi` to the loop
      (and the LaunchAgent plist if permanent).
- [ ] Loop running: `launchctl kickstart -k gui/$UID/com.anzid.cardvision`
      (or check `tail -f card-vision/logs/loop.log`). Table should be EMPTY
      at start — cards are picked up as they're played (~3–8s each).
- [ ] Operator page up: `http://localhost:1378/html/card-vision-test.html`
      (shows everything incl. pending/covered — this is YOUR monitor).
- [ ] OBS: add a Browser source to the program scene (top of the stack),
      URL `http://localhost:1378/html/card-vision-overlay.html`,
      1920x1080, transparent. It renders ONLY confirmed cards and only when
      the gameplay source is in the program scene (break slides = empty).
- [ ] Extension delay sync: place a card, time the gap between it appearing
      on the operator page vs. in the Twitch player preview. Set
      `CARD_VISION_DELAY_MS` in `.env` to that (ms) and restart the server.
      (The on-stream overlay needs NO delay — it's composited pre-encode.)

## During the show

- **Between matches / on scene changes**: restart the loop
  (`launchctl kickstart -k ...`). Restarts are cheap — tracks resume via
  shootout in seconds. This also clears any slow drift from very long runs.
- `state frozen` lines in the loop log are the guards doing their job
  (camera signal lost or lights too low) — fix the cause; tracks survive.
- A wrong name on stream (never observed after the shootout fix, but): cover
  or lift the card — the track fails re-verification and drops in ~4 cycles
  (~20s). Worst case: kickstart the loop.
- The overlay auto-hides when the gameplay source leaves the program scene;
  no operator action needed for breaks.

## Contingencies

| Symptom | Cause | Fix |
|---|---|---|
| Overlay empty, cards on table | loop down / state stale | `launchctl kickstart`; check loop.log |
| Overlay empty on gameplay scene | transform not found (scene rename?) | `CARD_VISION_SOURCE` env must match the camera source name; server log says what it mapped |
| Boxes offset from cards | scene-item transform changed mid-show | it refreshes every 10s — wait one refresh; if still off, check crop/scale on the wrapper scene |
| Slow confirmations | lighting dropped | roi_check.py brightness; add light |
| Node server down | — | overlay + extension both go blank; restart server (operator page reconnects itself) |
