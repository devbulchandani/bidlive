import { fail, ok } from "@/lib/http";
import { ensureClosed } from "@/lib/service";
import { eventsFor, getLot, needsReplay, summarise } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lot = getLot(id);
  if (!lot) return fail("Lot not found", 404);

  ensureClosed(lot);

  return ok({
    lot: summarise(lot),
    events: eventsFor(id),
    needsReplay: needsReplay(id),
    serverTime: Date.now(),
  });
}
