#!/usr/bin/env python3
"""Generate Star Wars bracket frame PNGs (normal + win variant)."""

from PIL import Image, ImageDraw

W, H = 424, 56
BORDER = 2
RADIUS = 6

# --- Colors ---
# Normal frame: dark navy, semi-transparent
BODY_NORMAL = (15, 25, 50, 180)       # rgba dark navy ~70% opaque
POINTS_NORMAL = (35, 50, 80, 200)     # slightly lighter navy for points area
BORDER_NORMAL = (255, 255, 255, 75)   # white at ~30% opacity

# Win frame: same body, gold points section + gold border
BODY_WIN = (15, 25, 50, 180)
POINTS_WIN = (233, 206, 137, 230)     # #E9CE89 gold at ~90%
BORDER_WIN = (233, 206, 137, 180)     # gold border at ~70%

# Points section starts at this x (424 - 70px points width for star wars)
POINTS_X = 354

OUT_DIR = "../public/assets/images/starwars/bracket"


def draw_frame(body_color, points_color, border_color, filename):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Body rounded rect
    draw.rounded_rectangle(
        [(0, 0), (W - 1, H - 1)],
        radius=RADIUS,
        fill=body_color,
        outline=border_color,
        width=BORDER,
    )

    # Points section (right side) — draw over the body
    draw.rectangle(
        [(POINTS_X, BORDER), (W - BORDER - 1, H - BORDER - 1)],
        fill=points_color,
    )

    # Re-draw right border + rounded corners so they're clean
    draw.rounded_rectangle(
        [(0, 0), (W - 1, H - 1)],
        radius=RADIUS,
        fill=None,
        outline=border_color,
        width=BORDER,
    )

    import os
    os.makedirs(os.path.join(os.path.dirname(__file__), OUT_DIR), exist_ok=True)
    path = os.path.join(os.path.dirname(__file__), OUT_DIR, filename)
    img.save(path, "PNG")
    print(f"Saved {path}  ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    draw_frame(BODY_NORMAL, POINTS_NORMAL, BORDER_NORMAL,
               "starwars-bracket-frame-default-1v1.png")
    draw_frame(BODY_WIN, POINTS_WIN, BORDER_WIN,
               "starwars-bracket-frame-win-default-1v1.png")
    print("Done!")
