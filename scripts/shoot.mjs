/**
 * Screenshot harness — used to verify the UI without a visible browser.
 * Usage: node scripts/shoot.mjs <url> <out.png> [width] [height] [waitMs]
 */
import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";

const [url, out, w = "1440", h = "1000", wait = "2500"] = process.argv.slice(2);

const executablePath = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
console.log("saved", out);
if (errors.length) console.log("console errors:\n" + errors.slice(0, 8).join("\n"));
await browser.close();
