import { ok, readJson, str } from "@/lib/http";
import { getLot } from "@/lib/store";
import { validateBid } from "@/lib/auction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Nexconn message callback hook (architecture A).
 *
 * Wire this URL in the Nexconn console as a pre-message callback and every custom
 * `bidlive:Bid` message is validated *before* it is delivered — the strongest
 * version of this product, because a rejected bid never exists for the room.
 *
 * Enable it by setting NEXCONN_CALLBACK_ENFORCE=1. Until then the auction validates
 * through /api/lots/[id]/action, which is the same rules module, so the two paths
 * cannot drift.
 */
export async function POST(req: Request) {
  const body = await readJson(req);

  // Nexconn/RC callbacks vary slightly by event version; read defensively.
  const fromUserId = str(body.fromUserId);
  const channelId = str(body.targetId) || str(body.channelId);
  const messageType = str(body.messageType) || str(body.msgType);
  const contentRaw = body.content;
  let content: Record<string, unknown> = {};
  try {
    content = typeof contentRaw === "string" ? JSON.parse(contentRaw) : (contentRaw ?? {});
  } catch {
    content = {};
  }

  const enforce = process.env.NEXCONN_CALLBACK_ENFORCE === "1";

  if (messageType === "bidlive:Bid" && enforce) {
    const lotId = str(content.lotId);
    const lot = getLot(lotId);
    const amount = Number(content.amount);

    if (!lot) return allow("unknown_lot_passthrough");
    if (!channelId || channelId !== lot.channelId) return allow("channel_mismatch");

    const verdict = validateBid(lot, amount, fromUserId);
    if (!verdict.ok) {
      // `code: 4` blocks delivery on the RC/Nexconn message callback contract.
      return Response.json({
        code: 4,
        message: verdict.rejection.reason,
        rejection: verdict.rejection,
      });
    }
  }

  return allow("accepted");
}

function allow(reason: string) {
  return ok({ result: { code: 200, reason } });
}
