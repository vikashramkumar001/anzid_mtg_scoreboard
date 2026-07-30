# card-vision — Riftbound card recognition (v1)

Closed-set recognizer for paper Riftbound cards. It matches a card image
against the ~1,156 known card images in
`public/assets/images/riftbound/cards/` and returns the card code + name.

This is the **recognition core** for the planned Twitch "hover to learn a card"
extension. It runs standalone (Python, separate from the Node app) and is the
piece everything else depends on, so it's built and tested first.

## How it works

We don't OCR the card — we fingerprint it and find the closest library image
(reverse image search / Shazam for cards):

1. **pHash prefilter** — rank all cards by rough visual similarity, keep top ~48.
2. **ORB verify** — match distinctive keypoints and confirm them with a
   homography (geometry check). Inlier count is the confidence; it rejects
   coincidental matches and non-cards.

Passing a **decklist** (`--codes`) shrinks the search to a few dozen cards,
which is faster and much more accurate — the realistic live scenario.

## Setup

```bash
cd card-vision
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 build_index.py      # fingerprints all cards -> .cache/index.pkl (~once)
```

## Use

```bash
# identify a cropped card image
python3 identify.py path/to/card.png

# restrict to a decklist (union of both players' cards)
python3 identify.py path/to/card.png --codes OGN-001,VEN-150,UNL-131

# find + identify card(s) in a full frame (rough; best with a fixed reveal zone)
python3 identify.py path/to/frame.png --detect

# prove it works on degraded cards + write samples/selftest_montage.png
python3 selftest.py
```

## Files

| file | role |
|------|------|
| `cardvision.py` | library: fingerprints, ORB matching, `identify()`, rough detector |
| `build_index.py` | build/cache the card index |
| `identify.py` | CLI: identify a card in an image |
| `selftest.py` | degrade real cards → verify recognition, emit a montage |

## Real-footage findings (2026-07-28)

**Broadcast wide-cam frame** (`samples/pasted_frame.png`, cards ~150-190px):
plain ORB and tesseract OCR both fail — cards are under-resolved. The
`res_sweep.py` benchmark shows a hard cliff: <180px/card ≈ hopeless,
**≥240px/card ≈ 93%** (clean-render conditions). A 4K table cam or a close
"reveal zone" clears the cliff.

**Real 12MP photo of physical cards** (`samples/real_card.jpg`, fanned sleeved
stack): plain ORB ranking fails even at high res — every card shares the frame
template, so template keypoints produce 20-40 coincidental inliers and the true
card drowns. **The fix that works is register-then-verify** (`identify_photo`):
dense ORB -> RANSAC homography -> reject insane card quads -> warp photo into
reference space -> NCC on art box + title band. Open search over all 1190:

```
ACCEPTED OGN-169 Gust   score=0.493   <- truth, 2.8x above best false positive
         ...            score<=0.176
         UNL-128 Star-Crossed 0.159   <- also in photo, half-occluded
```

~16s/frame unoptimized (fine for reveal-cam cadence; decklist-constrained is
~1-2s). Heavily occluded cards stay invisible — the reveal zone should show
one card mostly unobstructed.

## v2 engine (2026-07-28, current)

Dense index (ORB_FEATURES 1000 -> 4000, rebuild required) + two-tier
registration in identify_photo (homography, then 4-DOF affine fallback with
MIN_AFFINE_INLIERS=6). Motivated by texture-poor faces: The Ruination's black
mist managed only 9 matches vs 1000-feature refs and never registered; vs 4000
it registers and verifies at 0.735. Full-table blind sweep on live 4K frames:
**6/7 CONFIRMED** (Gust 0.81 5/5 — was flickering-unconfirmed; Seal of Unity
0.82 as OGN-245), The Ruination registers 0.73 but only 1/5 frames (honest
"present, unconfirmed"). Still zero false positives everywhere. Blind sweep
~1-30s/region; decklist-constrained is seconds. 255 image-library variants
(alt-arts, showcases, tokens, kit items like OGN-245) have no metadata entry —
recognizable by code but unnamed (task flagged).

## Status / next

- [x] v1 engine (pHash + ORB) — clean/synthetic digital crops
- [x] `identify_photo` register-then-verify — VALIDATED on real photo, open search
- [x] capture-side RESOLVED: production OBS ingests the overhead cam at native
      3840x2160 (`BMD - Match 1 Gameplay`) even though canvas is 1080p.
      `GetSourceScreenshot` returns native source res; works over LAN:
      `node obs_tap_probe.mjs ws://192.168.4.20:4455 "BMD - Match 1 Gameplay"`
      -> ~300-380px/card at current framing (above the 240px cliff).
- [x] **END-TO-END VALIDATED (2026-07-28):** live 4K frame off production OBS ->
      fan region crop -> decklist-constrained identify_photo -> correct card
      (Gust 0.307), zero false positives out of 50 candidates. Notes: cards are
      ~200px & soft at current framing (score margin is thin — tighter framing/
      focus would widen it); open-search prefilter fails at this card size
      (ranked truth 388th) so LIVE MUST BE DECKLIST-CONSTRAINED; occluded cards
      don't surface; foil glare untested. Small crops auto-upscale+sharpen in
      identify_photo.
- [x] live loop (`live_loop.py`): OBS 4K tap (obsws-python) -> region proposals
      (appearance mask + frame-diff) -> identify (blind or --codes decklist) ->
      skip-unchanged reuse -> temporal voting -> state.json with names, scores,
      and bboxes (the hover-hotspot contract). Steady-state cycle ~5.5s blind;
      validated live with cards added/removed mid-run (arrivals confirm in ~3
      cycles, departures drop in 4). Known blind spot: dark-art cards already
      static before the loop starts (no appearance signal, no change event).
- [x] instance tracking: identify_photo returns the photo-space card `quad`;
      live_loop tracks code+position instances so playset copies count
      separately ("Temporal Breach x2"), with tight card bboxes (the actual
      hover-hotspot geometry). Sweep topk=5 (busy tiles dropped 3rd cards).
- [x] EBS layer (`features/card-vision.js`, wired in server.js): watches
      state.json, socket.io broadcast `card-vision-state`, endpoints
      /api/card-vision/{state,card/:code,frame}, variant-aware name lookup,
      and a dormant Twitch PubSub transport (hand-rolled ext JWT, no new deps
      — set TWITCH_EXT_CLIENT_ID / TWITCH_EXT_SECRET / TWITCH_BROADCASTER_ID
      to activate). live_loop publishes samples/latest.jpg each cycle.
- [x] hover overlay test page: /html/card-vision-test.html — live frame,
      hotspots, hover card panel. Verified end-to-end in browser.
- [ ] real Twitch extension scaffold + dev-console registration + review;
      delay-sync buffer (server sees ~0s, viewers see +2-10s); player coords
- [ ] state persistence across loop restarts (currently in-memory only)
