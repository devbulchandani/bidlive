/**
 * Records the demo — two browser windows, real clicks, composited side by side.
 *
 *   node scripts/record.mjs
 *
 * Output: docs/video/bidlive-demo.mp4  (2560×720, silent)
 *
 * The capture is intentionally mechanical: every bid is a real click on a real
 * chip and every frame comes from the running app. Add your narration over it,
 * or use it as the visual track in an editor.
 */
import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";
import { mkdir, readdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const BASE = "http://localhost:3000";
const LOT = "yashica";
const OUT = "docs/video";
const RAW = `${OUT}/raw`;
const FFMPEG = process.env.FFMPEG || "ffmpeg";

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
const act = (body) => post(`/api/lots/${LOT}/action`, { lotId: LOT, ...body });

const log = (s) => console.log(`  ${(Date.now() - T0) / 1000}s  ${s}`);

await rm(RAW, { recursive: true, force: true });
await mkdir(`${RAW}/riya`, { recursive: true });
await mkdir(`${RAW}/arjun`, { recursive: true });
await mkdir(OUT, { recursive: true });

// ---------------------------------------------------------------- setup
await post("/api/dev/reset", {});
await act({ type: "join", userId: "arjun", name: "Arjun" });
await act({ type: "join", userId: "riya", name: "Riya" });
await act({
  type: "chat",
  userId: "priya",
  name: "Priya",
  text: "Has it been serviced recently?",
});
await act({
  type: "chat",
  userId: "meera",
  name: "Meera",
  text: "Full CLA in March. Shutter and meter both checked.",
});

const T0 = Date.now();
const browser = await chromium.launch({ executablePath: exe, headless: true });
const size = { width: 1280, height: 720 };
const opts = { viewport: size, recordVideo: { dir: "", size } };

const ctxRiya = await browser.newContext({ ...opts, recordVideo: { dir: `${RAW}/riya`, size } });
const ctxArjun = await browser.newContext({ ...opts, recordVideo: { dir: `${RAW}/arjun`, size } });

const riya = await ctxRiya.newPage();
const arjun = await ctxArjun.newPage();

await Promise.all([
  riya.goto(`${BASE}/app/${LOT}?as=Riya`, { waitUntil: "domcontentloaded" }),
  arjun.goto(`${BASE}/app/${LOT}?as=Arjun`, { waitUntil: "domcontentloaded" }),
]);

// wait for both sockets, so the recording does not open on a spinner
for (let i = 0; i < 30; i++) {
  await sleep(500);
  const ready = await Promise.all(
    [riya, arjun].map((p) =>
      p.evaluate(() =>
        [...document.querySelectorAll(".chip")].some((c) => c.textContent?.includes("SDK")),
      ),
    ),
  );
  if (ready.every(Boolean)) break;
}

const BEATS = Date.now();
await sleep(900);

// 1 — a question, typed for real
await arjun.locator(".composer input").click();
await arjun.keyboard.type("Any haze in the viewfinder?", { delay: 32 });
await sleep(320);
await arjun.keyboard.press("Enter");
log("Arjun asks a question");
await sleep(1500);
await act({
  type: "chat",
  userId: "meera",
  name: "Meera",
  text: "Clean, no haze. Extra photos on the way.",
});
await sleep(1900);

// 2 — one tap opens the bidding
await riya.locator(".bid-strip button").nth(0).click();
log("Riya taps the first bid chip");
await sleep(2300);

// 3 — the flip, from the other window
await arjun.locator(".bid-strip button").nth(0).click();
log("Arjun outbids from his window");
await sleep(2900);

// 4 — she takes it back
await riya.locator(".bid-strip button").nth(0).click();
log("Riya counter-bids");
await sleep(1900);

// 5 — snipe prevention: let the clock actually run down, then bid into it
await act({ type: "moderate", userId: "meera", name: "Meera", action: "close_now", seconds: 14 });
log("auctioneer sets a 14 second close");
await sleep(6200); // the countdown is now ~7 seconds from zero, on screen
await arjun.locator(".bid-strip button").nth(0).click();
log("Arjun bids at ~0:07 — the clock extends");
await sleep(5600); // hold on the jump from 0:07 to ~0:37

// 6 — the hammer
await act({ type: "close", userId: "meera", name: "Meera" });
await sleep(3000);
log("hammer down");
await sleep(900);

await ctxRiya.close();
await ctxArjun.close();
await browser.close();

// ---------------------------------------------------------------- compose
const pick = async (dir) => {
  const files = (await readdir(`${RAW}/${dir}`)).filter((f) => f.endsWith(".webm"));
  return `${RAW}/${dir}/${files[0]}`;
};
const a = await pick("riya");
const b = await pick("arjun");

// trim the load/connect lead-in, then put the windows side by side
const offset = Math.max(0, (BEATS - T0) / 1000 - 0.4);
console.log(`\ncompositing (trim ${offset.toFixed(1)}s)…`);

await run(FFMPEG, [
  "-y",
  "-ss", String(offset), "-i", a,
  "-ss", String(offset), "-i", b,
  "-filter_complex",
  "[0:v]scale=1280:720,setsar=1,fps=30[left];[1:v]scale=1280:720,setsar=1,fps=30[right];[left][right]hstack=inputs=2[v]",
  "-map", "[v]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "20",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  `${OUT}/demo-2up.mp4`,
]);

console.log("wrote", `${OUT}/demo-2up.mp4`);

// ------------------------------------------------- title → demo → end card
await run(FFMPEG, [
  "-y",
  "-loop", "1", "-t", "2.8", "-i", `${OUT}/card-title.png`,
  "-i", `${OUT}/demo-2up.mp4`,
  "-loop", "1", "-t", "2.8", "-i", `${OUT}/card-end.png`,
  "-filter_complex",
  "[0:v]scale=2560:720,setsar=1,fps=30,format=yuv420p[a];" +
    "[1:v]scale=2560:720,setsar=1,fps=30,format=yuv420p[b];" +
    "[2:v]scale=2560:720,setsar=1,fps=30,format=yuv420p[c];" +
    "[a][b][c]concat=n=3:v=1:a=0[v]",
  "-map", "[v]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "20",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  `${OUT}/bidlive-demo.mp4`,
]);

console.log("wrote", `${OUT}/bidlive-demo.mp4`);
