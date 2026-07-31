#!/usr/bin/env python3
"""Benchmark full_sweep (parallel vs the 484s serial baseline) on a saved frame."""
import sys
import time

import cv2

import cardvision as cv
import live_loop as ll


def main():
    index = cv.load_index()
    frame = cv2.imread(sys.argv[1] if len(sys.argv) > 1 else "samples/loop_0003.png")
    t0 = time.time()
    hits = ll.full_sweep(frame, (830, 100, 3260, 2110), index, index["codes"])
    dt = time.time() - t0
    print(f"sweep: {dt:.0f}s, {len(hits)} instances (serial baseline 484s)")
    for code, score, bb in sorted(hits, key=lambda h: -h[1]):
        i = index["codes"].index(code)
        print(f"  {index['names'][i]:<26} {score:.2f}")


if __name__ == "__main__":
    main()
