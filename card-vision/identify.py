#!/usr/bin/env python3
"""
Identify the card in an image.

Usage:
  python3 identify.py path/to/card.png
  python3 identify.py path/to/frame.png --detect          # find card(s) in a full frame
  python3 identify.py path/to/card.png --codes OGN-001,VEN-150,...   # constrain to a decklist
"""
import argparse
import cv2
import cardvision as cv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--detect", action="store_true",
                    help="treat input as a full frame and auto-crop card rectangles first")
    ap.add_argument("--codes", default="",
                    help="comma-separated card codes to restrict the search to (a decklist)")
    ap.add_argument("--topk", type=int, default=5)
    args = ap.parse_args()

    index = cv.load_index()
    candidates = [c.strip() for c in args.codes.split(",") if c.strip()] or None

    def report(results):
        if not results:
            print("  no match")
            return
        for r in results[:args.topk]:
            flag = "  <-- best" if r is results[0] else ""
            print(f"  {r['code']:<10} {r['name']:<28} inliers={r['inliers']:<3} "
                  f"good={r['good']:<3} conf={r['confidence']:.2f}{flag}")

    if args.detect:
        bgr = cv2.imread(args.image, cv2.IMREAD_COLOR)
        crops = cv.detect_card_quads(bgr)
        print(f"detected {len(crops)} card-like region(s)")
        for i, (crop, _quad) in enumerate(crops):
            print(f"\n[region {i}]")
            report(cv.identify(crop, index, candidate_codes=candidates, topk=args.topk))
    else:
        report(cv.identify(args.image, index, candidate_codes=candidates, topk=args.topk))


if __name__ == "__main__":
    main()
