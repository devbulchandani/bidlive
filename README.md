# BidLive

**A live auction that runs inside a chat room.** Bids are messages in a Nexconn group channel, the
clock and the minimum are enforced on the server, and the transcript is the record — which is also
what the auction is rebuilt from after a restart.

**Live:** https://34-227-57-42.sslip.io · **Demo:** https://youtu.be/NQCWGp0c6As ·
**Built for:** Nexconn Build Challenge 2026

![Two windows at the same instant: Riya is outbid, Arjun is leading](assets/hero.png)

---

## Run it

```bash
npm install
cp .env.example .env.local   # optional — the app runs without credentials
npm run dev                  # http://localhost:3000
```

Without credentials the auction runs on a local event bus and the UI says
`Nexconn · local bus`. Add a key and secret and the same room is backed by Nexconn.

### The three screens

| Route | What it is |
|---|---|
| `/` | Landing page — what this is, plus a live lot you can bid on without signing up |
| `/app` | Every lot, your rooms first, the first lot featured |
| `/app/[lot]` | A room, inside a shell with a **persistent rail** of every auction you are in |

The rail is why there are not five browser tabs: it stays put while the lot in the middle changes,
and each row carries its own live countdown.

### Try the demo in 60 seconds

1. Open <http://localhost:3000/app/yashica?as=Riya> — you're Riya, bidding.
2. Open <http://localhost:3000/app/yashica?as=Arjun> in a second window.
3. Bid in one window; watch the other flip to `LEADING` / `OUTBID`.
4. Enter a second lot and switch between them in the rail — both countdowns keep running.
5. Open `?as=Meera` — Meera owns the lot, so you get the auctioneer controls: **+60s**,
   **Close in 30s**, and a mute list.

`?as=Name` is a demo shortcut; it sets the same identity the gate would. Old `/lot/x` links redirect
into the app.

---

## Why chat, not a bid button

Auctions are social before they are transactional: the condition question, the provenance photo, the
"going once" call. Split the conversation from the bidding and you lose three things — the audience
(watching and bidding become separate decisions), the record (a chat log and a bid table, neither
authoritative), and trust (a client-side clock can be lied to).

Here the composer does both jobs. Type text and you're chatting; type a number at or above the
minimum and the send button becomes the bid. Chips beside it give the next increment in one tap.

---

## Architecture

```
browser ──SSE──────────► route handlers ──────────────► Nexconn Server API
   │                     (single writer)                 (group channel per lot)
   │                        ├─ pure rules (auction.ts)
   │                        ├─ append-only event log (store.ts)
   │                        └─ placeBid / recall / moderate / settle (service.ts)
   └──Chat SDK────────────► connect · join · receive ───► same channel
```

**The server is the only writer**, which removes the whole class of bugs where two clients disagree
about who is winning:

- **Ordering** — every accepted bid gets a monotonic `seq`. Clients render by sequence, never arrival
  time, so two bids in the same millisecond resolve deterministically.
- **The clock** — `endsAt` lives on the server; `serverTime` rides with every push so a device with
  the wrong time still sees the truth.
- **Anti-snipe** — a bid inside the final 30s extends the lot by 30s, capped at five, and the
  extension is broadcast as a message rather than applied silently.
- **Recomputation** — the leader is derived by replaying the log (`recomputeTop`), so a recall
  recalculates from the transcript and can never drift from a counter.
- **Lazy settlement** — any read after `endsAt` settles the lot, so it works with no long-running timer.

`lib/auction.ts` is pure functions, and the same `validateBid` backs both the live API and the
pre-delivery callback, so the two paths cannot diverge.

---

## Where the data lives (there is no database)

On purpose. Two layers, both Nexconn:

| Layer | Holds | Lifetime |
|---|---|---|
| **Process memory** (`lib/store.ts`) | the live projection: lots, top bid, sequence, watchers, mute list | until restart — a cache, not the record |
| **Nexconn channel per lot** | every bid, chat and settlement as a custom message | 180 days |

On a cold start the projection is empty, so the room **replays itself out of the transcript**. The
browser holds the only authenticated chat session, so it reads channel history through the SDK and
posts it to `/api/lots/[id]/rehydrate`; the server replays those messages through the same rules that
accepted them:

- bids are re-checked (right lot, right sender, integer amount, seller excluded);
- sequence numbers are **re-issued** chronologically, because the originals were per-process;
- a channel accumulates every demo run, so replay finds the start of the current round — the last
  settlement, or the first bid that breaks the rule that every accepted bid must be higher;
- anything the engine would have refused is dropped.

That is the trust boundary: a client may hand the server a transcript, but not a fiction the auction
engine would reject. Clients still never publish a bid directly.

`/api/dev/reset` disables replay for the rest of the session — otherwise a reset would immediately
re-import the bids it just cleared.

---

## Nexconn integration

| Capability | Where it's used |
|---|---|
| **Group channel per lot** | the room's durable log: ordering, offline sync, history |
| **Custom messages** | `bidlive:Bid`, `bidlive:Chat`, `bidlive:System` — bids, extensions, recalls, settlements |
| **Message history** (`BaseChannel.createMessagesQuery`) | cold-start replay; the reason there is no database |
| **Live delivery** (`addMessageHandler`) | bids arriving in the room as they happen |
| **Connection state** (`addConnectionStatusHandler`) | the live / reconnecting indicator |
| **Server API — user tokens** | `/user/getToken.json`; the App Secret stays on the server |
| **Server API — channels** | `/group/create.json`, `/group/join.json` |
| **Server API — publish** | `/message/group/publish.json` fans every event into the channel |
| **Server API — private push** | `/message/private/publish.json` for "you've been outbid" |

