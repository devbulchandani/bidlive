# Hosting

The short version: **one long-lived Node process, one instance.** Nothing else meets the
requirements of this app.

## What the app needs, and why

| Requirement | Why | Consequence |
|---|---|---|
| Node runtime | all 10 API routes are `runtime = "nodejs"` | no static export, no edge-only runtime |
| A server-side secret | the App Secret signs every Nexconn Server API call | the browser must never receive it |
| Streaming responses | two routes hold SSE connections open (`/api/lots/[id]/stream`, `/api/notifications/stream`) | the host must support long-lived HTTP responses |
| **One process, one instance** | the auction projection lives in `globalThis` memory, and event fan-out is an in-process listener set | a bid written by instance A cannot notify a subscriber on instance B |

## Options, honestly assessed

### GitHub Pages — no

Pages serves static files. There is no Node process, so `/api/*` does not exist, the token
endpoint cannot issue Nexconn tokens, and the App Secret would have to be shipped to the
browser. A static export would give you a landing page whose "Start bidding" button leads to
a dead app.

### Cloudflare Workers / Pages — not without a rewrite

`wrangler` is installed and Workers can stream, so this looks tempting. The blocker is state:
Workers are isolated and requests spread across isolates. A bid accepted in one isolate would
not reach an SSE subscriber connected to another, so the room would randomly lose updates.

The correct architecture there is a **Durable Object** holding the lot state with WebSockets
attached to it, plus the OpenNext adapter for Next.js. That is a real migration — rewriting
the store and the fan-out, then re-verifying bid ordering, anti-snipe and replay — and it is
not a change to make the day before submission.

### AWS — see [HOSTING-AWS.md](HOSTING-AWS.md)

EC2 t3.micro with [`deploy/ec2-user-data.sh`](../deploy/ec2-user-data.sh) is the best fit on
AWS: one process, always on, no cold start, no Docker. Free for 12 months on a new account,
about $7.50/month after.

### Render — no CLI needed

[`render.yaml`](../render.yaml) is a Blueprint, so there is nothing to install.

1. Push the repo (already done).
2. Render dashboard → **New → Blueprint** → pick `devbulchandani/bidlive`.
3. Paste the three secrets when prompted: `NEXCONN_APP_KEY`, `NEXCONN_APP_SECRET`,
   `NEXT_PUBLIC_NEXCONN_APP_KEY`. The data-centre values are already in the file.
4. First build takes ~3 minutes; the service appears at `https://bidlive.onrender.com`.

`render.yaml` sets the health check to `/api/health`, so a broken deploy fails loudly instead
of serving a 500 to a judge.

**The free plan sleeps** after 15 minutes idle. The first visitor waits roughly 40 seconds
while the process boots and the room replays itself out of Nexconn. That works — the replay
feature exists for exactly this — but judge-perceived latency is real. Upgrade to `starter`
for the submission window, or point a free uptime pinger at `/api/health` every 10 minutes.

### Docker, for anything else

```bash
docker build -t bidlive --build-arg NEXT_PUBLIC_NEXCONN_APP_KEY=your_key .
docker run -p 3000:3000 --env-file .env.local bidlive
```

Deploy that image to Fly.io, Railway, Koyeb, or a small VPS. Same rules: **one instance**, no
autoscaling, no serverless.

## Environment variables

| Key | Where it comes from |
|---|---|
| `NEXCONN_APP_KEY` | Console → App Key (Production) |
| `NEXCONN_APP_SECRET` | same page — server only, never in the client |
| `NEXT_PUBLIC_NEXCONN_APP_KEY` | the same App Key, safe in the browser |
| `NEXCONN_API_BASE` | `https://api.us-light-api.com` for this app |
| `NEXCONN_API_BACKUP` | `https://api-b.us-light-api.com` |
| `NEXCONN_AREA_CODE` / `NEXT_PUBLIC_NEXCONN_AREA_CODE` | `3` (North America) |

`NEXT_PUBLIC_*` is **inlined at build time**. Changing it requires a rebuild, not just a
restart — a redeploy with a stale public key produces a client that connects to the wrong
region and silently receives nothing.

## After deploying, verify in this order

```bash
curl -s https://your-app/api/health | python3 -m json.tool
```

1. `nexconnConfigured: true`, and `nexconnApiBase` points at your region.
2. Open `/` — the hero shows a live lot with a real countdown.
3. Open `/app` → enter a lot → the `SDK · n` chip appears once the socket connects.
4. Place a bid → confirm `nexconnRecent` in `/api/health` shows `bidlive:Bid ok=true`.
5. Open the channel in the Nexconn console and check the message is there.

If step 3 shows `SDK …` forever, the App Key and the area code disagree — that is the single
most common failure and it looks identical to a broken SDK.

## Costs

- Render free: $0, sleeps, cold start ~40s.
- Render starter: ~$7/month, always on, adequate for the judging window.
- Fly.io: pay-as-you-go, roughly the same for one shared-cpu-1x machine kept awake.
