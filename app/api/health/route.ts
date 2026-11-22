import { NextResponse } from "next/server";
import { isNexconnConfigured, nexsconnConfig, recentMirrorResults } from "@/lib/nexconn/server";
import { allLots } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const cfg = nexsconnConfig();
  return NextResponse.json({
    ok: true,
    service: "bidlive",
    nexconnConfigured: isNexconnConfigured(),
    nexconnApiBase: cfg?.apiBase ?? null,
    areaCode: cfg?.areaCode ?? null,
    // First characters only — the App Key is semi-public, the secret never is.
    appKeyPreview: cfg ? `${cfg.appKey.slice(0, 6)}…` : null,
    // The App Key identifies the app and is safe in the browser; it is served here
    // so a deploy never depends on NEXT_PUBLIC_* being inlined at build time.
    appKey: cfg?.appKey ?? null,
    nexconnRecent: recentMirrorResults(),
    lots: allLots().length,
    time: Date.now(),
  });
}
