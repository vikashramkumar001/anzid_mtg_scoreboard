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
ORB_FEATURES = 4000       # keypoints per image. v2: was 1000 — texture-poor
                          # faces (The Ruination's black mist) only reached
                          # ~9 matches against 1000-feature refs but 12+ against
                          # 4000, which is the difference between failing and a
                          # 0.735 confirm. Rebuild the index after changing.
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
# photo pipeline: register-then-verify (validated on real photos 2026-07-28)
#
# For REAL photographs of physical cards (vs clean digital crops), plain ORB
# ranking fails: every card shares the frame template, so template keypoints
# dominate and the true card drowns in 20-40 coincidental inliers. The fix:
#   1. dense ORB on the query (4000 features),
#   2. for each candidate: homography via RANSAC, rejected unless the implied
#      card quad in the photo is sane (convex, card-sized, sane aspect),
#   3. warp the photo into reference card space and score appearance there:
#      NCC of the art box + NCC of the title band (unique per card).
# On a 12MP photo of a fanned stack, truth scored 0.49 vs 0.18 for the best
# false positive (open search, all 1190 cards). Occluded-but-visible cards
# also surface with elevated scores.
# =============================================================================
REF_W, REF_H = 744, 1039          # reference card frame for rectification
PHOTO_ORB_FEATURES = 4000
ACCEPT_SCORE = 0.30               # accept threshold for identify_photo
MIN_REG_INLIERS = 8               # homography gate; correctness comes from the
                                  # NCC score, so this only filters compute. 10
                                  # proved knife-edge on live 4K frames (sensor
                                  # noise flipped 9<->10 on static cards).
MIN_AFFINE_INLIERS = 6            # fallback tier: 4-DOF affine locks with fewer
                                  # points than an 8-DOF homography — rescues
                                  # texture-poor faces (validated: The Ruination
                                  # 0.735 via affine after homography failed;
                                  # 12/12 random wrong cards still refused).


def _region(im, y0, y1, x0, x1):
    h, w = im.shape[:2]
    return im[int(y0*h):int(y1*h), int(x0*w):int(x1*w)]


def _ncc(a, b):
    a = a.astype(np.float32); b = b.astype(np.float32)
    a -= a.mean(); b -= b.mean()
    return float((a*b).sum() / (np.sqrt((a*a).sum()) * np.sqrt((b*b).sum()) + 1e-9))


def _quad_ok(Hinv, photo_w, photo_h, ref_w=REF_W, ref_h=REF_H):
    corners = np.float32([[0,0],[ref_w,0],[ref_w,ref_h],[0,ref_h]]).reshape(-1,1,2)
    q = cv2.perspectiveTransform(corners, Hinv).reshape(4, 2)
    area = cv2.contourArea(q.astype(np.float32))
    if not (0.002 * photo_w * photo_h < area < 0.9 * photo_w * photo_h):
        return False
    if not cv2.isContourConvex(q.astype(np.float32)):
        return False
    d = lambda i, j: np.linalg.norm(q[i] - q[j])
    s = sorted([d(0,1), d(1,2), d(2,3), d(3,0)])
    return s[3] / max(s[0], 1e-6) < 3.0


