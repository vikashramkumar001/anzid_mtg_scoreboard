#!/usr/bin/env python3
"""
zone_watch — recognition for the FIXED card slots printed on the playmat.

live_loop.py solves the hard problem: find unknown cards anywhere on the table.
This solves the easy one. The champion and legend slots never move, so there is
nothing to search for — crop the known rectangle and ask whether the expected
card is in it.

That difference is worth ~50x. Measured on the .26 overhead cam:

    grab 4K PNG                7.10s   (9.2 MB over the websocket)
    grab 4K JPEG               0.33s   (0.6 MB) -- and no worse for recognition
    identify, open search      4.01s   (all 1190 cards)
    identify, constrained      0.035s  (verification, not search)
    ---------------------------------------------------------------
    full 4-zone pass           0.42s   (vs 23s doing it naively)

live_loop also simply fails here: its bright-on-dark region proposer returns
regions=0 for a dark card on the dark navy mat, so a champion sitting in plain
sight never gets past "pending".

Writes the same state.json contract live_loop does, so features/card-vision.js
and the champion-watch prompt consume it unchanged.

Usage:
  python3 zone_watch.py [--obs ws://localhost:4455] [--zones zones.json]
                        [--codes-url http://localhost:1378/api/card-vision/decklist-codes]
                        [--interval 1] [--cycles 0] [--out state.json]
"""
import argparse
import base64
import json
import os
import pickle
import time
import urllib.request

import cv2
import numpy as np
import obsws_python as obsws

import cardvision as cv

HERE = os.path.dirname(os.path.abspath(__file__))

# A card present in the slot read 97-100% of the time across 30 passes, so two
# agreeing reads is plenty to assert and four consecutive misses is a very safe
# "it's gone" (at a 3% miss rate that happens by chance about once every six
# days of continuous running).
CONFIRM_SIGHTINGS = 2
DROP_MISSES = 4

# live_loop's calibration: recognition is fine at frame mean ~57+, hard-fails
# ~25. Below this the lights are off or the camera has slept — freeze rather
# than decay tracks, or a lighting change looks like every card leaving at once.
DARK_MEAN = 30

# The decklist can change between matches; re-pull periodically rather than
# pinning whatever was loaded at boot.
CODES_REFRESH_S = 60


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--obs", default="ws://localhost:4455")
    ap.add_argument("--password", default="RRWtUPVpGf6myRvx")
    ap.add_argument("--zones", default=os.path.join(HERE, "zones.json"))
    ap.add_argument("--source", default=None, help="overrides the source in zones.json")
    ap.add_argument("--codes-url", default="http://localhost:1378/api/card-vision/decklist-codes",
                    help="app endpoint returning the live decklist's card codes; "
                         "empty/unreachable falls back to an open search")
    ap.add_argument("--codes", default=None,
                    help="explicit pool: a JSON file with an array of codes, or a "
                         "comma list. Overrides --codes-url.")
    ap.add_argument("--no-codes", action="store_true", help="never constrain; always open search")
    ap.add_argument("--interval", type=float, default=1.0)
    ap.add_argument("--cycles", type=int, default=0, help="0 = run forever")
    ap.add_argument("--out", default=os.path.join(HERE, "state.json"))
    return ap.parse_args()


def load_codes(spec):
    """Explicit pool from a file or a comma list — same contract as live_loop."""
    if not spec:
        return None
    if os.path.exists(spec):
        with open(spec) as f:
            return list(json.load(f))
    return [c.strip() for c in spec.split(",") if c.strip()]


