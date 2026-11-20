# Nexconn Build Challenge 2026 — Research, Prior Art & Idea Shortlist

Prepared: **Sat 20 Nov 2026, ~09:30 IST** · Deadline: **Mon 23 Nov 2026, 17:29 IST**
→ You have roughly **56 usable hours**, of which maybe 20–24 are realistic build hours.

---

## 0. The one-paragraph reality check

This is a **3-day sprint, not a product launch**. The winning move is not "the biggest idea" — it's
**one sharp mechanic, visibly enforced by the chat layer, demoed live with two people, submitted 12 hours early.**
Everything below is filtered through that constraint.

---

## 1. What the hackathon actually is

| Field | Detail |
|---|---|
| Event | [Nexconn Build Challenge 2026](https://internshala.com/competitions/nexconn-build-challenge-2026/) |
| Organiser | Nexconn, in collaboration with [Reskilll](https://reskilll.com/hack/nexconn/) |
| Hosted on | Internshala Competitions |
| Mode / Cost | Fully online · Free · Worldwide (mainland China excluded) |
| Team | Solo, or **2–4 members** |
| **Deadline** | **23 Nov 2026, 5:29 PM IST** (registration *and* submission, same instant) |
| Judging | 23–27 Nov · Winners announced **1 Dec 2026** |
| Prize pool | **$5,000** → $2,000 / $1,250 / $750 / $500 / $500 |
| Extras | Discounted AWS + Alibaba Cloud credits for winners |
| Theme | Build a **real-time chat-driven** app using the Nexconn Chat SDK |
| Hard requirement | **Nexconn Chat SDK or Chat UI integrated for real.** Call SDK optional |
| Platforms | Web, iOS, Android, Flutter |
| Must submit | Write-up **PDF containing your App Key**, demo video, **runnable app link**, **public GitHub repo** (traction proof optional) |
| Existing projects | **Allowed**, but the Nexconn integration must be genuinely new, and you must label what pre-existed |

**Named application areas:** social communities · gaming · workplace collaboration · marketplaces · humanitarian initiatives.

> ⚠️ Two deadline discrepancies float around listing sites (22 vs 23 Nov). Some aggregators say
> "applications close 22 Nov". **Treat 22 Nov, 20:00 IST as your real deadline.** Never let a timezone
> or a last-minute upload failure cost you the $2k.

---

## 2. The detail almost nobody will notice (your unfair advantage)

**Nexconn is the rebrand of RongCloud (RC), effective 27 March 2026.** Evidence: RC's docs carry the
banner *"Starting March 27, 2026, RC is rebranded as Nexconn"*
([RC docs](https://docs.rongcloud.io/guides/realtime-chat/intro-chat)), and Nexconn's own footer reads
*"Copyright 2026 RCLOUD GLOBAL PTE. LTD."*

Why this matters:

1. **The SDK is mature and battle-tested**, not a v1 beta that will break at 2 AM. RC has powered
   apps with hundreds of millions of users; Nexconn reuses RC's binary protocol (ordered, lossless,
   ~120 ms delivery).
2. **Full public docs already exist** — including RC-era docs that still apply.
3. **The free tier is production-graded**, not a toy sandbox.

### Free plan (why your "runnable app link" will actually stay up)

| Limit | Free Plan |
|---|---|
| MAU | **10,000** |
| Peak concurrent connections | 500 (5% of MAU) |
| Features | **Full Pro tier** — Direct, Group, Open, Community channels |
| Storage | 10 GB files + 10 GB upload |
| History | 180 days |
| Push | Multi-channel (APNs/FCM) included |
| Card required | No |
| Overage | $0.12/MAU, $0.90/PCC |

Source: [Nexconn free plan breakdown](https://www.nexconn.ai/blog/free-cross-platform-chat-sdk).
No credit card → **no expiry mid-judging**. This is a genuine advantage over builders who demo on a
trial that dies on day 3.

### Build-speed lever: the official AI integration skill

Nexconn ships an open-source **Chat Integration Skill** (works with Claude Code, Codex, Cursor,
Windsurf, Copilot) that reads live docs via `llms.txt` and scaffolds full-stack code — client +
**backend token endpoint** — across Web/Flutter/iOS/Android.
→ [Engineering guide](https://www.nexconn.ai/blog/free-cross-platform-chat-sdk) · docs at
[docs.nexconn.ai](https://docs.nexconn.ai).

**Use it.** In a 56-hour sprint, generating a correct auth-token backend (the #1 thing people get
wrong) is worth more than any clever UI. The `App Secret` must live server-side only — judges who are
the SDK vendor *will* look for this, and it's an easy credibility win.

---

## 3. What you'll actually be judged on (rubric is unpublished — so infer it)

No scoring rubric is public. Inference from the submission fields + how the sibling contest was judged:

| Likely criterion | Weight | How to win it |
|---|---|---|
| **Does it run?** Real, live, clickable | High | Host it. Two browser profiles + two phones in the video |
| **Depth of Nexconn integration** | High | Use ≥3 non-trivial primitives (custom messages, webhooks, moderation, community subchannels, translation) — not just text |
| **Originality** | High | "Something we wouldn't have thought to build" |
| **Usefulness / real problem** | Med-High | One clear user + one clear pain |
| **Polish / UX** | Med | Empty states, loading, error, connection-lost banner |
| **Write-up & demo video** | Med | The PDF is your pitch; the video is your product |
| **Traction** | Optional bonus | Even 5 real users + a screenshot helps |

---

## 4. Prior art: three close-analogue hackathons and what won

### A. CometChat **"Zero to Chat"** (Sep–Oct 2026) — *the closest analogue, run by a direct competitor*

Same shape as this event: 14 days, add chat/voice/video to anything, sponsored by a chat SDK vendor.
Judging was explicitly rubric-free: *"It runs. It's interesting. It's well-executed."*
([Unstop listing](https://unstop.com/hackathons/zero-to-chat-cometchat-hackathon-zero-to-chat-cometchat-hackathon-cometchat-1762674))

The three winners:

| Winner | What it was | The mechanic |
|---|---|---|
| **Pixel Town** (Katy) | Pixel-art town where chat follows you around the map | Walk up to someone → DM opens. Enter a room → group chat + video. Walk away → it ends |
| **KinesioLive** (Vineet) | Online physiotherapy that can *see* you | AI tracks joints on camera, streams data to the doctor 10×/sec inside the session |
| **Spoilsport** (Siddharth) | Watch-party chat for friends at different points in a series | Every message stamped with `ep + minute`; messages from ahead stay **blurred until you catch up** ([repo](https://github.com/Siddharth-Suri/spoilsport)) |

Announcement: [CometChat on LinkedIn](https://tm.linkedin.com/company/cometchat).

### B. Stream — **"The Barter App"** (student final-year project)
A service-exchange marketplace: "I'll design your logo if you fix my site." Cross-platform app +
Laravel backend + Stream chat. Won recognition not for novelty but for **flawless execution of a
mundane marketplace** ([Stream case study](https://getstream.io/blog/the-barter-app/)).

### C. Agora **HackFest 2025** — "Budget AI"
Voice-powered expense logger; speak an expense, it logs it (50s → 5s task). Made **Top 18** by
pairing conversational AI with one dead-simple workflow.

### The pattern behind all of them

> **Every winner is "chat where one domain rule is enforced as a messaging primitive."**
> Spoilsport gates messages by *watch position*. Pixel Town scopes chat by *physical location*.
> KinesioLive injects *sensor state* into the thread. The chat is not a feature — remove it and the
> product ceases to exist.

Corollary — **the losers cluster**. Expect ~60% of entries to be: Discord/WhatsApp clones, an
"AI chatbot in a chat bubble", CRUD chat with a login screen, or a feature salad (chat + maps + AI +
blockchain). Do not enter that crowd.

### Anti-patterns that lose this specific event
- ❌ A generic chat app with no domain rule (highest-volume failure mode)
- ❌ Chat as decoration on a CRUD app (chat bolted onto a to-do list)
- ❌ Video showing only screenshots / a Figma mock / "coming soon"
- ❌ Hardcoded `App Secret` in the client (vendor judges check this first)
- ❌ Dead link on submission day; demo users deleted; no second account so judges can't chat with themselves
- ❌ Feature breadth over depth — 6 half-features beat nothing, but 1 deep mechanic beats 6
- ❌ Submitting an unlisted/tiny repo with no README run instructions

### Category arbitrage (a free edge)
The five named areas are **not** equally contested. Most solo builders default to *social* and
*marketplace*. **Workplace collaboration** and **humanitarian** are thin — and they're the two where
Nexconn's enterprise/humanitarian positioning is strongest. Picking a less-crowded category means
your idea is compared against fewer lookalikes.

---

## 5. Capability → demo-moment cheat sheet

What Nexconn gives you that a plain WebSocket doesn't, and the moment each one buys you in a video:

| Nexconn capability | The demo moment it unlocks |
|---|---|
| **Direct / Group / Open / Community channels** | Community = nested subchannels + member groups (rare; most rivals stop at groups) |
| **Custom messages + metadata** | Structured cards *inside* chat: bids, offers, status, verdicts, gate keys |
| **Message extensions** | Emoji reactions + mutable message status (e.g. "accepted", "paid") |
| **Pre-message callback (server)** | **Block/transform a message before anyone sees it** — the single most underused superpower here |
| **Post-message webhook** | Your backend reacts to any message → bot reply, LLM call, ledger update |
| **AI text translation (built in)** | 4 users, 4 languages, one thread — no third-party API |
| **Voice-to-text (built in)** | Speak in Hindi → lands as readable text + translated |
| **Read receipts + typing + presence** | The "they're typing…" tension shot every demo needs |
| **Recall / edit / reply / forward / search** | Undo-a-bid, edit-a-spec, quote-a-clause |
| **Multi-device sync** | Start on phone, finish on laptop — subtle, hard, impressive to engineers |
| **Offline queue / ordered sync** | Airplane mode → reconnect → messages arrive in order, nothing lost |
| **Moderation: mute lists, freeze, block, content safety** | Live "cool-down" of an abusive bidder, visibly enforced |
| **Broadcast announcements / push** | Outbid push notification arriving on a locked phone |
| **E2EE** | "Private by default" claim for sensitive threads |
| **Call SDK (optional)** | One-tap escalate from chat → voice; only add if it's load-bearing |

**Scoring formula I used for ideas:**
`Win chance ≈ (novelty × demo-legibility × platform fit) / build risk`, capped by 56 hours.

---

## 6. Eight ideas, scored

| # | Idea | Category | Novelty | Demo | Feasible in 56h | Nexconn fit | Risk |
|---|---|---|---|---|---|---|---|
| 1 | **BidLive** — live auction inside chat | Marketplace | 7 | **10** | 9 | 8 | Low |
| 2 | **Kavach** — scam shield that eats the message | Marketplace / Safety | 8 | 9 | 7 | **10** | Med |
| 3 | **Setu** — SMS bridge to feature phones | Humanitarian | **9.5** | 9 | 5 | 9 | **High** |
| 4 | **Tag** — QR-anchored threads for physical assets | Workplace | 8 | 8 | **9** | 9 | Low |
| 5 | **Sandook** — time-locked / condition-locked chat | Social | 7 | 8 | 9 | 6 | Low |
| 6 | **Baithak** — translation-native community rooms | Social | 5 | 8 | 8 | **10** | Low |
| 7 | **Ops Copilot** — AI member that runs the task board | Workplace | 5 | 7 | 7 | 7 | Med |
| 8 | **Safe Room** — anonymous peer support + escalation | Humanitarian | 6 | 6 | 6 | 7 | Med-High |

---

### 1. BidLive — the auction *is* the chat
**One-liner:** A live auction where bidding happens by typing. Every bid is a custom message; the room
settles itself.

**The mechanic:** an `OpenChannel` per auction lot. Bids are custom messages carrying `{amount, bidder,
ts}`. Server webhook validates, re-broadcasts a "leading bid" card, and pushes "you've been outbid" to
everyone who was ahead. Anti-snipe: a bid in the last 30s extends the lot by 30s (visible countdown
card). Mute-list a shill bidder live; recall a fat-fingered bid typed with one extra zero.

**Why it wins:** live, competitive, two-phone demo with real tension — and every primitive is load-
bearing (open channel, custom messages, webhook, push, moderation, recall). "Outbid" push arriving on
a locked phone is a killer 3-second shot.

**Trim to fit:** skip payments. Show a "SOLD" settlement card. Judges care that chat drove a
transaction, not that money moved.

**Demo script (75s):** Two laptops side by side. Auctioneer says "Lot 1: vintage camera, ₹500." Phone A
bids 550 → card appears for both. Phone B bids 600 → **Phone A's locked screen shows "Outbid!"**.
Phone A types 6000 by accident → recalls it → "fat-finger refunded" toast. Clock hits 0:29 → bid by B →
"Snipe blocked, +30s". Settle → SOLD card, both sides see winner.

---

### 2. Kavach — the scam message never lands
**One-liner:** A marketplace chat with a safety layer that intercepts fraud *before delivery*.

**The mechanic:** wire the **pre-message callback**. Every outbound buyer↔seller message is scored
(rules + LLM) for Indian-marketplace scam patterns: "pay ₹500 token on UPI", "send OTP to confirm",
"contact me on WhatsApp", gibberish QR images, urgency + off-platform pressure. Risky messages are
**held and replaced** with an inline safety card: *"This message looks like a payment scam. Why:
asks for UPI transfer before order."* with buttons **Report / Block / Show anyway**. Sender never
knows the block happened — the victim just sees a shield.

**Why it wins:** it's the only idea that uses the interception primitive (nobody else will), it's
*visibly* dramatic (a scary message turns into a red card in real time), and it maps to a real Indian
pain (UPI/marketplace fraud). Nexconn markets "message content safety" as a pillar — you'd be the
case study. OLX/Quikr-style buyer–seller is a listed category.

**Risk:** needs a fast callback (<200 ms target); keep the classifier rules-first, LLM second, and
pre-warm. Have a **fallback demo path**: if the callback is slow, run the same logic as a
post-message webhook that edits the message into the shield card (defensible, still impressive).

**Demo script (75s):** Two phones, buyer and seller. Seller types "Bhai, ₹800 advance UPI kar do,
phir address bhejta hoon." Buyer's phone shows *shield card*, not the text. Toggle "Show anyway" →
strikethrough original + red highlights. Second: seller sends a QR image → blocked as "payment QR
before order". Third: normal message → flows untouched (prove you're not blocking everything).

---

### 3. Setu — a bridge from the internet to a ₹500 phone
**One-liner:** One chat room where smartphone users and feature-phone users are equal members via SMS.

**The mechanic:** inbound SMS → your webhook → Nexconn server API posts into a `GroupChannel` as a
custom message attributed to that phone number. Replies in the room → outbound SMS back. Plus a
voice-to-text path: farmer leaves a voice note in the app, it's transcribed *and translated into
Hindi/Marathi*, then SMSed out as text.

**Why it wins:** the most differentiated entry you can submit — "half my users don't have the app."
It directly serves the *humanitarian* and *agri* framing, and demonstrates server-side depth
(webhooks + server API + translation), which reads as genuinely senior work. One screenshot — a
phone-that-can't-install-apps, visibly inside a modern chat thread — is a story.

**Risk (this is why it's ranked 3rd):** telephony provisioning can eat 4 hours. Mitigations: use a
Twilio trial number (needs approval), or a local SMS gateway, or **simulate honestly** — a "Virtual
SMS Gateway" page that injects an inbound SMS into the same webhook, clearly labelled as a stand-in.
A lab-school simulation is fine if disclosed; a broken Twilio integration is not.

**Build only if:** you have a team of 2+ or you already have Twilio set up.

---

### 4. Tag — every physical thing has a chat history
**One-liner:** Stick a QR code on an object. Scan it. You're in that object's permanent thread.

**The mechanic:** each QR encodes an asset ID. Scanning resolves to a `GroupChannel` per asset inside a
`CommunityChannel` per site/floor. Photos, voice notes, and a custom "Service log" message
(`{action, part, cost, technician}`) accumulate as living maintenance history — 180-day retention is
the point. Roles: residents post issues, technicians close them, facility manager freezes a thread.

**Why it wins:** "chat as infrastructure" is the freshest framing in this list and the least contested
category. Demoing by scanning a QR taped to the chair next to you is *physical*, memorable, and
impossible to fake. Enterprise credibility = exactly what a B2B comms vendor wants to show.
Also the **cheapest to build well** (QR + one channel per asset + 2 custom message types).

**Demo script (60s):** Scan QR on a desk fan → thread opens with 6 months of history. Post a photo of
the broken blade → technician gets push, replies with a "replacement ordered" status card. Scan a
second asset → separate clean thread. Show the site's community view listing 40 assets.

---

### 5. Sandook (time-vault) — messages that aren't yours to read yet
**One-liner:** Chat rooms where messages stay sealed until a condition is met.

**The mechanic:** each message carries a `sealedUntil` timestamp (or a condition like "when you finish
the module"). Until then it renders as a blurred envelope with a countdown; it unlocks live, in-thread,
the moment the clock passes — with a push. Group vaults for families, batches, or a couple's
anniversary.

**Why it wins:** emotional demo, trivially legible, and technically clean (custom message + timer +
push + metadata). Risk: reads as a gimmick and is thinner on "utility" for judges weighing real-world
value. Best used as a **feature inside** another idea rather than a standalone entry.

---

### 6. Baithak — a room that speaks five languages
**One-liner:** Community rooms where every message arrives in *your* language, with the original one tap away.

**The mechanic:** build on Nexconn's **built-in AI translation** and **voice-to-text** (no third-party
key needed). Every message stores original + per-user translation. The twist that lifts it above
"translate button": a **register/idiom layer** (Hinglish, Tamil-English tanglish, slang glossaries) and
"reply in my language" one-tap. Community subchannels per topic, moderation for language abuse.

**Why it wins:** perfect on-brand for Nexconn's SEA/India positioning, and cheap to build. Risk: lowest
novelty score here — translation is a feature, not an idea. Add a *rule* (e.g. your message is only
delivered if it can be faithfully translated; ambiguous idioms get a "clarify?" card) to make chat
load-bearing.

---

### 7. Ops Copilot — the AI teammate that owns the task board
**One-liner:** An AI member *inside* a group chat that converts chatter into tracked tasks, and tasks
back into chat.

**Mechanic:** bot joins `GroupChannel`s; extracts commitments ("I'll ship the invoice fix by Thu"),
posts a task card (custom message); emoji reactions = status changes (✅ done, 👀 in progress);
daily digest via broadcast. Human can ask "what's blocked?" in-thread.

**Why:** realistic workplace value, showcases message extensions + reactions + broadcast. Risk:
AI-in-chat is the most crowded idea type in 2026; you'd need exceptional polish to stand out.

---

### 8. Safe Room — anonymous peer support with a human escape hatch
**One-liner:** Anonymous moderated support rooms where a conversation can be escalated to a verified
counsellor in one action.

**Mechanic:** persistent anonymous identity mapping (server-side), community subchannels per topic,
aggressive moderation + content-safety hooks, one-tap "escalate" that opens a private `DirectChannel`
with a counsellor role and carries the (consented) thread context.

**Why:** highest social impact; plays to moderation + community channels. Risk: ethical and safety
claims invite scrutiny, you can't responsibly half-build crisis support, and the demo is dark rather
than delightful. Skip unless you have a domain advisor.

---

## 7. Recommendation

### 🥇 If you're solo and want maximum win probability → build **BidLive**
It's the only idea scoring 10 on demo-legibility, and every primitive is unavoidable. You cannot
accidentally build a boring demo: a live auction with two bidders *is* the video. Lowest risk of a
half-finished submission.

### 🥈 If you want the "most impressive to the sponsor" pick → build **Kavach**
Highest platform-fit: it's the only entry that will use pre-delivery interception, and it tells
Nexconn a story about their own safety stack. Slightly more risk (callback latency, classifier quality).

### 🥉 If you have 2+ people and ≥8 hours for telephony → build **Setu**
Highest ceiling, most differentiated, most likely to be *remembered*. Highest chance of ending up with
a broken bridge.

### The one I'd actually pick in your seat
**BidLive, with Kavach's shield as the "trust" layer** — one product, two headline mechanics: *bid live,
and the scammer's message never reaches you.* You get the high-energy demo **and** the platform-safety
story, and both reuse the same channel plumbing. Only do this if the core auction is running by
Sunday noon; otherwise drop the shield.

### Don't build a 4th idea. Ship one.

---

## 8. 56-hour plan for BidLive (adjust ±4h)

### Sat 20 Nov (today, ~10h)
| Time | Task |
|---|---|
| Now → +1h | Nexconn console account → Development App Key. Read the [web quickstart](https://docs.nexconn.ai). Run the official samples until "Hello" sends |
| +1h → +2h | Scaffold Next.js + `@nexconn/engine` `@nexconn/chat` `@nexconn/chatui`. **Backend token endpoint** (`/api/token`) holding `App Secret`. Never in the client |
| +2h → +4h | Two-user login (just a username → token flow). Connect, render a `DirectChannel`. **Milestone: two browsers can chat** |
| +4h → +7h | `OpenChannel` per lot. Bid input parses `₹/k` shorthand. Custom message `{type:'bid', amount, maker}` renders as a bid card |
| +7h → +10h | Server webhook: validate bid > current, update lot state, broadcast "leading bid" card. Outbid notification via push |

### Sun 21 Nov (~12h)
- Anti-snipe extension + countdown card (2h)
- Recall a bid + "fat-finger" toast; edit a lot's description (2h)
- Mute-list a shill bidder live, visible to the room (1.5h)
- Settlement card on close + winner/loser states (2h)
- Polish pass: empty states, connection-lost banner, loading skeletons, mobile widths (2.5h)
- **Deploy** to Vercel + production App Key. Test on 2 phones, 2 laptops, one airplane-mode run (2h)

### Mon 22 Nov (deadline-safe day)
- Record the 75-second demo **three takes**, pick the cleanest (2h). 1080p, no face needed, visible cursor
- Write the PDF: problem → mechanic → architecture diagram → **App Key** → which Nexconn features and
  why → what pre-existed (or "built from scratch") → limitations → what you'd build next (2h)
- Public GitHub repo: README with 3-step run instructions, `.env.example`, screenshots, architecture
- **Submit by 14:00 IST.** Buffer for upload failures. Do not touch the code after submitting

**Definition of done:** a stranger can open the link, click "Enter auction", and be bidding in <20s,
with no login wall, no setup, no empty screen.

---

## 9. Submission checklist (this is where good projects die)

- [ ] PDF includes the **App Key** (Development key is fine) — **App Secret excluded**, always
- [ ] PDF states clearly: built from scratch, or *exactly* which parts pre-existed
- [ ] Demo video < 3 min (target **75s**), shows the app **running**, real cursor, two accounts
- [ ] Runnable link is live, public, no auth wall, loads in <3s on mobile data
- [ ] Public GitHub repo, open in a fresh browser (not logged in), README with run steps + `.env.example`
- [ ] **Two demo accounts pre-created** with obvious credentials, so judges can log in as both
- [ ] Demo data seeded (lots, history, assets) — never an empty first screen
- [ ] Connection-lost + empty + error states all render something sensible
- [ ] Repo has no secrets committed (`git log -p | grep -i secret`)
- [ ] Team members + roles listed; all ≤4
- [ ] Submitted **≥12h before** the deadline
- [ ] README links the demo video + live app (judges read the repo first)

---

## 10. Write-up skeleton for the PDF (2 pages max)

1. **Problem** — 3 lines, one concrete person ("A collector in Jaipur misses the last bid because he was driving").
2. **What we built** — one sentence + one screenshot.
3. **The mechanic** — the rule, stated in one bold line.
4. **Architecture** — diagram: client ⇄ Nexconn ⇄ webhook ⇄ your server (token + auction state).
5. **Nexconn features used & why** — table: feature → what it enabled → why a plain WebSocket couldn't.
6. **App Key** — labelled, copy-pasteable.
7. **Pre-existing vs new** — explicit.
8. **Security note** — App Secret server-side; tokens issued post-auth. (This line earns credibility.)
9. **Limitations** — 2 honest ones (e.g. "no payments", "single-tenant auctions"). Honesty reads as seniority.
10. **Next** — the 1 feature that would make it a business.

---

## Sources

- [Hackathon page — Internshala Competitions](https://internshala.com/competitions/nexconn-build-challenge-2026/)
- [Reskilll event listing](https://reskilll.com/hack/nexconn/) · [Reskilll 2026 hackathons](https://reskilll.com/allhacks/2026)
- [Nexconn — In-app Chat API & SDK (feature list)](https://www.nexconn.ai/product/chat)
- [Nexconn — Cross-platform chat integration guide (free plan, architecture, code)](https://www.nexconn.ai/blog/free-cross-platform-chat-sdk)
- [Nexconn developer docs](https://docs.nexconn.ai)
- [Nexconn free-plan announcement (Oct 2026)](https://www.manilatimes.net/2026/10/22/tmt-newswire/media-outreach-newswire/nexconn-launches-free-chat-plan-for-up-to-10000-mau-with-full-pro-features-and-additional-cloud-discounts/2451544/amp)
- [RC docs — rebrand notice + message callbacks](https://docs.rongcloud.io/guides/realtime-chat/intro-chat) · [Pre-messaging callback](https://docs.rongcloud.io/platform-chat-api/moderation/msgcb)
- [CometChat Zero to Chat — judging & timeline](https://unstop.com/hackathons/zero-to-chat-cometchat-hackathon-zero-to-chat-cometchat-hackathon-cometchat-1762674)
- [CometChat Zero to Chat — winners announcement](https://tm.linkedin.com/company/cometchat) · [Spoilsport repo](https://github.com/Siddharth-Suri/spoilsport)
- [Stream — The Barter App case study](https://getstream.io/blog/the-barter-app/)
- [`@nexconn/chatui` on npm](https://www.npmjs.com/package/@nexconn/chatui) · [Flutter Chat UI kit](https://pub.dev/packages/ai_nexconn_chatui_plugin)
