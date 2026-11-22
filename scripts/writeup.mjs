/**
 * Builds the submission write-up PDF.
 *
 *   node scripts/writeup.mjs
 *
 * Two A4 pages, rendered in Chromium and printed to docs/writeup.pdf. The font and
 * the screenshot are inlined as base64 so the render is self-contained and does not
 * depend on the dev server being up.
 */
import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "writeup.pdf");
const FONT = path.join(ROOT, "public/fonts/plus-jakarta-sans-var.woff2");
const SHOT = path.join(ROOT, "docs/shots/08-live-aws.png");

const env = (key, fallback = "") => {
  const line = readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.split("=").slice(1).join("=").trim() : fallback;
};

const b64 = (p) => (existsSync(p) ? readFileSync(p).toString("base64") : "");

const APP_KEY = env("NEXCONN_APP_KEY");
const LIVE = "https://34-227-57-42.sslip.io";
const REPO = "github.com/devbulchandani/bidlive";

const fontB64 = b64(FONT);
const shotB64 = b64(SHOT);

const CSS = `
@font-face { font-family:"Jakarta"; src:url(data:font/woff2;base64,${fontB64}) format("woff2"); font-weight:400 800; font-style:normal; }
:root { --ink:#0c0c0d; --ink2:#3a3a3d; --muted:#6d6d71; --faint:#9a9a9e; --line:#e4e4e0; --accent:#e8502a; --soft:#f4f4f1; }
* { box-sizing:border-box; }
html,body { margin:0; padding:0; }
body { font-family:"Jakarta", system-ui, sans-serif; color:var(--ink); font-size:9.2pt; line-height:1.5; -webkit-font-smoothing:antialiased; }
.page { width:210mm; height:297mm; padding:15mm 16mm 13mm; background:#fff; display:flex; flex-direction:column; position:relative; overflow:hidden; }
.page + .page { page-break-before:always; }
.kicker { display:flex; justify-content:space-between; align-items:baseline; font-size:7.4pt; letter-spacing:.14em; text-transform:uppercase; color:var(--faint); border-bottom:1px solid var(--line); padding-bottom:5px; }
h1 { font-size:26pt; line-height:1.02; letter-spacing:-.045em; margin:9mm 0 3mm; }
h1 em { font-style:normal; color:var(--accent); }
.lede { font-size:11pt; color:var(--ink2); max-width:150mm; line-height:1.45; }
.facts { display:flex; gap:4mm; margin:6mm 0 0; flex-wrap:wrap; }
.fact { border:1px solid var(--line); border-radius:3mm; padding:2.6mm 3.4mm; min-width:40mm; }
.fact span { display:block; font-size:6.8pt; letter-spacing:.12em; text-transform:uppercase; color:var(--faint); }
.fact b { display:block; font-size:9.2pt; margin-top:1mm; letter-spacing:-.01em; word-break:break-all; }
.fact.key { border-color:#f0c0af; background:#fdf1ec; }
.fact.key b { color:#c23c17; font-size:11pt; letter-spacing:.02em; }
h2 { font-size:11.5pt; letter-spacing:-.025em; margin:5.2mm 0 1.8mm; }
p { margin:0 0 2.4mm; color:var(--ink2); }
p strong { color:var(--ink); }
ul { margin:0 0 2.4mm; padding-left:4.4mm; color:var(--ink2); }
li { margin-bottom:1.4mm; }
table { width:100%; border-collapse:collapse; font-size:8.3pt; margin:1mm 0 2mm; }
th { text-align:left; font-size:6.8pt; letter-spacing:.1em; text-transform:uppercase; color:var(--faint); border-bottom:1px solid var(--line); padding:0 2mm 1.6mm 0; font-weight:600; }
td { padding:1.35mm 2mm 1.35mm 0; border-bottom:1px solid var(--line); vertical-align:top; color:var(--ink2); }
td:first-child { color:var(--ink); font-weight:700; width:31%; }
code { font-family:ui-monospace, monospace; font-size:7.5pt; background:var(--soft); padding:.3mm 1.1mm; border-radius:1mm; }
.shot { border:1px solid var(--line); border-radius:3mm; overflow:hidden; margin:3mm 0 0; }
.shot img { width:100%; display:block; }
.cap { font-size:7pt; color:var(--faint); margin-top:1.4mm; }
.flow { display:flex; align-items:center; gap:2mm; margin:2.5mm 0 3mm; font-size:7.6pt; flex-wrap:wrap; }
.flow div { border:1px solid var(--line); border-radius:2mm; padding:2mm 2.6mm; background:var(--soft); }
.flow div.hi { border-color:#f0c0af; background:#fdf1ec; color:#c23c17; font-weight:700; }
.flow span { color:var(--faint); }
.evidence { display:grid; grid-template-columns:1fr 1fr; gap:1.2mm 5mm; font-size:8.2pt; color:var(--ink2); }
.evidence div { display:flex; gap:1.8mm; }
.evidence i { color:#1c8b5f; font-style:normal; font-weight:700; }
.foot { margin-top:auto; border-top:1px solid var(--line); padding-top:2.4mm; display:flex; justify-content:space-between; font-size:7pt; color:var(--faint); }
`;

