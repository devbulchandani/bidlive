import { ok } from "@/lib/http";
import { ensureClosed } from "@/lib/service";
import { allLots, listLotSummaries } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const now = Date.now();
  for (const lot of allLots()) ensureClosed(lot, now);
  return ok({ lots: listLotSummaries() });
}
