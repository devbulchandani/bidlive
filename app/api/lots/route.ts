import { ok } from "@/lib/http";
import { ensureClosed } from "@/lib/service";
import { allLots, listLotSummaries } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const now = Date.now();
  for (const lot of allLots()) ensureClosed(lot, now);
  const userId = new URL(req.url).searchParams.get("userId")?.trim() || undefined;
  return ok({ lots: listLotSummaries(userId) });
}
