/**
 * Dress rehearsal — drives the exact sequence you should record, in two windows,
 * and captures screenshots at the beats that matter.
 *
 *   node scripts/rehearse.mjs
 *
 * Writes docs/screenshots/*.png and prints a timeline you can follow while
 * recording. Everything here goes through the real API, so a passing run means
 * the demo path works with your live Nexconn credentials.
 */
import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const LOT = "yashica";
const OUT = "docs/screenshots";

const executablePath = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);

const post = async (url, body) => {
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
};

const act = (body) => post(`/api/lots/${LOT}/action`, { lotId: LOT, ...body });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const steps = [];
const mark = (label, detail = "") => {
  steps.push({ t: new Date(), label, detail });
  console.log(`  ${new Date().toISOString().slice(11, 19)}  ${label}${detail ? ` — ${detail}` : ""}`);
};

await mkdir(OUT, { recursive: true });
await post("/api/dev/reset", {});
mark("reset", "fresh lots");

const browser = await chromium.launch({ executablePath, headless: true });
const viewport = { width: 1280, height: 900 };

// Two separate contexts: localStorage is per-context, so each window holds its own
// identity exactly like two browsers would.
const ctxA = await browser.newContext({ viewport, deviceScaleFactor: 2 });
const ctxB = await browser.newContext({ viewport, deviceScaleFactor: 2 });
const riya = await ctxA.newPage();
const arjun = await ctxB.newPage();

await Promise.all([
  riya.goto(`${BASE}/app/${LOT}?as=Riya`, { waitUntil: "domcontentloaded" }),
  arjun.goto(`${BASE}/app/${LOT}?as=Arjun`, { waitUntil: "domcontentloaded" }),
]);

// Wait for both SDKs to report a live socket.
const sdkPill = (page) =>
  page.evaluate(() => {
    const chips = [...document.querySelectorAll(".chip")].map((el) => el.textContent?.trim() ?? "");
    return chips.find((t) => t.startsWith("SDK")) ?? "(none)";
  });

await sleep(9000);
mark("both windows joined", `Riya ${await sdkPill(riya)} · Arjun ${await sdkPill(arjun)}`);

// --- beat 1: the question -------------------------------------------------
await act({ type: "chat", userId: "arjun", name: "Arjun", text: "Is the light meter accurate?" });
await sleep(700);
await act({ type: "chat", userId: "meera", name: "Meera", text: "Meter reads within half a stop. Battery included." });
await sleep(900);
await riya.screenshot({ path: `${OUT}/01-question.png` });
mark("question + answer", "01-question.png");

// --- beat 2: first bid ----------------------------------------------------
await act({ type: "bid", userId: "riya", name: "Riya", amount: 500 });
await sleep(1000);
await arjun.screenshot({ path: `${OUT}/02-first-bid.png` });
mark("Riya bids ₹500", "LEADING for Riya, visible to Arjun");

// --- beat 3: the flip -----------------------------------------------------
await act({ type: "bid", userId: "arjun", name: "Arjun", amount: 550 });
await sleep(1400);
// Same instant, two windows: Riya sees OUTBID + the notice, Arjun sees LEADING.
await Promise.all([
  riya.screenshot({ path: `${OUT}/03-outbid.png` }),
  arjun.screenshot({ path: `${OUT}/03b-leading.png` }),
]);
mark("Arjun bids ₹550", "Riya's card flips to OUTBID + outbid notice");

// --- beat 4: a rejected bid ----------------------------------------------
const low = await act({ type: "bid", userId: "riya", name: "Riya", amount: 560 });
await sleep(500);
mark("Riya tries ₹560", `rejected: ${low.rejection?.reason ?? "?"}`);

// --- beat 5: recall -------------------------------------------------------
await act({ type: "recall", userId: "riya", name: "Riya" });
await sleep(1200);
await arjun.screenshot({ path: `${OUT}/04-recall.png` });
mark("Riya recalls her ₹500", "lead recomputed from the log");

// --- beat 6: anti-snipe ---------------------------------------------------
await act({ type: "bid", userId: "riya", name: "Riya", amount: 600 });
await sleep(700);
await act({ type: "moderate", userId: "meera", name: "Meera", action: "close_now", seconds: 28 });
await sleep(1500);
await act({ type: "bid", userId: "arjun", name: "Arjun", amount: 650 });
await sleep(1800);
await riya.screenshot({ path: `${OUT}/05-extension.png` });
mark("Arjun bids ₹650 at ~0:25", "clock extends +30s, announced in the room");

// --- beat 7: the hammer ---------------------------------------------------
const closed = await act({ type: "close", userId: "meera", name: "Meera" });
await sleep(1600);
await arjun.screenshot({ path: `${OUT}/06-sold.png` });
mark("settled", `${closed.lot?.status} — ${closed.lot?.topName} at ₹${closed.lot?.currentBid}`);

// --- evidence -------------------------------------------------------------
const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
console.log("");
console.log("Nexconn publishes in this run:");
for (const r of health.nexconnRecent ?? []) {
  console.log(`  ${r.kind.padEnd(16)} ok=${r.ok}${r.error ? ` err=${r.error}` : ""}`);
}

const finalLot = await fetch(`${BASE}/api/lots/${LOT}`).then((r) => r.json());
console.log("");
console.log(`Final: ${finalLot.lot.status}, winner ${finalLot.lot.winner?.name} at ₹${finalLot.lot.winner?.amount}`);
console.log(`Events: ${finalLot.events.map((e) => e.kind).join(" → ")}`);
console.log(`Screenshots: ${OUT}/`);

await browser.close();
