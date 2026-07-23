"""
cardvision — closed-set Riftbound card recognition.

Core idea: we are NOT reading the card. We fingerprint the crop and find the
closest match in a library of known card images (reverse-image-search / Shazam
for cards). Two fingerprints are used together:

  1. pHash (perceptual hash)  -> fast, coarse prefilter. Ranks the whole
     library by rough visual similarity in milliseconds.
  2. ORB feature matching     -> precise verify. Matches distinctive keypoints
     (art corners, logo, text edges) and geometrically checks them with a
     homography, so angle / glare / partial cover are tolerated and non-cards
     are rejected.

The library is a fixed set (~1,156 images) with clean art, and decklists can
shrink the candidate pool to a few dozen — that is what makes this tractable.
"""

import os
import json
import pickle

import cv2
import numpy as np

# ---- paths (relative to repo root, one level up from this file) -------------
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
CARDS_DIR = os.path.join(REPO, "public", "assets", "images", "riftbound", "cards")
META_JSON = os.path.join(REPO, "data", "riftbound", "riftboundCardNames.json")
CACHE_PATH = os.path.join(HERE, ".cache", "index.pkl")

# ---- tunables ---------------------------------------------------------------
ORB_FEATURES = 1000       # keypoints per image
RATIO = 0.75              # Lowe's ratio test threshold
PREFILTER_K = 160         # how many pHash candidates to ORB-verify
MIN_GOOD_FOR_HOMOGRAPHY = 8

_ORB = cv2.ORB_create(nfeatures=ORB_FEATURES)
_BF = cv2.BFMatcher(cv2.NORM_HAMMING)


# =============================================================================
# fingerprints
# =============================================================================
def phash_bits(gray):
    """64-bit perceptual hash as a (64,) uint8 array of 0/1."""
    small = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    dct = cv2.dct(small)
    low = dct[:8, :8].flatten()
    med = np.median(low[1:])            # exclude the DC term
    return (low > med).astype(np.uint8)


def orb_features(gray):
    """Return (descriptors uint8[K,32], keypoint-points float32[K,2]) or (None, None)."""
    kp, des = _ORB.detectAndCompute(gray, None)
    if des is None or len(kp) == 0:
        return None, None
    pts = np.float32([k.pt for k in kp])
    return des, pts


def to_gray(image):
    """Accept a path or a BGR/gray ndarray -> single-channel uint8."""
    if isinstance(image, str):
        img = cv2.imread(image, cv2.IMREAD_COLOR)
        if img is None:
            raise FileNotFoundError(f"could not read image: {image}")
    else:
        img = image
    if img.ndim == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return img


# =============================================================================
# ORB match score between a query and one reference
# =============================================================================
def orb_score(q_des, q_pts, r_des, r_pts):
    """
    Returns (inliers, good). `good` = matches surviving the ratio test.
    `inliers` = subset that also agree on a single homography (geometry check).
    inliers is the real confidence signal; it rejects coincidental matches.
    """
    if q_des is None or r_des is None or len(q_des) < 2 or len(r_des) < 2:
        return 0, 0
    knn = _BF.knnMatch(q_des, r_des, k=2)
    good = []
    for pair in knn:
        if len(pair) < 2:
            continue
        m, n = pair
        if m.distance < RATIO * n.distance:
            good.append(m)
    if len(good) < MIN_GOOD_FOR_HOMOGRAPHY:
        return len(good), len(good)
    src = q_pts[[m.queryIdx for m in good]].reshape(-1, 1, 2)
    dst = r_pts[[m.trainIdx for m in good]].reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    if mask is None:
        return len(good), len(good)
    return int(mask.sum()), len(good)


# =============================================================================
# index build / load
# =============================================================================
def _load_metadata():
    with open(META_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    by_code = {}
    for name, entry in data.items():
        code = entry.get("publicCode")
        if not code:
            continue
        rec = dict(entry)
        rec["name"] = name
        by_code[code] = rec
    return by_code


def build_index(progress=None):
    """Fingerprint every card image and cache it to disk. Returns the index dict."""
    meta = _load_metadata()
    files = sorted(
        f for f in os.listdir(CARDS_DIR)
        if f.lower().endswith(".png") and not f.lower().startswith("cardback")
    )
    codes, names, phashes, des_list, pts_list = [], [], [], [], []
    for i, fname in enumerate(files):
        code = os.path.splitext(fname)[0]
        gray = to_gray(os.path.join(CARDS_DIR, fname))
        des, pts = orb_features(gray)
        codes.append(code)
        names.append(meta.get(code, {}).get("name", code))
        phashes.append(phash_bits(gray))
        des_list.append(des)
        pts_list.append(pts)
        if progress and (i % 100 == 0 or i == len(files) - 1):
            progress(i + 1, len(files))
    index = {
        "codes": codes,
        "names": names,
        "phash": np.array(phashes, dtype=np.uint8),   # (N, 64)
        "des": des_list,
        "pts": pts_list,
    }
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "wb") as f:
        pickle.dump(index, f, protocol=pickle.HIGHEST_PROTOCOL)
    return index


