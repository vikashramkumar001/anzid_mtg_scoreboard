#!/usr/bin/env python3
"""
Prove the recognizer works on realistically-degraded cards.

We take real card images, distort them the way a stream camera would
(perspective tilt, rotation, glare, blur, downscale, sensor noise), then ask
the engine to name them — WITHOUT telling it which card it is.

Two scenarios:
  A. open search    -> pHash prefilter over all ~1,156 cards, then ORB verify.
  B. decklist-bound -> search restricted to a 50-card pool (the realistic case,
     since you know both players' decklists).

Also writes samples/selftest_montage.png : original | degraded (+prediction).
"""
import os
import random
import cv2
import numpy as np
import cardvision as cv

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(HERE, "samples")
SEED = 20260721
N_TEST = 80
POOL_SIZE = 50


# ---------------------------------------------------------------------------
# camera-style degradation
# ---------------------------------------------------------------------------
def degrade(bgr, rng):
    h, w = 588, 420
    card = cv2.resize(bgr, (w, h), interpolation=cv2.INTER_AREA)

    # perspective tilt: jitter the four corners
    j = 0.09
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = src + rng.uniform(-j, j, src.shape) * np.float32([w, h])
    M = cv2.getPerspectiveTransform(src, dst.astype(np.float32))
    card = cv2.warpPerspective(card, M, (w, h), borderMode=cv2.BORDER_REPLICATE)

    # small rotation
    ang = rng.uniform(-8, 8)
    R = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1.0)
    card = cv2.warpAffine(card, R, (w, h), borderMode=cv2.BORDER_REPLICATE)

    # glare: bright soft blob
    glare = np.zeros((h, w), np.float32)
    cx, cy = rng.integers(0, w), rng.integers(0, h)
    cv2.circle(glare, (int(cx), int(cy)), rng.integers(60, 140), 1.0, -1)
    glare = cv2.GaussianBlur(glare, (0, 0), 60)[..., None]
    card = np.clip(card.astype(np.float32) + glare * rng.uniform(50, 110), 0, 255).astype(np.uint8)

    # blur + downscale-then-up (simulate small-on-stream) + noise
    card = cv2.GaussianBlur(card, (0, 0), rng.uniform(0.6, 1.6))
    scale = rng.uniform(0.35, 0.6)
    small = cv2.resize(card, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    card = cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
    noise = rng.normal(0, 8, card.shape)
    card = np.clip(card.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return card


def label(img, text, ok):
    out = img.copy()
    color = (60, 200, 60) if ok else (60, 60, 220)
    cv2.rectangle(out, (0, 0), (out.shape[1] - 1, 26), (30, 30, 30), -1)
    cv2.putText(out, text, (6, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1, cv2.LINE_AA)
    return out


def main():
    rng = np.random.default_rng(SEED)
    random.seed(SEED)

    index = cv.load_index()
    codes = index["codes"]

    test_codes = random.sample(codes, N_TEST)
    code_to_i = {c: i for i, c in enumerate(codes)}

    a_hits = b_hits = 0
    a_inliers, b_inliers = [], []
    montage_rows = []

    for n, code in enumerate(test_codes):
        path = os.path.join(cv.CARDS_DIR, code + ".png")
        ref = cv2.imread(path, cv2.IMREAD_COLOR)
        if ref is None:
            continue
        query = degrade(ref, rng)

        # A. open search
        res_a = cv.identify(query, index, topk=3)
        top_a = res_a[0] if res_a else None
        ok_a = bool(top_a and top_a["code"] == code)
        a_hits += ok_a
        if top_a:
            a_inliers.append(top_a["inliers"])

        # B. decklist-constrained: 49 random distractors + the true card
        pool = set(random.sample(codes, POOL_SIZE - 1)) | {code}
        res_b = cv.identify(query, index, candidate_codes=pool, topk=3)
        top_b = res_b[0] if res_b else None
        ok_b = bool(top_b and top_b["code"] == code)
        b_hits += ok_b
        if top_b:
            b_inliers.append(top_b["inliers"])

        if n < 6:  # build a visual montage from the first few
            orig = cv2.resize(ref, (420, 588))
            pred = top_a["name"] if top_a else "no match"
            row = np.hstack([
                label(orig, f"actual: {index['names'][code_to_i[code]]}", True),
                label(query, f"guess: {pred} (i={top_a['inliers'] if top_a else 0})", ok_a),
            ])
            montage_rows.append(row)

        print(f"  [{n+1:>3}/{N_TEST}] {code:<10} open={'HIT ' if ok_a else 'miss'} "
              f"deck={'HIT ' if ok_b else 'miss'}", end="\r", flush=True)

    print("\n")
    print("=" * 58)
    print(f"  A. open search (all {len(codes)} cards):     "
          f"{a_hits}/{N_TEST} = {100*a_hits/N_TEST:.1f}%  "
          f"(median inliers {int(np.median(a_inliers)) if a_inliers else 0})")
    print(f"  B. decklist-constrained ({POOL_SIZE}-card pool): "
          f"{b_hits}/{N_TEST} = {100*b_hits/N_TEST:.1f}%  "
          f"(median inliers {int(np.median(b_inliers)) if b_inliers else 0})")
    print("=" * 58)

    if montage_rows:
        os.makedirs(SAMPLES, exist_ok=True)
        montage = np.vstack(montage_rows)
        out = os.path.join(SAMPLES, "selftest_montage.png")
        cv2.imwrite(out, montage)
        print(f"  montage -> {out}")


if __name__ == "__main__":
    main()