### Enabling the real thing

```bash
NEXCONN_APP_KEY=...               # console.nexconn.ai → App Key
NEXCONN_APP_SECRET=...            # same environment as the key
NEXT_PUBLIC_NEXCONN_APP_KEY=...   # optional; the client falls back to /api/health
NEXCONN_API_BASE=https://api.us-light-api.com
NEXCONN_AREA_CODE=3
```

Run **`npm run check:nexconn`** first: it authenticates against every regional host and prints the
`NEXCONN_API_BASE` / `NEXCONN_AREA_CODE` your app needs. The wrong data centre looks identical to a
broken SDK, and that confusion costs hours — this app is on **North America** (`areaCode 3`), not the
Singapore default.

The client resolves its App Key from `/api/health` at runtime, so a deploy never depends on
`NEXT_PUBLIC_*` being present at build time. (That was a real bug: builds without it shipped a client
that connected to nothing.)

---

## What works today

- [x] Landing page with a live lot, real countdown and working bid links
- [x] Persistent rail: switch between every auction you are in, each with its own timer
- [x] Bid cards with `LEADING` / `OUTBID` / `WON` states rendered in place
- [x] Server-authoritative bidding: banded increments, rate limiting, seller exclusion
- [x] Anti-snipe extension, capped, announced in the room
- [x] Recall a bid → lead recomputed from the event log
- [x] Settlement with winner, final price, bid count; unsold when the reserve isn't met
- [x] Auctioneer controls: extend, close in 30s, mute/unmute a bidder
- [x] Outbid and settlement notices, in-app and as browser notifications
- [x] SSE with reconnect, gap detection and resync
- [x] Cold start replays the auction out of the Nexconn transcript (no database)
- [x] Degrades to a local bus with an honest badge when credentials are absent

## Deliberately out of scope

Payments, authentication beyond a display name, multi-tenant auction houses, and image uploads. Each
would have cost a day and none makes the auction mechanic more convincing.

---

## Design

A neutral product surface rather than a themed dashboard: light grey ground, white cards, a heavy
geometric sans (Plus Jakarta Sans) for display, Geist Mono for anything that ticks. One accent —
auction orange — carries live state and the primary bid action, so colour means something.

- **Real photography.** Every lot has an actual photograph (Wikimedia Commons; see
  `public/images/lots/CREDITS.json`). Product shots use `object-fit: contain` on white so nothing is
  cropped mid-object.
- **Hand-drawn icons.** `components/ui/LotIcon.tsx` is a small family on a 24px grid at one stroke
  weight; the rail tints each lot's tile by category instead of showing an emoji.

Fonts are self-hosted in `public/fonts` — no build-time network call, no Google Fonts dependency.

---

## Deployment

One long-lived Node process, one instance. Auction state is a process-local projection, so a
load-balanced pair would split the room.

- **AWS (what's live):** `./deploy/aws-deploy.sh` provisions EC2 from `.env.local`, installs Node 22,
  builds, and points Caddy at the instance's dotted IP in dashed form so `sslip.io` plus Let's Encrypt
  produce a real certificate. No SSH needed; an SSM instance profile is attached for diagnosis, and
  the boot log lands in `/var/log/bidlive-boot.log`. `./deploy/aws-teardown.sh` removes everything.
- **Render / Railway / Fly:** `render.yaml` is a Blueprint, and there is a `Dockerfile`.
- **Not** GitHub Pages (static only — no route handlers, no server secret) or Cloudflare Workers
  without a Durable Object rewrite (per-isolate state splits the room).

`npm start` honours `$PORT`.

---

## Recording the demo

Two outputs, both written to `docs/` (local only, gitignored):

| File | What it is |
|---|---|
| `docs/video/bidlive-full.mp4` | the submission cut — ~2 min, 1920×1080, narrated, one chapter per feature |
| `docs/video/bidlive-demo.mp4` | a 35-second silent two-window cut |
| `docs/BidLive.pdf` | the submission write-up |

```bash
npm run video       # chapters + narration + captions; needs ffmpeg and a Gnani key
npm run record      # the short silent two-window cut
node scripts/writeup.mjs
```

Narration is Gnani Vachana TTS (Timbre v3.0, voice *Arko*), falling back to macOS `say` when
`GNANI_API_KEY` is unset. Each chapter is recorded separately, the narration is synthesised first so
picture and voice share a length, and the transcript is generated from the measured durations so it
matches the video.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve (honours `$PORT`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:nexconn` | Find your data centre and verify the signature |
| `npm run video` | Build the narrated, chaptered demo |
| `npm run record` | Build the 35-second two-window demo |
| `node scripts/verify-sdk.mjs` | Prove the browser SDK receives a message live |
| `node scripts/rehearse.mjs` | Drive the full demo in two windows and capture screenshots |
| `node scripts/writeup.mjs` | Render the submission PDF |
| `POST /api/dev/reset` | Re-arm fresh demo lots (also a footer button in `/app`) |

---

## Credits

Lot photography from Wikimedia Commons (CC0 / public domain / CC BY-SA) — see
`public/images/lots/CREDITS.json`. Fonts: Plus Jakarta Sans (SIL OFL), Geist Mono (SIL OFL).
