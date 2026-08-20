#!/usr/bin/env python3
"""
Pre-show framing check: grab a live frame, draw the play-area ROI and the
current region proposals, and report lighting. Run this whenever the camera
or table moves — if cards sit outside the yellow ROI box, adjust --roi.

  python3 roi_check.py [--obs ws://localhost:4455] [--roi 830,100,3260,2110]
  -> samples/roi_check.png  (open it; cards should be inside the yellow box)
"""
import argparse
import base64
import os

import cv2
import numpy as np
import obsws_python as obsws

import live_loop as ll

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--obs", default="ws://localhost:4455")
    ap.add_argument("--password", default="RRWtUPVpGf6myRvx")
    ap.add_argument("--source", default="BMD - Match 1 Gameplay")
    ap.add_argument("--roi", default="830,100,3260,2110")
    args = ap.parse_args()
    roi = tuple(int(v) for v in args.roi.split(","))

    host = args.obs.split("//")[1].split(":")[0]
    port = int(args.obs.rsplit(":", 1)[1])
    cl = obsws.ReqClient(host=host, port=port, password=args.password, timeout=15)
    r = cl.get_source_screenshot(args.source, "png", None, None, -1)
    buf = np.frombuffer(base64.b64decode(r.image_data.split(",", 1)[1]), np.uint8)
    frame = cv2.imdecode(buf, cv2.IMREAD_COLOR)

    mean = float(frame.mean())
    verdict = ("GOOD" if mean >= 50 else
               "MARGINAL — recognition will be slow/weak; add light" if mean >= 30 else
               "TOO DARK — loop will freeze; fix lighting")
    print(f"frame {frame.shape[1]}x{frame.shape[0]}  brightness {mean:.0f}  -> {verdict}")

    vis = frame.copy()
    cv2.rectangle(vis, (roi[0], roi[1]), (roi[2], roi[3]), (0, 220, 255), 6)
    regions = ll.propose_regions(frame, roi)
    for b in regions:
        cv2.rectangle(vis, (b[0], b[1]), (b[2], b[3]), (90, 220, 120), 4)
    print(f"{len(regions)} card-candidate region(s) proposed inside ROI")

    out = os.path.join(HERE, "samples", "roi_check.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cv2.imwrite(out, cv2.resize(vis, (1600, 900)))
    print(f"wrote {out} — yellow = ROI (play area), green = proposals")


if __name__ == "__main__":
    main()
