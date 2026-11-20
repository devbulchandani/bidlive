import { fail } from "@/lib/http";
import { subscribeUser } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Per-user stream for private notices: "you've been outbid", "you lost the lot".
 * In production this same payload is a Nexconn push, so the phone lights up even
 * when the tab is closed.
 */
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId")?.trim();
  if (!userId) return fail("userId required", 400);

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
      push({ type: "hello", userId, serverTime: Date.now() });

      const unsubscribe = subscribeUser(userId, (event) => {
        push({ type: "notice", notice: event.meta, at: event.at });
      });

      const heartbeat = setInterval(() => push({ type: "ping", serverTime: Date.now() }), 15_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* noop */
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