const pageOne = `
<div class="page">
  <div class="kicker"><span>BidLive — Nexconn Build Challenge 2026</span><span>Write-up</span></div>

  <h1>The auction is <em>the chat</em>.</h1>
  <p class="lede">A live auction that runs inside a chat room. Bids are messages in a Nexconn group
  channel, the clock and the minimum are enforced on the server, and the transcript is the record —
  which is also what the auction is rebuilt from after a restart.</p>

  <div class="facts">
    <div class="fact key"><span>App Key</span><b>${APP_KEY}</b></div>
    <div class="fact"><span>Live app</span><b>${LIVE.replace("https://", "")}</b></div>
    <div class="fact"><span>Source</span><b>${REPO}</b></div>
  </div>

  <h2>Why we built it</h2>
  <p>Auctions are social before they are transactional. A buyer asks whether the light meter is
  accurate, whether the case is original, whether the shutter fires at every speed. That conversation
  is what makes someone pay more than they planned. And in almost every marketplace, that conversation
  happens in one place while the price moves in another.</p>
  <p>Splitting them costs three things. The <strong>audience</strong>: watching and bidding become
  separate decisions, so a lurker has to leave the room to raise. The <strong>record</strong>: when a
  seller and buyer disagree about the closing price there is a chat log and a separate bid table, and
  neither is authoritative. And <strong>trust</strong>: a client-side clock can be lied to, a bid at
  0:01 cannot be answered, and a request to remove an abusive bidder is invisible to the room.</p>
  <p>BidLive removes the seam. The room where people ask about a lot is the room where its price moves.</p>

  <h2>What it does</h2>
  <p>You bid by typing a number or tapping a chip — the same box you use to chat. Every bid is a
  server-validated custom message, so the minimum increment, the clock, the bidder's permissions and
  the seller's exclusion are decided in one place, and no client can win with a faster machine or a
  wrong clock. A bid inside the final thirty seconds extends the lot by thirty, and the extension
  appears in the room rather than being applied quietly. The displaced leader gets a push, their card
  turns to <em>outbid</em> in place, and when the clock ends the lot settles with the winner, the final
  price and the bid count. A persistent rail keeps every auction you are in one click away.</p>

  <div class="shot"><img alt="BidLive lot room" src="data:image/png;base64,${shotB64}"></div>
  <div class="cap">The deployed app: lot room, live bid card, and the rail of auctions on the left.</div>

  <div class="foot"><span>BidLive · ${LIVE}</span><span>Page 1 of 2</span></div>
</div>`;

