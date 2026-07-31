#!/usr/bin/env python3
"""
live_loop — continuous card recognition off the OBS overhead-cam source.

  grab 4K source screenshot -> propose card regions (bright-on-dark-mat)
  -> identify each changed region (decklist-constrained if provided)
  -> temporal voting -> stable state written to state.json

Usage:
  python3 live_loop.py --obs ws://192.168.4.20:4455 --source "BMD - Match 1 Gameplay"
      [--codes decklist.json]        # JSON array of card codes, or comma list
      [--interval 3] [--cycles 0]    # 0 = run forever
      [--roi 830,100,3260,2110]      # play-area bounds in source pixels
      [--out state.json]

The emitted state.json is the contract for the Twitch-extension backend:
  {"updated": ..., "cycle": N, "cards": [{code, name, status, score, bbox,
   sightings, first_seen, last_seen}]}
"""
import argparse
import base64
import json
import os
import pickle
import time
from collections import deque
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np
import obsws_python as obsws

import cardvision as cv

HERE = os.path.dirname(os.path.abspath(__file__))
TRACKS_PATH = os.path.join(HERE, ".cache", "tracks.pkl")

# voting parameters
WINDOW = 5            # look-back window (cycles)
CONFIRM_SIGHTINGS = 3 # sightings within window to confirm
DROP_AFTER = 4        # cycles unseen -> drop
UNCHANGED_DIFF = 3.5  # mean abs diff below this = region unchanged, reuse result
                      # (sensor noise on static 4K regions measured ~2.6)


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--obs", default="ws://192.168.4.20:4455")
    ap.add_argument("--password", default="RRWtUPVpGf6myRvx")
    ap.add_argument("--source", default="BMD - Match 1 Gameplay")
    ap.add_argument("--codes", default=None,
                    help="decklist constraint: JSON file with an array of codes, "
                         "or an inline comma-separated list")
    ap.add_argument("--interval", type=float, default=3.0)
    ap.add_argument("--cycles", type=int, default=0, help="0 = forever")
    ap.add_argument("--roi", default="830,100,3260,2110")
    ap.add_argument("--out", default=os.path.join(HERE, "state.json"))
    ap.add_argument("--save-frames", action="store_true")
    ap.add_argument("--sweep", action="store_true",
                    help="exhaustive full-table sweep on the first cycle — "
                         "recovers cards already on the table (slow once, then "
                         "normal incremental cycles)")
    return ap.parse_args()


def load_codes(spec):
    if not spec:
        return None
    if os.path.exists(spec):
        with open(spec) as f:
            return list(json.load(f))
    return [c.strip() for c in spec.split(",") if c.strip()]


