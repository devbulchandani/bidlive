/**
 * Builds the full demo video, one chapter per feature.
 *
 *   node scripts/video.mjs
 *
 * Every chapter is self-contained: it opens its own browser context, navigates,
 * performs the beat, and closes. Narration is synthesised first with macOS `say`
 * so the picture can be padded to the voice, then a caption overlay is composited
 * (this ffmpeg has no drawtext) and the segments are concatenated.
 *
 * Outputs
 *   docs/video/bidlive-full.mp4     1920×1080, narrated
 *   docs/video/transcript.md        chapters with timestamps
 *   docs/video/voiceover.txt        narration only, for re-recording in Clipchamp
 */
import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const BASE = "http://localhost:3000";
const OUT = "docs/video";
const TMP = `${OUT}/chapters`;
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const VOICE = process.env.VOICE || "Rishi"; // fallback narrator, used when no Gnani key

/* Gnani Vachana TTS — the narrator. Falls back to macOS `say` without a key. */
const GNANI = {
  url: "https://api.vachana.ai/api/v1/tts/inference",
  voice: process.env.GNANI_VOICE || "Arko",
  model: process.env.GNANI_MODEL || "timbre-v3.0",
  language: process.env.GNANI_LANGUAGE || "en-IN",
  speed: Number(process.env.GNANI_SPEED || 1.0),
  ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

function gnaniKey() {
  if (process.env.GNANI_API_KEY) return process.env.GNANI_API_KEY.trim();
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith("GNANI_API_KEY="));
    return line ? line.split("=").slice(1).join("=").trim() : "";
  } catch {
    return "";
  }
}

