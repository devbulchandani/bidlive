import { NextResponse } from "next/server";
import { isNexconnConfigured, nexsconnConfig } from "@/lib/nexconn/server";
import { allLots } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "bidlive",
    nexconnConfigured: isNexconnConfigured(),
    nexconnApiBase: nexsconnConfig()?.apiBase ?? null,
    lots: allLots().length,
    time: Date.now(),
  });
}
