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

## Status / next

- [x] v1: identify a (cropped) card, open search + decklist-constrained
- [ ] v1.1: robust multi-card detection on the live game cam (tracking)
- [ ] wrap as a service that reads OBS frames and pushes results to the
      Twitch extension (see the extension plan)
