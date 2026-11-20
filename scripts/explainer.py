"""Renders docs/explainer.png — a one-page, plain-language diagram of BidLive."""
from PIL import Image, ImageDraw, ImageFont

W, H = 2000, 1180
BG = (10, 10, 13)
CARD = (19, 19, 25)
CARD2 = (16, 16, 21)
LINE = (38, 38, 47)
INK = (243, 240, 233)
DIM = (150, 146, 138)
MUTE = (95, 92, 86)
GOLD = (229, 180, 85)
GOLD_SOFT = (240, 205, 138)
RED = (224, 85, 74)
GREEN = (95, 191, 143)

# SFNS is the only system face here that carries ₹ and ✓; Arial renders both as
# .notdef boxes. Bold is faked with a stroke, since the variable font exposes no
# bold instance to PIL.
FONT = "/System/Library/Fonts/SFNS.ttf"


def f(size):
    return ImageFont.truetype(FONT, size)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)


def rr(box, r, fill=None, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def t(xy, s, size, fill=INK, bold=False, anchor="la"):
    d.text(
        xy,
        s,
        font=f(size),
        fill=fill,
        anchor=anchor,
        stroke_width=1 if bold else 0,
        stroke_fill=fill,
    )


def bar(x, y, w, h=9, color=(70, 70, 82)):
    rr((x, y, x + w, y + h), h // 2, fill=color)


# ---------------------------------------------------------------- header
t((80, 62), "BidLive", 66, GOLD_SOFT, bold=True)
t((80, 148), "The auction is the chat. You bid by typing a number.", 34, INK)

# ---------------------------------------------------------------- two panels
TOP = 236
PH = 470
PW = 880

# left panel
rr((80, TOP, 80 + PW, TOP + PH), 20, fill=CARD2, outline=LINE)
t((112, TOP + 26), "The usual way", 34, DIM, bold=True)
t((112, TOP + 74), "Chat lives here. Bidding lives somewhere else.", 24, MUTE)

rr((112, TOP + 124, 112 + 380, TOP + 254), 14, fill=CARD, outline=LINE)
t((136, TOP + 142), "Chat tab", 20, MUTE, bold=True)
bar(136, TOP + 178, 250)
bar(136, TOP + 198, 190)
bar(136, TOP + 218, 280)

rr((528, TOP + 124, 528 + 380, TOP + 254), 14, fill=CARD, outline=LINE)
t((552, TOP + 142), "Bid form", 20, MUTE, bold=True)
bar(552, TOP + 178, 200)
rr((552, TOP + 206, 552 + 200, TOP + 242), 8, fill=(52, 52, 62))
t((566, TOP + 214), "Place bid", 18, MUTE)

# broken link between them
d.line([(492, TOP + 189), (528, TOP + 189)], fill=RED, width=3)
cx, cy = 510, TOP + 158
d.line([(cx - 9, cy - 9), (cx + 9, cy + 9)], fill=RED, width=3)
d.line([(cx - 9, cy + 9), (cx + 9, cy - 9)], fill=RED, width=3)

t((112, TOP + 288), "Two places. Two tabs. No shared record.", 24, RED)
t((112, TOP + 330), "A buyer asks a question in one, bids in the other,", 23, DIM)
t((112, TOP + 362), "and afterwards nobody can prove what was agreed.", 23, DIM)

# right panel
X2 = 1040
rr((X2, TOP, X2 + PW, TOP + PH), 20, fill=CARD, outline=(70, 58, 30))
t((X2 + 32, TOP + 26), "BidLive", 34, GOLD, bold=True)
t((X2 + 32, TOP + 74), "One room. The conversation is the bidding.", 24, DIM)

# message stream inside
rr((X2 + 32, TOP + 120, X2 + PW - 32, TOP + 404), 14, fill=(13, 13, 17), outline=LINE)

# chat bubble
rr((X2 + 56, TOP + 142, X2 + 56 + 300, TOP + 186), 12, fill=(26, 26, 34), outline=LINE)
bar(X2 + 76, TOP + 156, 240, color=(110, 108, 120))
bar(X2 + 76, TOP + 172, 160, color=(80, 80, 92))

# leading bid card
rr((X2 + 56, TOP + 204, X2 + PW - 56, TOP + 284), 12, fill=(34, 27, 12), outline=GOLD)
d.rounded_rectangle((X2 + 56, TOP + 204, X2 + 60, TOP + 284), radius=2, fill=GOLD)
t((X2 + 78, TOP + 216), "BID", 16, MUTE, bold=True)
t((X2 + 78, TOP + 238), "₹550", 44, GOLD_SOFT, bold=True)
rr((X2 + 232, TOP + 240, X2 + 232 + 104, TOP + 268), 6, fill=GOLD)
t((X2 + 240, TOP + 246), "LEADING", 17, (26, 20, 8), bold=True)

# outbid card (dimmed)
rr((X2 + 56, TOP + 300, X2 + PW - 56, TOP + 356), 12, fill=(16, 16, 21), outline=LINE)
t((X2 + 78, TOP + 312), "BID  ₹500", 26, (110, 106, 100))
rr((X2 + PW - 176, TOP + 314, X2 + PW - 88, TOP + 340), 6, outline=RED)
t((X2 + PW - 168, TOP + 319), "OUTBID", 15, RED, bold=True)

# composer
rr((X2 + 32, TOP + 418, X2 + PW - 32, TOP + 470), 12, fill=(10, 10, 13), outline=(70, 58, 30))
t((X2 + 52, TOP + 434), "Enter 600 or more", 22, (90, 88, 84))
rr((X2 + PW - 218, TOP + 428, X2 + PW - 52, TOP + 462), 9, fill=GOLD)
t((X2 + PW - 204, TOP + 435), "Bid ₹600", 21, (26, 20, 8), bold=True)

# ---------------------------------------------------------------- steps
SY = 788
t((80, SY - 46), "What happens when you type a number", 30, INK, bold=True)

SW = 566
GAPX = 40
for i in range(3):
    x = 80 + i * (SW + GAPX)
    rr((x, SY, x + SW, SY + 226), 18, fill=CARD2, outline=LINE)
    rr((x + 28, SY + 26, x + 28 + 44, SY + 26 + 44), 22, fill=(34, 27, 12), outline=GOLD)
    t((x + 50, SY + 33), str(i + 1), 26, GOLD, bold=True, anchor="ma")

t((80 + 92, SY + 34), "You type ₹550", 30, INK, bold=True)
t((80 + 92, SY + 78), "The same box you would use to chat.", 22, DIM)
bar(80 + 28, SY + 126, 380, 12, (58, 58, 70))
bar(80 + 28, SY + 152, 260, 12, (44, 44, 56))
t((80 + 28, SY + 186), "Text → message   ·   Number → bid", 20, GOLD_SOFT)

x2 = 80 + SW + GAPX
t((x2 + 92, SY + 34), "The server checks", 30, INK, bold=True)
t((x2 + 92, SY + 78), "Clock, minimum, is this person muted?", 22, DIM)
for j, s in enumerate(["Is the lot still open?", "Is it above the minimum?", "Is the bidder allowed to bid?"]):
    t((x2 + 28, SY + 126 + j * 34), "✓", 22, GREEN, bold=True)
    t((x2 + 62, SY + 124 + j * 34), s, 21, DIM)

x3 = 80 + 2 * (SW + GAPX)
t((x3 + 92, SY + 34), "Everyone sees it", 30, INK, bold=True)
t((x3 + 92, SY + 78), "The card flips in place, for the whole room.", 22, DIM)
rr((x3 + 28, SY + 126, x3 + 28 + 150, SY + 168), 8, fill=GOLD)
t((x3 + 40, SY + 134), "LEADING", 21, (26, 20, 8), bold=True)
rr((x3 + 192, SY + 126, x3 + 192 + 150, SY + 168), 8, outline=RED)
t((x3 + 206, SY + 134), "OUTBID", 21, RED, bold=True)
t((x3 + 28, SY + 186), "Plus a push: “you've been outbid”.", 20, DIM)

# ---------------------------------------------------------------- footer
d.line([(80, 1046), (W - 80, 1046)], fill=LINE, width=2)
t((80, 1072), "Every bid is a stored message — so the transcript is the ledger.", 27, GOLD_SOFT)
t((W - 80, 1078), "Nexconn Build Challenge 2026", 22, MUTE, anchor="ra")

img.save("docs/explainer.png", optimize=True)
print("docs/explainer.png", img.size)
