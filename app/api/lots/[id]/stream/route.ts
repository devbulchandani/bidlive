import { fail } from "@/lib/http";
import { ensureClosed } from "@/lib/service";
import { getLot, subscribe, summarise } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-sent events: the low-latency path the room renders from.
 * Every event here is also mirrored into the lot's Nexconn channel, so the same
 * room exists in the SDK with real history, sync and push.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lot = getLot(id);
  if (!lot) return fail("Lot not found", 404);
  ensureClosed(lot);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const push = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      push({ type: "snapshot", lot: summarise(getLot(id)!), serverTime: Date.now() });

      const unsubscribe = subscribe(id, (event) => {
        const current = getLot(id);
        if (current) ensureClosed(current);
        push({
          type: "event",
          event,
          lot: current ? summarise(current) : null,
          serverTime: Date.now(),
        });
      });

      const heartbeat = setInterval(() => {
        const current = getLot(id);
        if (current) ensureClosed(current);
        push({
          type: "tick",
          serverTime: Date.now(),
          lot: current ? summarise(current) : null,
        });
      }, 10_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
