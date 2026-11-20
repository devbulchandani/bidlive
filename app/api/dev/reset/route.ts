import { ok } from "@/lib/http";
import { resetStore } from "@/lib/store";
import { listLotSummaries } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Demo affordance: wipe bids and re-arm fresh lots so you can rehearse the video. */
export async function POST() {
  resetStore();
  return ok({ lots: listLotSummaries() });
}
