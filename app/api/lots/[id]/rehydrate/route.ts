import { fail, ok, readJson } from "@/lib/http";
import { replayLot, type HistoryMessage } from "@/lib/replay";
import { eventsFor, getLot, summarise } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Rebuild a lot's log from its Nexconn channel transcript.
 *
 * Called by the room when the server holds nothing but the catalogue card — i.e.
 * after a cold start or a redeploy. The client is the one holding a chat session,
 * so it fetches the history through the SDK and hands it here; the server replays
 * it through the auction rules and refuses anything that could not have happened.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lot = getLot(id);
  if (!lot) return fail("Lot not found", 404);

  const body = await readJson(req);
  const messages = Array.isArray(body.messages) ? (body.messages as HistoryMessage[]) : [];
  if (messages.length > 400) return fail("Too many messages", 413);

  const result = replayLot(id, messages);
  return ok({
    ...result,
    events: eventsFor(id).length,
    lot: summarise(getLot(id)!),
  });
}
