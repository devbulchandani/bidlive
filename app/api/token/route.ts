import { fail, ok } from "@/lib/http";
import { getUserToken, isNexconnConfigured } from "@/lib/nexconn/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Issues a Nexconn user token. The App Secret stays here, on the server, always.
 * When Nexconn isn't configured the client falls back to the local event bus and
 * the UI says so honestly, rather than pretending.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId")?.trim();
  if (!userId) return fail("userId is required", 400);
  const name = url.searchParams.get("name")?.trim() || userId || "guest";
  if (!isNexconnConfigured()) {
    return ok({ configured: false, token: null });
  }

  const res = await getUserToken(userId, name);
  if (!res.ok) return fail(String(res.error), 502, { configured: true });
  return ok({ configured: true, token: res.token, userId });
}