def identify_photo(image, index, candidate_codes=None, prefilter=80, topk=5):
    """
    Identify physical card(s) in a real photograph (any orientation, may
    contain clutter/occlusion). Returns candidates sorted by combined
    appearance score; entries with score >= ACCEPT_SCORE are trustworthy.
    Cards in the photo but heavily occluded may appear with mid scores.
    """
    photo = cv2.imread(image, cv2.IMREAD_COLOR) if isinstance(image, str) else image
    # small region crops (e.g. a fan cut from a 4K table frame) benefit from
    # 2x upscale + unsharp mask — validated on live OBS footage 2026-07-28
    scale = 1.0
    if min(photo.shape[:2]) < 800:
        scale = 2.0
        photo = cv2.resize(photo, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        photo = cv2.addWeighted(photo, 1.6, cv2.GaussianBlur(photo, (0, 0), 3), -0.6, 0)
    gray = to_gray(photo)
    ph, pw = gray.shape[:2]
    orb_hi = cv2.ORB_create(nfeatures=PHOTO_ORB_FEATURES)
    kp, q_des = orb_hi.detectAndCompute(gray, None)
    if q_des is None or len(kp) < 50:
        return []
    q_pts = np.float32([k.pt for k in kp])

    codes = index["codes"]
    if candidate_codes is not None:
        wanted = set(candidate_codes)
        cand = [i for i, c in enumerate(codes) if c in wanted]
    else:
        ranked = []
        for i in range(len(codes)):
            inl, _ = orb_score(q_des, q_pts, index["des"][i], index["pts"][i])
            ranked.append((inl, i))
        ranked.sort(reverse=True)
        cand = [i for _, i in ranked[:prefilter]]

    out = []
    for i in cand:
        knn = _BF.knnMatch(q_des, index["des"][i], k=2)
        good = [m for m, n in (p for p in knn if len(p) == 2)
                if m.distance < RATIO * n.distance]
        if len(good) < MIN_AFFINE_INLIERS:
            continue
        src = q_pts[[m.queryIdx for m in good]].reshape(-1, 1, 2)
        dst = index["pts"][i][[m.trainIdx for m in good]].reshape(-1, 1, 2)
        # tier 1: full homography (8-DOF, handles perspective)
        M = None
        H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
        if H is not None and mask is not None and int(mask.sum()) >= MIN_REG_INLIERS:
            M, inliers = H, int(mask.sum())
        else:
            # tier 2: partial affine (4-DOF) — locks with fewer points; fine for
            # a flat card under a mostly-overhead camera
            A, amask = cv2.estimateAffinePartial2D(
                src, dst, method=cv2.RANSAC, ransacReprojThreshold=6.0)
            if A is not None and amask is not None and int(amask.sum()) >= MIN_AFFINE_INLIERS:
                M, inliers = np.vstack([A, [0.0, 0.0, 1.0]]), int(amask.sum())
        if M is None:
            continue
        try:
            Hinv = np.linalg.inv(M)
        except np.linalg.LinAlgError:
            continue
        # H maps photo pixels into the reference image's OWN pixel space, so
        # rectify into the ref's native dimensions (battlefields are landscape
        # 1039x744 — forcing portrait squashed them 2x in aspect and broke NCC).
        ref = cv2.imread(os.path.join(CARDS_DIR, codes[i] + ".png"))
        if ref is None:
            continue
        rh, rw = ref.shape[:2]
        if not _quad_ok(Hinv, pw, ph, rw, rh):
            continue
        warped = cv2.warpPerspective(photo, M, (rw, rh))
        if rw > rh:
            # landscape (battlefield) layout: no shared art/title geometry with
            # portrait cards — score on the full face instead
            art = _ncc(_region(warped, 0.06, 0.94, 0.06, 0.94),
                       _region(ref,    0.06, 0.94, 0.06, 0.94))
            title = art
            score = art
        else:
            art = _ncc(_region(warped, 0.09, 0.53, 0.09, 0.91),
                       _region(ref,    0.09, 0.53, 0.09, 0.91))
            title = _ncc(_region(warped, 0.55, 0.63, 0.08, 0.92),
                         _region(ref,    0.55, 0.63, 0.08, 0.92))
            score = 0.6 * art + 0.4 * title
        # card's outline back in the ORIGINAL input image's pixel space
        # (undo the auto-enhance upscale) — this is the hover-hotspot geometry
        corners = np.float32([[0, 0], [rw, 0], [rw, rh], [0, rh]]).reshape(-1, 1, 2)
        quad = (cv2.perspectiveTransform(corners, Hinv).reshape(4, 2) / scale)
        out.append({
            "code": codes[i], "name": index["names"][i],
            "score": score, "art_ncc": art, "title_ncc": title,
            "inliers": inliers,
            "accepted": score >= ACCEPT_SCORE,
            "quad": [[int(x), int(y)] for x, y in quad],
        })
    out.sort(key=lambda r: r["score"], reverse=True)
    return out[:topk]


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
