#!/usr/bin/env node
/**
 * Credential probe for the Nexconn Server API (v1).
 *
 *   npm run check:nexconn
 *
 * Nexconn apps live in one data centre. Pointing at the wrong host (or mixing a
 * Development key with a Production secret) is the most common first-day failure,
 * and it looks identical to "the SDK is broken". This tries every regional host
 * and prints the values to paste into .env.local. It never prints the secret.
 *
 * Host table mirrors API_HOSTS in lib/nexconn/server.ts (source of truth).
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const HOSTS = [
  { label: "Singapore", base: "https://api.sg-light-api.com", areaCode: "2" },
  { label: "Singapore (enterprise)", base: "https://api.sg-b-light-api.com", areaCode: "4" },
  { label: "North America", base: "https://api.us-light-api.com", areaCode: "3" },
  { label: "Saudi Arabia", base: "https://api.sau-light-api.com", areaCode: "5" },
  { label: "China (Beijing)", base: "https://api.rong-api.com", areaCode: "1" },
];

function readEnv(path = ".env.local") {
  const out = {};
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = v;
  }
  return out;
}

const env = readEnv();
const appKey = env.NEXCONN_APP_KEY || process.env.NEXCONN_APP_KEY || "";
const appSecret = env.NEXCONN_APP_SECRET || process.env.NEXCONN_APP_SECRET || "";

const mask = (v) => (!v ? "(empty)" : v.length <= 8 ? `${v.slice(0, 2)}***` : `${v.slice(0, 6)}…${v.slice(-2)}`);

console.log("Nexconn credential check");
console.log("  app key   :", mask(appKey));
console.log("  app secret:", appSecret ? `set (${appSecret.length} chars)` : "(empty)");
console.log("");

if (!appKey || !appSecret) {
  console.log("Nothing to check yet — fill these two lines in .env.local:\n");
  console.log("  NEXCONN_APP_KEY=<production app key>");
  console.log("  NEXCONN_APP_SECRET=<the matching app secret>\n");
  console.log("Both must come from the SAME environment (Production or Development)");
  console.log("and the same app. The secret is on the same console page as the key.");
  process.exit(1);
}

const probeUserId = `probe_${Date.now().toString(36)}`;

async function attempt({ base, label, areaCode }) {
  const nonce = randomUUID().replace(/-/g, "").slice(0, 16);
  const timestamp = String(Date.now());
  const signature = createHash("sha1").update(appSecret + nonce + timestamp).digest("hex");

  try {
    const res = await fetch(`${base}/user/getToken.json`, {
      method: "POST",
      headers: {
        "App-Key": appKey,
        Nonce: nonce,
        Timestamp: timestamp,
        Signature: signature,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        userId: probeUserId,
        name: "BidLive probe",
        portraitUri: "",
      }).toString(),
      signal: AbortSignal.timeout(12_000),
    });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      /* non-json */
    }
    return {
      label,
      base,
      areaCode,
      token: typeof json.token === "string" && json.token ? json.token : null,
      code: json.code,
      status: res.status,
      detail: text.slice(0, 160),
    };
  } catch (err) {
    return { label, base, areaCode, error: err instanceof Error ? err.message : String(err) };
  }
}

const results = [];
for (const host of HOSTS) {
  process.stdout.write(`  ${host.base.padEnd(34)} `);
  const r = await attempt(host);
  results.push(r);
  console.log(r.error ? `unreachable (${r.error})` : `code ${r.code ?? r.status}`);
}

const winner = results.find((r) => r.token);

console.log("");
if (winner) {
  console.log("✓ Authenticated. Use these values in .env.local:\n");
  console.log(`  NEXCONN_API_BASE=${winner.base}`);
  console.log(`  NEXCONN_AREA_CODE=${winner.areaCode}`);
  console.log(`  NEXT_PUBLIC_NEXCONN_AREA_CODE=${winner.areaCode}`);
  console.log("\nThen restart the dev server — NEXT_PUBLIC_* is inlined at build time.");
  process.exit(0);
}

console.log("✗ No host accepted these credentials.\n");
console.log("Codes seen:", results.map((r) => r.code ?? r.error ?? "?").join(", "));
console.log("");
console.log("What the codes usually mean:");
console.log("  403 'App-Key is not exist' → the key is not valid in that data centre.");
console.log("                               Most often: Development key paired with a");
console.log("                               Production secret, a typo, or the app is");
console.log("                               on a different region than the one tried.");
console.log("  1002 / 1003 / 1004         → signature rejected (secret mismatch).");
console.log("  1000                       → parameter problem (userId empty).");
console.log("  unreachable                → DNS/egress blocked, or region not listed.");
console.log("");
console.log("Raw responses:");
for (const r of results) console.log(`  ${r.base} → ${r.error ?? r.detail}`);
process.exit(2);
