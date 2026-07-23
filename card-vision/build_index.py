#!/usr/bin/env python3
"""Fingerprint every Riftbound card image and cache the index to .cache/index.pkl."""
import time
import cardvision as cv


def main():
    t0 = time.time()

    def progress(done, total):
        print(f"  indexed {done}/{total} cards", end="\r", flush=True)

    print("Building card index (pHash + ORB) ...")
    index = cv.build_index(progress=progress)
    print()
    print(f"Done: {len(index['codes'])} cards in {time.time() - t0:.1f}s")
    print(f"Cache: {cv.CACHE_PATH}")


if __name__ == "__main__":
    main()
