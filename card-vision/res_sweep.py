#!/usr/bin/env python3
"""
Resolution sweep: how wide (in pixels) must a card be on screen for the engine
to recognize it? Isolates the RESOLUTION factor from the render-vs-photo gap by
using clean renders on both sides. This is an optimistic LOWER BOUND on the
reveal-cam spec; the real requirement is higher because of the domain gap.
"""
import random
import cv2
import numpy as np
import cardvision as cv

SEED = 20260728
N = 60
POOL = 50
WIDTHS = [100, 140, 180, 240, 320, 420]


def degrade(bgr, rng, out_w):
    w, h = 420, 588
    card = cv2.resize(bgr, (w, h), interpolation=cv2.INTER_AREA)
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = src + rng.uniform(-0.06, 0.06, src.shape) * np.float32([w, h])
    card = cv2.warpPerspective(card, cv2.getPerspectiveTransform(src, dst.astype(np.float32)),
                               (w, h), borderMode=cv2.BORDER_REPLICATE)
    ang = rng.uniform(-6, 6)
    card = cv2.warpAffine(card, cv2.getRotationMatrix2D((w/2, h/2), ang, 1.0),
                          (w, h), borderMode=cv2.BORDER_REPLICATE)
    glare = np.zeros((h, w), np.float32)
    cv2.circle(glare, (int(rng.integers(0, w)), int(rng.integers(0, h))),
               int(rng.integers(60, 130)), 1.0, -1)
    glare = cv2.GaussianBlur(glare, (0, 0), 55)[..., None]
    card = np.clip(card.astype(np.float32) + glare * rng.uniform(40, 90), 0, 255).astype(np.uint8)
    card = cv2.GaussianBlur(card, (0, 0), rng.uniform(0.5, 1.2))
    out_h = int(out_w * h / w)
    card = cv2.resize(card, (out_w, out_h), interpolation=cv2.INTER_AREA)
    noise = rng.normal(0, 6, card.shape)
    return np.clip(card.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def main():
    rng = np.random.default_rng(SEED)
    random.seed(SEED)
    index = cv.load_index()
    codes = index["codes"]
    test = random.sample(codes, N)

    print(f"{'card width':>10} | {'accuracy':>9} | {'median inliers':>14}")
    print("-" * 40)
    for w in WIDTHS:
        hits, inliers = 0, []
        rng2 = np.random.default_rng(SEED + w)
        for code in test:
            ref = cv2.imread(f"{cv.CARDS_DIR}/{code}.png", cv2.IMREAD_COLOR)
            if ref is None:
                continue
            q = degrade(ref, rng2, w)
            pool = set(random.sample(codes, POOL - 1)) | {code}
            res = cv.identify(q, index, candidate_codes=pool, topk=1)
            if res and res[0]["code"] == code:
                hits += 1
                inliers.append(res[0]["inliers"])
        acc = 100 * hits / N
        med = int(np.median(inliers)) if inliers else 0
        print(f"{w:>7}px   | {acc:>7.1f}% | {med:>14}")


if __name__ == "__main__":
    main()
