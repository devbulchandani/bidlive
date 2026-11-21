/**
 * Captures the three primary views for review.
 *   node scripts/shots.mjs
 */
import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "docs/shots";
const executablePath = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const settle = (ms = 2200) => page.waitForTimeout(ms);

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await settle(2500);
await page.screenshot({ path: `${OUT}/01-landing.png`, fullPage: true });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01a-hero.png` });
console.log("landing captured");

await page.goto(`${BASE}/app?as=Riya`, { waitUntil: "domcontentloaded" });
await settle(2500);
await page.screenshot({ path: `${OUT}/02-overview.png` });
console.log("overview captured");

await page.goto(`${BASE}/app/yashica?as=Riya`, { waitUntil: "domcontentloaded" });
await settle(3500);
await page.screenshot({ path: `${OUT}/03-room.png` });
console.log("room captured");

await page.setViewportSize({ width: 420, height: 900 });
await page.goto(`${BASE}/app/yashica?as=Arjun`, { waitUntil: "domcontentloaded" });
await settle(3000);
await page.screenshot({ path: `${OUT}/04-room-mobile.png` });
console.log("mobile captured");

if (errors.length) console.log("page errors:\n" + errors.slice(0, 6).join("\n"));
await browser.close();
