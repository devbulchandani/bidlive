"""Title and end cards for the demo video (2560x720 to match the 2-up composite)."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2560, 720
BG = (241, 241, 239)
INK = (12, 12, 13)
MUTED = (109, 109, 113)
ACCENT = (232, 80, 42)
SANS_B = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
SANS = "/System/Library/Fonts/Supplemental/Arial.ttf"
MONO = "/System/Library/Fonts/Supplemental/Andale Mono.ttf"


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.truetype(SANS, size)


def card(title, sub, foot, mark=True):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    if mark:
        # brand tile
        d.rounded_rectangle((120, 92, 120 + 56, 92 + 56), radius=16, fill=INK)
        d.text((120 + 18, 92 + 12), "B", font=font(SANS_B, 30), fill=(255, 255, 255))

    d.text((120, 190), title, font=font(SANS_B, 92), fill=INK)
    d.text((120, 320), sub, font=font(SANS, 40), fill=MUTED)

    # accent rule + foot
    d.rectangle((122, 430, 122 + 64, 436), fill=ACCENT)
    d.text((120, 470), foot, font=font(SANS, 30), fill=MUTED)
    return img


os.makedirs("docs/video", exist_ok=True)
card(
    "BidLive",
    "The auction is the chat. Bids are messages, the clock is on the server.",
    "Two windows, one lot — recorded from the running app",
).save("docs/video/card-title.png", optimize=True)

card(
    "Every bid is a message.",
    "So the transcript is the ledger — and a restart replays it back.",
    "github.com/devbulchandani/bidlive · built on the Nexconn Chat SDK",
).save("docs/video/card-end.png", optimize=True)

print("cards written")
