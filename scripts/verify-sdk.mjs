/**
 * End-to-end proof that the room receives messages over the Nexconn socket.
 *
 *   node scripts/verify-sdk.mjs
 *
 * Opens the lot as one user, reads the SDK pill, publishes a bid from a second
 * user, then reads the pill again. If the count goes up, the client is receiving
 * in real time rather than only syncing history on connect.
 */
import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";

const BASE = "http://localhost:3000";
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

await post("/api/dev/reset", {});
await post("/api/lots/yashica/action", { type: "join", lotId: "yashica", userId: "arjun", name: "Arjun" });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/lot/yashica?as=Riya`, { waitUntil: "domcontentloaded" });

const readPill = () =>
  page.evaluate(() => {
    const chips = [...document.querySelectorAll(".chip")].map((el) => el.textContent?.trim() ?? "");
    return chips.find((t) => t.startsWith("SDK")) ?? "(no SDK pill)";
  });

// give the SDK time to initialise, auth and join the channel
await page.waitForTimeout(9000);
const before = await readPill();
console.log("before:", before);

const result = await post("/api/lots/yashica/action", {
  type: "bid",
  lotId: "yashica",
  userId: "arjun",
  name: "Arjun",
  amount: 500,
});
console.log("bid accepted:", result.accepted === true);

await page.waitForTimeout(4000);
const after = await readPill();
console.log("after :", after);

const num = (s) => Number(/(\d+)/.exec(s)?.[1] ?? NaN);
const grew = Number.isFinite(num(before)) && Number.isFinite(num(after)) && num(after) > num(before);

console.log("");
console.log(grew ? "PASS — the SDK received the new message live." : "INCONCLUSIVE — pill did not increase.");
if (errors.length) console.log("page errors:\n" + errors.slice(0, 5).join("\n"));

await browser.close();
process.exit(grew ? 0 : 1);
