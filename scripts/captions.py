"""Renders transparent caption overlays for the demo video.

    python3 scripts/captions.py <spec.json>

The homebrew ffmpeg here has no drawtext filter, so captions are composited as
full-frame PNGs instead — which also lets us control the type properly.
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
CONTENT_H = 984  # the app occupies the top; the caption owns the band below
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def build(text: str, out: str):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # the band itself
    d.rectangle((0, CONTENT_H, W, H), fill=(12, 12, 13, 255))

    font = ImageFont.truetype(FONT, 34)
    bbox = d.textbbox((0, 0), text, font=font)
    th = bbox[3] - bbox[1]

    band_h = H - CONTENT_H
    y = CONTENT_H + (band_h - th) // 2 - bbox[1]
    x = 54

    d.rectangle((x - 26, CONTENT_H, x - 20, H), fill=(232, 80, 42, 255))
    d.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    img.save(out)


spec = json.load(open(sys.argv[1]))
for item in spec:
    build(item["text"], item["out"])
    print("caption", item["out"])