def grab(client, source):
    r = client.get_source_screenshot(source, "png", None, None, -1)
    b64 = r.image_data.split(",", 1)[1]
    buf = np.frombuffer(base64.b64decode(b64), np.uint8)
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def propose_regions(frame, roi, prev_frame=None):
    """
    Card-cluster candidates inside the play-area ROI, from the union of:
      - appearance: bright OR saturated pixels (cards pop against the navy mat;
        tuned on live 4K frames — gray>120 | (sat>70 & val>60), open 11 close 25)
      - change: frame-to-frame difference (catches dark-art cards the moment
        they are placed/moved, which appearance alone can miss on a dark mat)
    """
    x0, y0, x1, y1 = roi
    view = frame[y0:y1, x0:x1]
    g = cv2.cvtColor(view, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(view, cv2.COLOR_BGR2HSV)
    s, v = hsv[..., 1], hsv[..., 2]
    mask = ((g > 120) | ((s > 70) & (v > 60))).astype(np.uint8) * 255
    if prev_frame is not None:
        pg = cv2.cvtColor(prev_frame[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(g, pg)
        mask |= (cv2.GaussianBlur(diff, (0, 0), 3) > 18).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    n, _, stats, _ = cv2.connectedComponentsWithStats(mask)
    out = []
    H, W = frame.shape[:2]
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if not (15_000 < area < 1_200_000):
            continue
        if w < 110 or h < 110:
            continue
        pad = 40
        out.append((int(max(0, x0 + x - pad)), int(max(0, y0 + y - pad)),
                    int(min(W, x0 + x + w + pad)), int(min(H, y0 + y + h + pad))))
    return out


def region_key(bbox):
    """Quantize the center so jittering boxes map to a stable key."""
    cx = (bbox[0] + bbox[2]) // 2
    cy = (bbox[1] + bbox[3]) // 2
    return (cx // 100, cy // 100)


def _center(bbox):
    return ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)


def _dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


INSTANCE_RADIUS = 150   # same code within this distance = same physical card
                        # (tight quad-derived boxes are accurate to ~20px, and
                        # adjacent copies of one card sit ~250px apart — 150
                        # separates a playset while absorbing jitter)


def quad_bbox(result, origin_x, origin_y):
    """Tight frame-space bbox from identify_photo's card quad."""
    xs = [p[0] for p in result["quad"]]
    ys = [p[1] for p in result["quad"]]
    return (origin_x + min(xs), origin_y + min(ys),
            origin_x + max(xs), origin_y + max(ys))


def box_iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    ua = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def add_sighting(sightings, code, score, bbox):
    """Collect per-cycle sightings, merging same-code hits at ~the same spot
    (overlapping regions seeing one card) while keeping separate copies of a
    card at different spots as separate instances (playset counting)."""
    c = _center(bbox)
    for s in sightings:
        if s[0] == code and _dist(_center(s[2]), c) < INSTANCE_RADIUS:
            if score > s[1]:
                s[1], s[2] = score, bbox
            return
    sightings.append([code, score, bbox])


# ---------------------------------------------------------------------------
# parallel sweep workers (spawn-safe: top-level functions, per-worker globals)
# ---------------------------------------------------------------------------
_SW = {}


def _sweep_worker_init(frame_path, pool_codes):
    cv2.setNumThreads(2)          # avoid oversubscription across processes
    _SW["index"] = cv.load_index()
    _SW["frame"] = np.load(frame_path)
    _SW["pool"] = pool_codes


def _sweep_tile(bx):
    frame = _SW["frame"]
    crop = frame[bx[1]:bx[3], bx[0]:bx[2]]
    if crop.size == 0:
        return []
    out = []
    for r in cv.identify_photo(crop, _SW["index"], candidate_codes=_SW["pool"], topk=5):
        if r["score"] >= 0.20:
            out.append((r["code"], r["score"], quad_bbox(r, bx[0], bx[1])))
    return out


def full_sweep(frame, roi, index, pool, tile=720, overlap=400, workers=None):
    """
    Exhaustive one-shot inventory: loose appearance mask -> regions, oversized
    ones exploded into overlapping tiles (stride = tile-overlap must stay under
    tile - max card dim ~400px so no card straddles every tile boundary).
    Returns {code: (score, bbox)}. Slow (minutes, blind) — startup use only.
    """
    X0, Y0, X1, Y1 = roi
    H, W = frame.shape[:2]
    view = frame[Y0:Y1, X0:X1]
    g = cv2.cvtColor(view, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(view, cv2.COLOR_BGR2HSV)
    s, v = hsv[..., 1], hsv[..., 2]
    mask = ((g > 105) | ((s > 50) & (v > 40))).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    n, _, stats, _ = cv2.connectedComponentsWithStats(mask)

    stride = tile - overlap
    def tiles_of(x0, y0, x1, y1):
        xs = sorted(set(list(range(x0, max(x0 + 1, x1 - tile), stride)) + [max(x0, x1 - tile)]))
        ys = sorted(set(list(range(y0, max(y0 + 1, y1 - tile), stride)) + [max(y0, y1 - tile)]))
        return [(tx, ty, min(x1, tx + tile), min(y1, ty + tile)) for ty in ys for tx in xs]

    regions = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < 10_000 or w < 100 or h < 100:
            continue
        bx = (max(0, X0 + x - 40), max(0, Y0 + y - 40),
              min(W, X0 + x + w + 40), min(H, Y0 + y + h + 40))
        if bx[2] - bx[0] > tile or bx[3] - bx[1] > tile:
            regions += tiles_of(*bx)
        else:
            regions.append(bx)

    hits = []   # [code, score, bbox] per physical-card instance
    MAX_TILES = 48   # sweep-time guard: difficult lighting can inflate the
                     # proposal mask; identify cost is ~15s/tile so an
                     # unbounded sweep can stall for an hour. Prefer the
                     # largest regions and SAY what was dropped.
    if len(regions) > MAX_TILES:
        regions.sort(key=lambda b: -(b[2]-b[0])*(b[3]-b[1]))
        print(f"  sweep: capping {len(regions)} tiles to {MAX_TILES} "
              f"(largest kept — rerun sweep or nudge missed cards)")
        regions = regions[:MAX_TILES]
    workers = workers if workers is not None else max(1, min(8, (os.cpu_count() or 2) - 2))
    if workers > 1 and len(regions) > 3:
        # parallel path: tiles are independent; each worker loads the index
        # once (initializer) and reads the frame from a shared .npy
        fp = os.path.join(HERE, "samples", "_sweep_frame.npy")
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        np.save(fp, frame)
        try:
            with ProcessPoolExecutor(max_workers=workers,
                                     initializer=_sweep_worker_init,
                                     initargs=(fp, list(pool))) as ex:
                for res in ex.map(_sweep_tile, regions):
                    for code, score, bb in res:
                        add_sighting(hits, code, score, bb)
            return hits
        except Exception as e:      # pragma: no cover — fall back, never die
            print(f"  parallel sweep failed ({e}); running serial")
            hits = []
    for bx in regions:
        crop = frame[bx[1]:bx[3], bx[0]:bx[2]]
        if crop.size == 0:
            continue
        # topk=5: a tile can contain several cards, and each candidate
        # registers to its own card — topk=2 dropped third cards in busy tiles
        for r in cv.identify_photo(crop, index, candidate_codes=pool, topk=5):
            if r["score"] < 0.20:
                continue
            add_sighting(hits, r["code"], r["score"], quad_bbox(r, bx[0], bx[1]))
    return hits


def main():
    args = parse_args()
    roi = tuple(int(v) for v in args.roi.split(","))
    codes = load_codes(args.codes)
    index = cv.load_index()
    pool = codes if codes else index["codes"]
    host = args.obs.split("//")[1].split(":")[0]
    port = int(args.obs.rsplit(":", 1)[1])
    client = obsws.ReqClient(host=host, port=port, password=args.password, timeout=15)
    print(f"connected to OBS at {host}:{port}; source '{args.source}'; "
          f"pool={'decklist:' + str(len(pool)) if codes else 'ALL ' + str(len(pool))}")

    prev = {}      # region_key -> {"crop", "results": [(code,score,bbox)], "bbox"}
    tracks = {}    # instance key "CODE#c.n" -> {"code", "hits", "bbox", "first", "last", "crop"}
    # resume persisted tracks: crops don't survive (frame-dependent), so every
    # resumed track re-earns its spot via shootout on the first cycles — a
    # restart recovers the table in seconds instead of a full sweep
    if os.path.exists(TRACKS_PATH):
        try:
            with open(TRACKS_PATH, "rb") as f:
                saved = pickle.load(f)
            for k, t in saved.items():
                tracks[k] = {"code": t["code"], "bbox": tuple(t["bbox"]),
                             "first": t["first"], "last": 0,
                             "confirmed": t.get("confirmed", False),
                             "covered": t.get("covered", False), "crop": None,
                             "hits": deque([(0, s) for s in t["hits"][-WINDOW:]],
                                           maxlen=WINDOW)}
            print(f"resumed {len(tracks)} persisted track(s) — re-verifying via shootout")
        except Exception as e:
            print(f"could not resume tracks ({e}); starting fresh")
            tracks = {}
    prev_frame = None
    cycle = 0
    while args.cycles == 0 or cycle < args.cycles:
        cycle += 1
        t0 = time.time()
        frame = grab(client, args.source)
        brightness = 0.0 if frame is None else float(frame.mean())
        if brightness < 30.0:
            # black frame = signal loss; dark frame = room lights off. Neither
            # is card removal — freeze all tracks and wait for a usable picture.
            # (recognition validated at frame mean ~57+; hard-fails at ~25)
            why = "no signal" if brightness < 2.0 else f"too dark (mean {brightness:.0f})"
            print(f"[cycle {cycle:>3}] {why} — state frozen")
            time.sleep(max(args.interval, 2.0))
            continue
        if args.save_frames:
            cv2.imwrite(os.path.join(HERE, f"samples/loop_{cycle:04d}.png"), frame)
        # always publish a downscaled latest-frame for the overlay test page
        small = cv2.resize(frame, (1600, 900), interpolation=cv2.INTER_AREA)
        tmpf = os.path.join(HERE, "samples/latest_tmp.jpg")   # imwrite needs a real image ext
        cv2.imwrite(tmpf, small, [cv2.IMWRITE_JPEG_QUALITY, 82])
        os.replace(tmpf, os.path.join(HERE, "samples/latest.jpg"))
        regions = propose_regions(frame, roi, prev_frame)
        prev_frame = frame

        sightings = []            # [code, score, tight_bbox] per physical card
        fresh = 0
        for bbox in regions:
            key = region_key(bbox)
            p = prev.get(key)
            if p is not None:
                # compare at the STORED bbox — proposal boxes jitter a few px
                # between cycles, which would otherwise defeat reuse entirely
                ob = p["bbox"]
                cur = frame[ob[1]:ob[3], ob[0]:ob[2]]
                if cur.shape == p["crop"].shape and \
                   float(np.abs(cur.astype(np.int16) - p["crop"].astype(np.int16)).mean()) < UNCHANGED_DIFF:
                    prev[key]["crop"] = cur           # refresh reference crop
                    for code, score, tb in p["results"]:   # unchanged -> reuse
                        add_sighting(sightings, code, score, tb)
                    continue
            fresh += 1
            crop = frame[bbox[1]:bbox[3], bbox[0]:bbox[2]]
            # topk=3: a region can host several cards; each candidate registers
            # to its own card, and the tight quad places each one
            results = []
            for r in cv.identify_photo(crop, index, candidate_codes=pool, topk=3):
                if r["score"] > 0.15:
                    results.append((r["code"], r["score"],
                                    quad_bbox(r, bbox[0], bbox[1])))
            prev[key] = {"crop": crop, "results": results, "bbox": bbox}
            for code, score, tb in results:
                add_sighting(sightings, code, score, tb)

        if args.sweep and cycle == 1:
            print("  running startup full-table sweep (slow, once)...")
            for code, score, tb in full_sweep(frame, roi, index, pool):
                add_sighting(sightings, code, score, tb)

        # spatial exclusivity: two DIFFERENT codes claiming heavily-overlapping
        # boxes is physically impossible (one spot = one card) — the weaker
        # claim is a cross-match (e.g. The Harrowing squatting on Temporal
        # Breach's dark beam art) and is dropped before it can become a track
        sightings.sort(key=lambda s: -s[1])
        exclusive = []
        for s in sightings:
            if any(s[0] != k[0] and box_iou(s[2], k[2]) > 0.5 for k in exclusive):
                continue
            exclusive.append(s)
        sightings = exclusive

        # map sightings to instance tracks: same code near a known position is
        # that instance; same code elsewhere is another physical copy (playsets)
        H, W = frame.shape[:2]
        for code, score, bbox in sightings:
            bbox = (max(0, bbox[0]), max(0, bbox[1]), min(W, bbox[2]), min(H, bbox[3]))
            if bbox[2] - bbox[0] < 40 or bbox[3] - bbox[1] < 40:
                continue
            tkey, best_d = None, INSTANCE_RADIUS
            for k, t in tracks.items():
                if t["code"] != code:
                    continue
                d = _dist(_center(t["bbox"]), _center(bbox))
                if d < best_d:
                    tkey, best_d = k, d
            if tkey is None:
                tkey = f"{code}#{cycle}.{len(tracks)}"
                tracks[tkey] = {"code": code, "hits": deque(maxlen=WINDOW),
                                "first": cycle, "bbox": bbox}
            t = tracks[tkey]
            t["hits"].append((cycle, score))
            t["bbox"] = bbox
            t["last"] = cycle
            t["covered"] = False          # directly seen again
            t["crop"] = frame[bbox[1]:bbox[3], bbox[0]:bbox[2]].copy()

        # sticky-until-disturbed — but confirmation must be EARNED with real
        # evidence. Implicit "region unchanged" sightings only retain tracks
        # that already confirmed; unconfirmed tracks get a targeted re-identify
        # every cycle until they either confirm or decay. (Without this, one
        # lucky >=0.30 misregistration on a static table self-confirmed off
        # its own echo — observed as junk names confirming at 0.3-0.5.)
        for tkey, t in tracks.items():
            if t["last"] == cycle:
                continue
            b = t["bbox"]
            cur = frame[b[1]:b[3], b[0]:b[2]]
            has_ref = t.get("crop") is not None       # resumed tracks have none
            unchanged = has_ref and cur.shape == t["crop"].shape and \
                float(np.abs(cur.astype(np.int16) - t["crop"].astype(np.int16)).mean()) < UNCHANGED_DIFF
            if t.get("confirmed") and unchanged and not t.get("covered"):
                t["hits"].append((cycle, t["hits"][-1][1]))   # retention only
                t["last"] = cycle
            else:
                # SHOOTOUT: re-verify against the whole pool, not just this
                # track's own code — a cross-match squatter can re-lock its own
                # wrong code forever, but it can't keep beating the true card
                res = cv.identify_photo(cur, index, candidate_codes=pool, topk=1) \
                    if cur.size else []
                if res and res[0]["code"] == t["code"] and res[0]["score"] > 0.20:
                    t["hits"].append((cycle, res[0]["score"]))
                    t["last"] = cycle
                    t["covered"] = False
                    t["crop"] = cur.copy()
                elif t.get("confirmed") and any(
                        k2 != tkey and t2["last"] == cycle
                        and box_iou(t2["bbox"], t["bbox"]) > 0.3
                        for k2, t2 in tracks.items()):
                    # a live track now owns this spot: the card is COVERED, not
                    # gone (e.g. Pack of Wonders under Vanguard Captain) —
                    # retain it so the overlay can still offer it on hover
                    t["covered"] = True
                    t["last"] = cycle
                # else: lost the spot (or nothing there) — track decays

        for code in [c for c, t in tracks.items() if cycle - t["last"] >= DROP_AFTER]:
            del tracks[code]

        cards = []
        for tkey, t in sorted(tracks.items()):
            recent = [s for c, s in t["hits"] if cycle - c < WINDOW]
            med = float(np.median(recent)) if recent else 0.0
            # one-way latch: confirmation needs >=N REAL sightings (implicit
            # echoes only occur after confirmation); once earned it holds
            # until the track decays out
            if not t.get("confirmed") and len(recent) >= CONFIRM_SIGHTINGS \
               and med >= cv.ACCEPT_SCORE:
                t["confirmed"] = True
            status = "covered" if t.get("covered") else \
                ("confirmed" if t.get("confirmed") else "pending")
            i = index["codes"].index(t["code"])
            cards.append({"code": t["code"], "instance": tkey,
                          "name": index["names"][i], "status": status,
                          "score": round(med, 3), "sightings": len(recent),
                          "bbox": [int(v) for v in t["bbox"]], "first_seen": t["first"],
                          "last_seen": t["last"]})
        state = {"updated": time.strftime("%Y-%m-%dT%H:%M:%S"), "cycle": cycle,
                 "cards": cards}
        tmp = args.out + ".tmp"
        with open(tmp, "w") as f:
            json.dump(state, f, indent=1)
        os.replace(tmp, args.out)

        # persist tracks (sans frame-dependent crops) so a restart resumes in
        # seconds via shootout re-verification instead of a full sweep
        os.makedirs(os.path.dirname(TRACKS_PATH), exist_ok=True)
        with open(TRACKS_PATH + ".tmp", "wb") as f:
            pickle.dump({k: {"code": t["code"], "bbox": list(t["bbox"]),
                             "first": t["first"],
                             "confirmed": t.get("confirmed", False),
                             "covered": t.get("covered", False),
                             "hits": [s for _, s in t["hits"]]}
                         for k, t in tracks.items()}, f)
        os.replace(TRACKS_PATH + ".tmp", TRACKS_PATH)

        dt = time.time() - t0
        # group copies for the console line: "Temporal Breach x2(c:0.86)"
        by_name = {}
        for c in cards:
            by_name.setdefault(c["name"], []).append(c)
        parts = []
        for nm, cs in by_name.items():
            n = len(cs)
            best = max(c["score"] for c in cs)
            st = "c" if all(c["status"] == "confirmed" for c in cs) else "p"
            parts.append(f"{nm}{' x' + str(n) if n > 1 else ''}({st}:{best})")
        print(f"[cycle {cycle:>3}] {dt:5.1f}s regions={len(regions)} fresh={fresh}  "
              + (", ".join(parts) or "-"))

        sleep = args.interval - (time.time() - t0)
        if sleep > 0 and (args.cycles == 0 or cycle < args.cycles):
            time.sleep(sleep)


if __name__ == "__main__":
    main()