def fetch_codes(url, timeout=4):
    """Decklist codes from the app. Returns None when unavailable, which the
    caller must treat as 'search everything' rather than 'search nothing'."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            data = json.loads(r.read().decode())
        codes = data.get("codes") or []
        return codes if codes else None
    except Exception:
        return None


def grab(client, source):
    """One 4K frame as JPEG. PNG is 20x slower for no recognition benefit."""
    r = client.get_source_screenshot(source, "jpg", 3840, 2160, -1)
    raw = base64.b64decode(r.image_data.split(",")[1])
    return cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)


def main():
    args = parse_args()
    with open(args.zones) as f:
        cfg = json.load(f)
    zones = cfg["zones"]
    source = args.source or cfg.get("source", "BMD - Match 1 Gameplay")

    index = pickle.load(open(os.path.join(HERE, ".cache/index.pkl"), "rb"))
    host, port = args.obs.replace("ws://", "").split(":")
    client = obsws.ReqClient(host=host, port=int(port), password=args.password, timeout=20)
    print(f"connected to OBS at {host}:{port}; source '{source}'; {len(zones)} zones")

    fixed_pool = load_codes(args.codes)
    if fixed_pool:
        print(f"  pool: {len(fixed_pool)} codes (--codes)")
    pool, pool_at = (fixed_pool, 0.0)
    tracks = {}          # zone name -> dict
    cycle = 0

    while True:
        cycle += 1
        t0 = time.time()

        if not args.no_codes and not fixed_pool and time.time() - pool_at > CODES_REFRESH_S:
            new_pool = fetch_codes(args.codes_url)
            if (new_pool or []) != (pool or []):
                print(f"  pool: {len(new_pool)} codes from decklist" if new_pool
                      else "  pool: no decklist available — open search over all cards")
            pool, pool_at = new_pool, time.time()

        try:
            frame = grab(client, source)
        except Exception as e:
            print(f"[cycle {cycle:3d}] grab failed: {e}")
            time.sleep(args.interval)
            continue

        mean = float(frame.mean())
        if mean < DARK_MEAN:
            # Lights off or camera asleep. Freeze — do NOT decay, or a light
            # switch reads as every card being removed simultaneously.
            print(f"[cycle {cycle:3d}] too dark (mean {mean:.0f}) — state frozen")
            time.sleep(args.interval)
            continue

        seen = []
        for z in zones:
            x0, y0, x1, y1 = z["roi"]
            hits = cv.identify_photo(frame[y0:y1, x0:x1], index,
                                     candidate_codes=pool, topk=1)
            # identify_photo returns its top-k WHETHER OR NOT they pass the
            # accept threshold (score >= ACCEPT_SCORE). Honour that flag: a
            # constrained pool always has a "best" candidate, so an unfiltered
            # res[0] happily reports the least-bad card in the decklist. Seen
            # for real — a zone holding Irelia matched "Mel, Soul's Reflection"
            # at 0.087 because the board's decklist did not contain the card
            # actually on the table.
            res = [h for h in (hits or []) if h.get("accepted")]
            t = tracks.setdefault(z["name"], {"code": None, "name": None, "score": 0.0,
                                              "sightings": 0, "misses": 0,
                                              "first": None, "confirmed": False})
            if res:
                best = res[0]
                if best["code"] != t["code"]:
                    # A different card in the slot is a new track, not a
                    # continuation — otherwise a swap inherits the old one's
                    # confirmation and fires instantly.
                    t.update(code=best["code"], name=best["name"], sightings=0,
                             confirmed=False, first=int(time.time()))
                t["score"] = round(float(best["score"]), 3)
                t["sightings"] += 1
                t["misses"] = 0
                if t["sightings"] >= CONFIRM_SIGHTINGS:
                    t["confirmed"] = True
            else:
                t["misses"] += 1
                if t["misses"] >= DROP_MISSES:
                    t.update(code=None, name=None, score=0.0, sightings=0,
                             confirmed=False, first=None)

            if t["code"]:
                seen.append({
                    "code": t["code"],
                    "name": t["name"],
                    "zone": z["name"],
                    "side": z.get("side"),
                    "slot": z.get("slot"),
                    "status": "confirmed" if t["confirmed"] else "pending",
                    "score": t["score"],
                    "sightings": t["sightings"],
                    "bbox": [x0, y0, x1, y1],
                    "first_seen": t["first"],
                    "last_seen": int(time.time()),
                })

        state = {"updated": time.strftime("%Y-%m-%dT%H:%M:%S"), "cycle": cycle, "cards": seen}
        tmp = args.out + ".tmp"
        with open(tmp, "w") as f:
            json.dump(state, f, indent=1)
        os.replace(tmp, args.out)   # atomic — the Node watcher polls this file

        dt = time.time() - t0
        summary = "  ".join(
            f"{c['zone']}={c['name']}({'c' if c['status'] == 'confirmed' else 'p'}:{c['score']})"
            for c in seen) or "(all slots empty)"
        print(f"[cycle {cycle:3d}] {dt:5.2f}s  {summary}")

        if args.cycles and cycle >= args.cycles:
            break
        time.sleep(max(0.0, args.interval - (time.time() - t0)))


if __name__ == "__main__":
    main()