const pageTwo = `
<div class="page">
  <div class="kicker"><span>BidLive — Nexconn Build Challenge 2026</span><span>Integration</span></div>

  <h2 style="margin-top:2mm">Features that use the Nexconn SDK</h2>
  <table>
    <tr><th>Nexconn capability</th><th>Where BidLive uses it</th></tr>
    <tr><td>Chat SDK — group channel</td>
      <td>One channel per lot (<code>lot_yashica</code>, <code>lot_jordan</code>, <code>lot_vinyl</code>).
      The room <em>is</em> the channel: ordered delivery, offline sync and history come from it rather
      than from a socket we wrote.</td></tr>
    <tr><td>Chat SDK — custom messages</td>
      <td>Three types registered with <code>NCEngine.registerCustomMessages</code>:
      <code>bidlive:Bid</code>, <code>bidlive:Chat</code>, <code>bidlive:System</code>. Bids, clock
      extensions, recalls and settlements are structured messages, not text to be parsed.</td></tr>
    <tr><td>Chat SDK — message history</td>
      <td><code>BaseChannel.createMessagesQuery</code> reads a lot's transcript back on a cold start and
      the server replays it through the same auction rules. This is why there is no database.</td></tr>
    <tr><td>Chat SDK — live delivery</td>
      <td><code>NCEngine.addMessageHandler</code> receives bids as they happen;
      <code>addConnectionStatusHandler</code> drives the live/reconnecting indicator.</td></tr>
    <tr><td>Server API — user tokens</td>
      <td><code>/user/getToken.json</code> issues a per-user token from our backend. The App Secret
      never reaches the browser, and clients never publish a bid directly.</td></tr>
    <tr><td>Server API — channels &amp; messages</td>
      <td><code>/group/create.json</code> and <code>/group/join.json</code> make the room and its
      membership; <code>/message/group/publish.json</code> fans every auction event into the channel, so
      the transcript and the UI cannot disagree.</td></tr>
    <tr><td>Server API — private push</td>
      <td><code>/message/private/publish.json</code> delivers "you've been outbid" to the one person who
      was leading, with a push payload for when the tab is closed.</td></tr>
  </table>

  <h2>How it fits together</h2>
  <div class="flow">
    <div>Browser</div><span>— SSE, fast paint →</span>
    <div>Next.js routes</div><span>— server is the only writer →</span>
    <div class="hi">Nexconn Server API</div><span>→</span><div>Group channel</div>
  </div>
  <p>The browser also connects the Chat SDK directly for identity, membership, live receipt and
  history.</p>

  <h2>What we verified on the deployed app</h2>
  <div class="evidence">
    <div><i>✓</i><span>Landing, app and room all return 200</span></div>
    <div><i>✓</i><span><code>/api/health</code> reports <code>nexconnConfigured: true</code></span></div>
    <div><i>✓</i><span>SSE stream opens and sends a lot snapshot</span></div>
    <div><i>✓</i><span>A real bid is accepted and mirrored: <code>bidlive:Bid ok=true</code></span></div>
    <div><i>✓</i><span>Browser socket connects (the <code>SDK</code> chip)</span></div>
    <div><i>✓</i><span>Restart with an empty projection → the room replays itself</span></div>
  </div>

  <h2>Limits, stated plainly</h2>
  <ul>
    <li><strong>One instance.</strong> Auction state is a process-local projection, so a load-balanced
    pair would split the room. Redis or a Durable Object is the fix.</li>
    <li><strong>No payments.</strong> The settlement card is a handshake, not a transaction.</li>
    <li><strong>Identity is a display name.</strong> Anyone can claim one; there is no authentication.</li>
    <li><strong>The App Secret sits in EC2 user data</strong> for provisioning, and is rotated after
    judging.</li>
  </ul>

  <h2>What we would build next</h2>
  <ul>
    <li><strong>Proxy bidding.</strong> A maximum the server raises on your behalf, one increment at a
    time.</li>
    <li><strong>Pre-delivery validation.</strong> The callback is wired; enabling it means an invalid
    bid never exists for anyone.</li>
  </ul>

  <div class="foot"><span>${REPO}</span><span>Page 2 of 2</span></div>
</div>`;

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>BidLive — write-up</title><style>${CSS}</style></head>
<body>${pageOne}${pageTwo}</body></html>`;

const exe = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);

mkdirSync(path.dirname(OUT), { recursive: true });
const htmlPath = path.join(ROOT, "docs", "writeup.html");
writeFileSync(htmlPath, HTML);

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(1200);

// A page that overflows is clipped by `overflow:hidden`, and the PDF silently loses
// its footer. Compare scroll height to client height before printing instead.
const overflow = await page.evaluate(() =>
  [...document.querySelectorAll(".page")].map((el) => el.scrollHeight - el.clientHeight),
);
const bad = overflow.filter((px) => px > 1);
if (bad.length) {
  throw new Error(
    `page overflow (px): ${overflow.join(", ")} — trim content or tighten spacing`,
  );
}
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();

console.log(`wrote docs/writeup.pdf (${(statSync(OUT).size / 1024).toFixed(0)} KB)`);