/** Synthesises one chapter's narration to a 48 kHz wav. */
async function narrate(text, out) {
  const key = gnaniKey();
  if (!key) {
    const aiff = out.replace(/\.wav$/, ".aiff");
    await run("say", ["-v", VOICE, "-o", aiff, text]);
    await run(FFMPEG, ["-y", "-v", "error", "-i", aiff, "-ar", "48000", "-ac", "2", out]);
    return "say";
  }

  const res = await fetch(GNANI.url, {
    method: "POST",
    headers: {
      "X-API-Key-ID": key,
      "Content-Type": "application/json",
      "User-Agent": GNANI.ua,
      Origin: "https://app.gnani.ai",
      Referer: "https://app.gnani.ai/",
    },
    body: JSON.stringify({
      text,
      voice: GNANI.voice,
      model: GNANI.model,
      language: GNANI.language,
      speed: GNANI.speed,
      audio_config: {
        sample_rate: 48000,
        num_channels: 2,
        sample_width: 2,
        encoding: "linear_pcm",
        container: "wav",
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`gnani ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  return "gnani";
}
const W = 1920;
const H = 1080;
const CONTENT_H = 984; // the app fills this; the caption band owns the rest

const exe = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const post = async (url, body) => {
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
};
const act = (body) => post("/api/lots/yashica/action", { lotId: "yashica", ...body });

async function probe(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file,
  ]);
  return Number(stdout.trim());
}

const ROOM = `${BASE}/app/yashica?as=Riya`;

/* ------------------------------------------------------------------ chapters
   `skip` trims the page load off the front of the clip, so a cut lands on the
   beat rather than on a spinner. Every chapter navigates for itself.          */

const CHAPTERS = [
  {
    id: "01-intro",
    caption: "BidLive — the auction is the chat",
    narration:
      "BidLive is a live auction that runs inside a chat room. There is no bidding form and no second tab. The room where people ask about a lot is the room where its price moves.",
    skip: 2.2,
    async run(page) {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await sleep(2600);
      await page.evaluate(() => window.scrollBy({ top: 430, behavior: "smooth" }));
      await sleep(2800);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await sleep(1600);
    },
  },
  {
    id: "02-one-input",
    caption: "One input does both jobs",
    narration:
      "Inside the lot, one box does both jobs. Type a question and it is a message. Type a number, or tap a chip, and it is a bid. The composer never changes, and neither do you.",
    skip: 2.8,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(3000);
      await page.locator(".composer input").click();
      await page.keyboard.type("Any haze in the viewfinder?", { delay: 40 });
      await sleep(700);
      await page.keyboard.press("Enter");
      await sleep(2200);
      await page.mouse.move(760, 940);
      await sleep(1400);
    },
  },
  {
    id: "03-tap",
    caption: "One tap puts you in front",
    narration:
      "Fifty rupees is the whole increment, so one tap is usually enough. The bid lands as a message, and everyone in the room sees the same card.",
    skip: 2.6,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      await page.locator(".bid-strip button").nth(0).click();
      await sleep(2400);
      await page.mouse.move(700, 980);
      await sleep(2400);
    },
  },
  {
    id: "04-rules",
    caption: "The server holds the rules",
    narration:
      "The server decides what counts. A bid below the minimum is refused outright. A seller cannot bid on their own lot, and a bidder the auctioneer has muted is refused too.",
    skip: 2.6,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      await page.locator(".composer input").click();
      await page.keyboard.type("560", { delay: 110 });
      await sleep(1000);
      await page.keyboard.press("Enter");
      await sleep(2800);
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await sleep(900);
      await page.mouse.move(900, 700);
      await sleep(2000);
    },
  },
  {
    id: "05-outbid",
    caption: "Outbid in place, with a push",
    narration:
      "Arjun is in his own window. When he bids five hundred and fifty, her card turns to outbid in place, and she gets a push. The person who was leading is the only one who gets told.",
    skip: 2.6,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      await act({ type: "bid", userId: "arjun", name: "Arjun", amount: 550 });
      await sleep(2600);
      await page.mouse.move(820, 700);
      await sleep(2400);
    },
  },
  {
    id: "06-recall",
    caption: "Withdrawing a bid recomputes the lead",
    narration:
      "A bid can be withdrawn while it is not winning. The lead is recomputed by replaying the transcript rather than decrementing a counter, so the card and the record can never disagree.",
    skip: 2.6,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      await act({ type: "recall", userId: "riya", name: "Riya" });
      await sleep(2400);
      await page.evaluate(() => {
        const el = document.querySelector(".stream");
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.mouse.move(760, 620);
      await sleep(2400);
    },
  },
  {
    id: "07-clock",
    caption: "The clock is on the server",
    narration:
      "Now the auctioneer closes the lot with under half a minute left, and the countdown turns red. Watch the last few seconds.",
    skip: 2.6,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      await act({ type: "moderate", userId: "meera", name: "Meera", action: "close_now", seconds: 28 });
      await sleep(5200);
      await page.mouse.move(1120, 120);
      await sleep(3200);
    },
  },
  {
    id: "08-snipe",
    caption: "A late bid moves the clock, not the outcome",
    narration:
      "The bid lands at eight seconds, and the clock extends by thirty. Nobody wins by waiting for the buzzer. And the extension is not silent, it is a message the whole room can read.",
    skip: 2.6,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      // re-arm the clock here: chapters are separate takes and time passes between them
      await act({ type: "moderate", userId: "meera", name: "Meera", action: "close_now", seconds: 12 });
      await sleep(3400);
      await page.locator(".bid-strip button").nth(0).click();
      await sleep(2200);
      await page.mouse.move(1000, 300);
      await sleep(3600);
    },
  },
  {
    id: "09-settle",
    caption: "Settlement is a message too",
    narration:
      "When the clock runs out the lot settles. Winner, final price, bid count. Everyone who bid and lost gets a direct message, instead of being left to guess.",
    skip: 2.6,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      await act({ type: "close", userId: "meera", name: "Meera" });
      await sleep(2400);
      await page.evaluate(() => {
        const el = document.querySelector(".stream");
        if (el) el.scrollTop = el.scrollHeight;
      });
      await sleep(2800);
    },
  },
  {
    id: "10-rail",
    caption: "Every auction you are in, one rail",
    narration:
      "You are rarely watching one lot. The rail lists every auction you are in, each row carrying its own live countdown, so switching lots never means switching tabs.",
    skip: 2.4,
    async run(page) {
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await sleep(2600);
      await page.mouse.move(700, 520);
      await sleep(1400);
      await page.goto(`${BASE}/app/jordan?as=Riya`, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      await page.locator(".bid-strip button").nth(0).click();
      await sleep(2400);
      await page.mouse.move(240, 300);
      await sleep(1600);
    },
  },
  {
    id: "11-ledger",
    caption: "The transcript is the ledger",
    narration:
      "Every bid, message and settlement is stored in a Nexconn group channel. Ordered, offline safe, and kept for a hundred and eighty days. So the transcript is the ledger, and a restart can rebuild the auction from it.",
    skip: 2.4,
    async run(page) {
      await page.goto(ROOM, { waitUntil: "domcontentloaded" });
      await sleep(2800);
      await page.mouse.move(1560, 640);
      await sleep(2000);
      await page.evaluate(() => {
        const el = document.querySelector(".stream");
        if (el) el.scrollTop = el.scrollHeight;
      });
      await sleep(2600);
    },
  },
];

/* --------------------------------------------------------------------- build */

await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

await post("/api/dev/reset", {});
for (const who of ["arjun", "riya", "priya"]) {
  await act({ type: "join", userId: who, name: who[0].toUpperCase() + who.slice(1) });
}
await act({ type: "chat", userId: "priya", name: "Priya", text: "Has it been serviced recently?" });
await act({
  type: "chat",
  userId: "meera",
  name: "Meera",
  text: "Full CLA in March. Shutter and meter both checked.",
});

await writeFile(
  `${TMP}/captions.json`,
  JSON.stringify(
    CHAPTERS.map((c) => ({ id: c.id, text: c.caption, out: `${TMP}/${c.id}-cap.png` })),
    null,
    2,
  ),
  "utf8",
);
await run("python3", ["scripts/captions.py", `${TMP}/captions.json`]);

const browser = await chromium.launch({ executablePath: exe, headless: true });
const segments = [];

for (const [index, chapter] of CHAPTERS.entries()) {
  process.stdout.write(`  ${chapter.id} … `);

  const wav = `${TMP}/${chapter.id}.wav`;
  const engine = await narrate(chapter.narration, wav);
  const voiceDur = await probe(wav);

  const dir = `${TMP}/${chapter.id}`;
  await mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({
    // the viewport IS the content area: the app renders at its real size, and the
    // caption band completes the 16:9 frame afterwards. No scaling, no pillarbox.
    viewport: { width: W, height: CONTENT_H },
    recordVideo: { dir, size: { width: W, height: CONTENT_H } },
  });
  const page = await ctx.newPage();
  await chapter.run(page);
  await ctx.close();

  const clip = path.join(dir, (await readdir(dir)).find((f) => f.endsWith(".webm")));
  const clipDur = Math.max(0.5, (await probe(clip)) - chapter.skip);

  const target = Math.max(voiceDur + 0.7, clipDur + 0.15);
  const padVideo = Math.max(0, target - clipDur);
  const padAudio = Math.max(0, target - voiceDur);

  const seg = `${TMP}/${String(index).padStart(2, "0")}.mp4`;
  await run(FFMPEG, [
    "-y", "-v", "error",
    "-ss", String(chapter.skip), "-i", clip,
    "-i", wav,
    "-loop", "1", "-framerate", "30", "-i", `${TMP}/${chapter.id}-cap.png`,
    "-filter_complex",
    `[0:v]scale=${W}:${CONTENT_H}:force_original_aspect_ratio=decrease,` +
      `pad=${W}:${CONTENT_H}:(ow-iw)/2:(oh-ih)/2,` +
      `tpad=stop_mode=clone:stop_duration=${padVideo.toFixed(2)},fps=30,` +
      `pad=${W}:${H}:0:0:color=0x0c0c0d[bg];` +
      `[bg][2:v]overlay=0:0[v];` +
      `[1:a]apad=pad_dur=${padAudio.toFixed(2)},atrim=0:${target.toFixed(2)}[a]`,
    "-map", "[v]", "-map", "[a]",
    "-t", target.toFixed(2),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-c:a", "aac", "-b:a", "128k",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    seg,
  ]);

  const dur = await probe(seg);
  segments.push({ chapter, seg, dur });
  console.log(
    `${dur.toFixed(1)}s (voice ${voiceDur.toFixed(1)}s via ${engine}, picture ${clipDur.toFixed(1)}s)`,
  );
}

await browser.close();

const list = `${TMP}/list.txt`;
await writeFile(list, segments.map((s) => `file '${path.resolve(s.seg)}'`).join("\n"), "utf8");

const final = `${OUT}/bidlive-full.mp4`;
await run(FFMPEG, ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", `${TMP}/joined.mp4`]);

// speech lands quiet from the TTS API; normalise to -16 LUFS and upmix to stereo
await run(FFMPEG, [
  "-y", "-v", "error",
  "-i", `${TMP}/joined.mp4`,
  "-c:v", "copy",
  "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
  "-ac", "2", "-ar", "48000",
  "-c:a", "aac", "-b:a", "160k",
  final,
]);

/* transcript, measured from the rendered segments so it matches the file */
let clock = 0;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const rows = segments.map((s) => {
  const row = {
    start: fmt(clock),
    end: fmt(clock + s.dur),
    caption: s.chapter.caption,
    narration: s.chapter.narration,
  };
  clock += s.dur;
  return row;
});

const md = [
  "# BidLive — demo video transcript",
  "",
  `Video: \`docs/video/bidlive-full.mp4\` · ${fmt(clock)} · ${W}×${H} · narrated (${GNANI.voice}, Gnani ${GNANI.model})`,
  "",
  "Timings are measured from the rendered segments, so they line up with the mp4.",
  "",
  "| In | Out | On screen | Narration |",
  "|---|---|---|---|",
  ...rows.map((r) => `| ${r.start} | ${r.end} | ${r.caption} | ${r.narration} |`),
  "",
  "## Voiceover only (for re-recording in Clipchamp)",
  "",
  ...rows.flatMap((r) => [`**[${r.start}] ${r.caption}**`, "", r.narration, ""]),
].join("\n");

await writeFile(`${OUT}/transcript.md`, md, "utf8");
await writeFile(
  `${OUT}/voiceover.txt`,
  rows.map((r) => `[${r.start}] ${r.narration}`).join("\n\n"),
  "utf8",
);

console.log(`\nwrote ${final} — ${fmt(clock)}`);
console.log(`wrote ${OUT}/transcript.md and ${OUT}/voiceover.txt`);