def load_index():
    if not os.path.exists(CACHE_PATH):
        raise FileNotFoundError("index not built yet — run: python3 build_index.py")
    with open(CACHE_PATH, "rb") as f:
        return pickle.load(f)


# =============================================================================
# identify
# =============================================================================
def identify(image, index, candidate_codes=None, prefilter_k=PREFILTER_K, topk=5):
    """
    Identify the card in `image` (path or ndarray).

    candidate_codes: optional iterable of card codes to restrict the search to
      (e.g. the union of both players' decklists) — faster and far fewer errors.

    Returns a list of dicts sorted best-first:
      [{code, name, inliers, good, confidence}, ...]
    plus a top-level 'margin' via identify_best() below.
    """
    gray = to_gray(image)
    q_phash = phash_bits(gray)
    q_des, q_pts = orb_features(gray)
    if q_des is None:
        return []

    codes = index["codes"]
    if candidate_codes is not None:
        wanted = set(candidate_codes)
        cand_idx = [i for i, c in enumerate(codes) if c in wanted]
    else:
        # pHash Hamming distance to every card, keep the closest prefilter_k
        ham = np.count_nonzero(index["phash"] != q_phash, axis=1)
        cand_idx = list(np.argsort(ham)[:prefilter_k])

    scored = []
    for i in cand_idx:
        inliers, good = orb_score(q_des, q_pts, index["des"][i], index["pts"][i])
        scored.append((inliers, good, i))
    scored.sort(key=lambda t: (t[0], t[1]), reverse=True)

    out = []
    for inliers, good, i in scored[:topk]:
        out.append({
            "code": codes[i],
            "name": index["names"][i],
            "inliers": inliers,
            "good": good,
            "confidence": min(1.0, inliers / 25.0),
        })
    return out


def identify_best(image, index, candidate_codes=None, min_inliers=12, min_margin=6):
    """
    Convenience wrapper for a live pipeline: returns (result_dict_or_None, results).
    A match is accepted only if the top hit is strong AND clearly ahead of #2,
    which is what keeps false positives off screen.
    """
    results = identify(image, index, candidate_codes=candidate_codes)
    if not results:
        return None, results
    top = results[0]
    second = results[1]["inliers"] if len(results) > 1 else 0
    accepted = top["inliers"] >= min_inliers and (top["inliers"] - second) >= min_margin
    return (top if accepted else None), results


# =============================================================================
# rough card detector (bonus — for a full frame rather than a pre-cropped card)
# =============================================================================
def detect_card_quads(bgr, max_cards=6):
    """
    Very rough: find large 4-sided contours and return de-skewed card crops.
    Good enough for a fixed 'reveal zone'; the moving-card case needs more.
    Returns a list of (warped_bgr, quad_points).
    """
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    frame_area = bgr.shape[0] * bgr.shape[1]
    crops = []
    for c in sorted(cnts, key=cv2.contourArea, reverse=True)[:max_cards * 3]:
        area = cv2.contourArea(c)
        if area < frame_area * 0.01:
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) != 4:
            continue
        quad = approx.reshape(4, 2).astype(np.float32)
        crops.append((_warp_card(bgr, quad), quad))
        if len(crops) >= max_cards:
            break
    return crops


def _warp_card(bgr, quad, w=420, h=588):
    s = quad.sum(axis=1)
    d = np.diff(quad, axis=1).ravel()
    ordered = np.array([
        quad[np.argmin(s)], quad[np.argmin(d)],
        quad[np.argmax(s)], quad[np.argmax(d)],
    ], dtype=np.float32)  # tl, tr, br, bl
    dstpts = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(ordered, dstpts)
    return cv2.warpPerspective(bgr, M, (w, h))
