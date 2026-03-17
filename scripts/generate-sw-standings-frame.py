#!/usr/bin/env python3
"""Generate Star Wars standings frame PNG matching the bracket frame style."""

from PIL import Image, ImageDraw
import os

W, H = 669, 85
BORDER = 2
RADIUS = 6

# Star Wars bracket colors (reused for consistency)
BODY_COLOR = (15, 25, 50, 180)        # dark navy ~70% opaque
RECORD_COLOR = (35, 50, 80, 200)      # slightly lighter navy for record section
BORDER_COLOR = (255, 255, 255, 75)    # white at ~30% opacity

# Record section starts at this x (matches CSS: left 515px, width 154px)
RECORD_X = 515

OUT_DIR = "../public/assets/images/starwars/standings"


def draw_frame(filename):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Body rounded rect
    draw.rounded_rectangle(
        [(0, 0), (W - 1, H - 1)],
        radius=RADIUS,
        fill=BODY_COLOR,
        outline=BORDER_COLOR,
        width=BORDER,
    )

    # Record section (right side) — draw over the body
    draw.rectangle(
        [(RECORD_X, BORDER), (W - BORDER - 1, H - BORDER - 1)],
        fill=RECORD_COLOR,
    )

    # Re-draw border so right-side corners stay clean
    draw.rounded_rectangle(
        [(0, 0), (W - 1, H - 1)],
        radius=RADIUS,
        fill=None,
        outline=BORDER_COLOR,
        width=BORDER,
    )

    out_dir = os.path.join(os.path.dirname(__file__), OUT_DIR)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, filename)
    img.save(path, "PNG")
    print(f"Saved {path}  ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    draw_frame("starwars-standings-frame-default-1v1.png")
    print("Done!")
