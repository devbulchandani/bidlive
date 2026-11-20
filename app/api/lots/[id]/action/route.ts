import { fail, num, ok, readJson, str } from "@/lib/http";
import { closeLot, joinLot, moderate, placeBid, recallLastBid, sendChat } from "@/lib/service";
import { eventsFor, getLot, summarise } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One action endpoint for the room. Keeping bids server-authoritative means the
 * clock, the minimum and the anti-snipe rule are decided in exactly one place —
 * no client can win an auction by having a faster machine.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const type = str(body.type);
  const userId = str(body.userId);
  const name = str(body.name, "guest");

  if (!userId) return fail("userId required", 401);
  if (!getLot(id)) return fail("Lot not found", 404);

  if (type === "bid") {
    const amount = num(body.amount);
    if (amount === null) return fail("amount required", 400);
    const result = placeBid({ lotId: id, userId, name, amount });
    if (!result.ok) {
      return ok({ rejected: true, rejection: result.rejection }, { status: 200 });
    }
    const lot = getLot(id)!;
    return ok({
      accepted: true,
      amount: result.amount,
      endsAt: result.endsAt,
      extended: result.extended,
      seq: result.seq,
      lot: summarise(lot),
    });
  }

  if (type === "chat") {
    const result = sendChat({ lotId: id, userId, name, text: str(body.text) });
    if (!result.ok) return fail(result.reason);
    return ok({});
  }

  if (type === "recall") {
    const result = recallLastBid({ lotId: id, userId });
    if (!result.ok) return fail(result.reason);
    return ok({ lot: summarise(getLot(id)!) });
  }

  if (type === "join") {
    const result = joinLot(id, userId, name);
    if (!result.ok) return fail(result.reason);
    return ok({ lot: summarise(getLot(id)!) });
  }

  if (type === "moderate") {
    const result = moderate({
      lotId: id,
      actorId: userId,
      action: str(body.action) as "mute" | "unmute" | "extend" | "close_now",
      targetId: str(body.targetId) || undefined,
      targetName: str(body.targetName) || undefined,
      seconds: num(body.seconds) ?? undefined,
    });
    if (!result.ok) return fail(result.reason);
    return ok({});
  }

  if (type === "close") {
    const result = closeLot(id);
    if (!result.ok) return fail(result.reason);
    return ok({ lot: summarise(getLot(id)!), events: eventsFor(id) });
  }

  return fail(`Unknown action: ${type}`, 400);
}
