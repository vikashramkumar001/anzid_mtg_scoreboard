#!/usr/bin/env python3
"""
Knock out the 8 portrait-box interiors in the riftbound metagame card frame.

WHY: the metagame "Most Played Decks" legend portraits (.mpd-portrait) render
BELOW the gold frame (#mpd-chrome z-index 2 > portrait z-index 1) so the gold
border sits on top and frames them. For the portrait to show through, the navy
box interior baked into riftbound-metagame-cards.png must be transparent.

RUN THIS after re-exporting riftbound-metagame-cards.png from the PSD (the fresh
export has solid navy box interiors, which would hide the portraits). It detects
each box's real gold border and makes only the interior transparent — the border,
panels, pills and dividers are untouched. The hexagon gem rides on a separate
image (#mpd-hex -> riftbound-metagame-hex.png), so the gem is NOT needed here.

  python3 scripts/knockout-metagame-card-interiors.py

Requires opencv-python (cv2). Idempotent — re-running on an already-knocked-out
file is a no-op (the interior is already transparent).
"""
import cv2

F = 'public/assets/images/riftbound/metagame/riftbound-metagame-cards.png'
SLOTS = [(236, 137), (236, 318), (236, 502), (236, 688),
         (1276, 137), (1276, 318), (1276, 502), (1276, 688)]  # .mpd-card left/top, 157x157 nominal


def is_gold(px):
    b, g, r, a = int(px[0]), int(px[1]), int(px[2]), int(px[3])
    return a >= 128 and r > 140 and g > 95 and b < 150 and r >= b


def main():
    cards = cv2.imread(F, cv2.IMREAD_UNCHANGED)  # BGRA
    for (sx, sy) in SLOTS:
        ymid, xmid = sy + 78, sx + 78
        xs = [x for x in range(sx - 4, sx + 30) if is_gold(cards[ymid, x])];        xL = xs[0] if xs else sx + 2
        xs = [x for x in range(sx + 157, sx + 120, -1) if is_gold(cards[ymid, x])];  xR = xs[0] if xs else sx + 150
        ys = [y for y in range(sy - 4, sy + 30) if is_gold(cards[y, xmid])];         yT = ys[0] if ys else sy + 2
        ys = [y for y in range(sy + 157, sy + 120, -1) if is_gold(cards[y, xmid])];  yB = ys[0] if ys else sy + 150
        x0, x1, y0, y1 = xL + 3, xR - 2, yT + 3, yB - 2        # strictly inside the gold border
        cards[y0:y1, x0:x1, 3] = 0                              # interior -> transparent
        print(f'box {sx:>4},{sy:>3}: border L{xL} R{xR} T{yT} B{yB} -> knockout x{x0}-{x1} y{y0}-{y1}')
    cv2.imwrite(F, cards)
    print('done - 8 box interiors transparent; portraits now show through, gold border on top')


if __name__ == '__main__':
    main()
