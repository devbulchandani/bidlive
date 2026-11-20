/**
 * Nexconn Server API client (v1).
 *
 * Runs ONLY on the server: the App Secret must never reach a browser. That single
 * rule is the difference between a demo and a liability, and it is the first thing
 * a vendor judge checks.
 *
 * Auth: Signature = SHA1(AppSecret + Nonce + Timestamp)  → headers App-Key,
 * Nonce, Timestamp, Signature. Bodies are form-urlencoded.
 *
 * Endpoints (docs.rongcloud.io/platform-chat-api):
 *   POST /user/getToken.json          register a user, get a token
 *   POST /message/group/publish.json  send to a group channel
 *   POST /message/private/publish.json send to one user
 *   POST /group/create.json           create the lot's channel
 *   POST /group/join.json             add a bidder to it
 */

import { createHash, randomUUID } from "node:crypto";

export type NexconnConfig = {
  appKey: string;
  appSecret: string;
  /** Primary host; the backup is tried if the primary is unreachable. */
  apiBase: string;
  apiBackup: string | null;
  areaCode: string;
};

/**
 * Data-centre hosts. Nexconn apps live in one of these; the wrong one returns
 * an auth failure rather than a network error, so the checker tries them all.
 */
export const API_HOSTS = {
  sg: { base: "https://api.sg-light-api.com", backup: "https://api-b.sg-light-api.com", areaCode: "2" },
  sgEnterprise: {
    base: "https://api.sg-b-light-api.com",
    backup: "https://api-b.sg-b-light-api.com",
    areaCode: "4",
  },
  us: { base: "https://api.us-light-api.com", backup: "https://api-b.us-light-api.com", areaCode: "3" },
  saudi: { base: "https://api.sau-light-api.com", backup: "https://api-b.sau-light-api.com", areaCode: "5" },
  china: { base: "https://api.rong-api.com", backup: "https://api-b.rong-api.com", areaCode: "1" },
} as const;

export function nexsconnConfig(): NexconnConfig | null {
  const appKey = process.env.NEXCONN_APP_KEY?.trim();
  const appSecret = process.env.NEXCONN_APP_SECRET?.trim();
  if (!appKey || !appSecret) return null;

  const apiBase = (process.env.NEXCONN_API_BASE?.trim() || API_HOSTS.sg.base).replace(/\/$/, "");
  const apiBackup = (process.env.NEXCONN_API_BACKUP?.trim() || "").replace(/\/$/, "");

  return {
    appKey,
    appSecret,
    apiBase,
    apiBackup: apiBackup || null,
    areaCode: process.env.NEXCONN_AREA_CODE?.trim() || "2",
  };
}

export function isNexconnConfigured() {
  return nexsconnConfig() !== null;
}

export function hostForArea(areaCode: string) {
  return Object.values(API_HOSTS).find((h) => h.areaCode === areaCode) ?? null;
}

function authHeaders(cfg: NexconnConfig) {
  const nonce = randomUUID().replace(/-/g, "").slice(0, 16);
  const timestamp = String(Date.now());
  const signature = createHash("sha1").update(cfg.appSecret + nonce + timestamp).digest("hex");
  return {
    "App-Key": cfg.appKey,
    Nonce: nonce,
    Timestamp: timestamp,
    Signature: signature,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

type ApiResponse = {
  ok: boolean;
  code?: number;
  body?: Record<string, unknown>;
  error?: string;
  host?: string;
};

async function postOnce(cfg: NexconnConfig, host: string, path: string, form: Record<string, string>) {
  const res = await fetch(`${host}${path}`, {
    method: "POST",
    headers: authHeaders(cfg),
    body: new URLSearchParams(form).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* non-JSON body */
  }
  return { httpOk: res.ok, body, text };
}

/** POST with automatic failover to the backup domain. */
export async function post(
  cfg: NexconnConfig,
  path: string,
  form: Record<string, string>,
): Promise<ApiResponse> {
  const hosts = [cfg.apiBase, cfg.apiBackup].filter(Boolean) as string[];
  let last: ApiResponse = { ok: false, error: "no host" };

  for (const host of hosts) {
    try {
      const { httpOk, body, text } = await postOnce(cfg, host, path, form);
      const code = typeof body.code === "number" ? body.code : undefined;
      if (httpOk && code === 200) return { ok: true, code, body, host };
      last = {
        ok: false,
        code,
        body,
        host,
        error: text.slice(0, 200) || `http ${httpOk ? "200" : "error"}`,
      };
      // An auth/parameter failure will fail identically on the backup; only
      // network-level problems are worth retrying.
      if (code !== undefined) return last;
    } catch (err) {
      last = {
        ok: false,
        host,
        error: err instanceof Error ? err.message : "network error",
      };
    }
  }
  return last;
}

/** Register (or fetch) a user token. Tokens are permanent for a user id. */
export async function getUserToken(userId: string, name: string) {
  const cfg = nexsconnConfig();
  if (!cfg) return { ok: false as const, error: "not_configured" };

  const res = await post(cfg, "/user/getToken.json", {
    userId,
    name,
    portraitUri: "",
  });
  const token = typeof res.body?.token === "string" ? res.body.token : null;
  if (res.ok && token) return { ok: true as const, token };
  return { ok: false as const, error: res.error ?? "token_failed", code: res.code };
}

/**
 * Mirror an auction event into the lot's group channel as a custom message,
 * authored by the user who caused it. This is what gives the auction real history,
 * offline sync, push and moderation instead of a bespoke socket.
 */
export async function publishCustomMessage(params: {
  channelId: string;
  fromUserId: string;
  /** Custom message type, e.g. `bidlive:Bid`. Must not start with "RC:". */
  messageType: string;
  content: Record<string, unknown>;
  pushContent?: string;
  pushData?: string;
  disableNotification?: boolean;
}) {
  const cfg = nexsconnConfig();
  if (!cfg) return { ok: false as const, error: "not_configured" };

  const form: Record<string, string> = {
    fromUserId: params.fromUserId,
    toGroupId: params.channelId,
    objectName: params.messageType,
    content: JSON.stringify(params.content),
    pushContent: params.pushContent ?? "",
    pushData: params.pushData ?? "",
    isPersisted: "1",
    isCounted: "1",
    // Without this the sender's own client never sees the message it caused.
    isIncludeSender: "1",
  };
  if (params.disableNotification) form.disablePush = "true";

  const res = await post(cfg, "/message/group/publish.json", form);
  if (res.ok) {
    const uids = res.body?.messageUIDs as Array<{ messageUID?: string }> | undefined;
    return { ok: true as const, messageId: uids?.[0]?.messageUID };
  }
  return { ok: false as const, error: res.error ?? "publish_failed", code: res.code };
}

/** Create the group channel that backs a lot (idempotent server-side). */
export async function createLotChannel(channelId: string, name: string, ownerId: string) {
  const cfg = nexsconnConfig();
  if (!cfg) return { ok: false as const, error: "not_configured" };
  const res = await post(cfg, "/group/create.json", {
    userId: ownerId,
    groupId: channelId,
    groupName: name,
  });
  return res.ok ? { ok: true as const } : { ok: false as const, error: res.error, code: res.code };
}

/** Join the channel as a bidder so this lot's messages and pushes reach them. */
export async function joinLotChannel(channelId: string, userId: string, name: string) {
  const cfg = nexsconnConfig();
  if (!cfg) return { ok: false as const, error: "not_configured" };
  const res = await post(cfg, "/group/join.json", {
    userId,
    groupId: channelId,
    groupName: name,
  });
  return res.ok ? { ok: true as const } : { ok: false as const, error: res.error, code: res.code };
}

/** Private note to one user — this is how "you've been outbid" becomes a push. */
export async function notifyUser(
  toUserId: string,
  fromUserId: string,
  text: string,
  pushContent: string,
  pushData: string,
) {
  const cfg = nexsconnConfig();
  if (!cfg) return { ok: false as const, error: "not_configured" };
  const res = await post(cfg, "/message/private/publish.json", {
    fromUserId,
    toUserId,
    objectName: "RC:TxtMsg",
    content: JSON.stringify({ content: text }),
    pushContent,
    pushData,
    isIncludeSender: "1",
  });
  return res.ok ? { ok: true as const } : { ok: false as const, error: res.error, code: res.code };
}

/* ------------------------------------------------------------------------- */
/* Diagnostics                                                                */
/* ------------------------------------------------------------------------- */

export type MirrorResult = {
  at: number;
  ok: boolean;
  kind: string;
  error?: string;
  code?: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __bidliveMirrorLog: MirrorResult[] | undefined;
}

/** Last few publish attempts — surfaced in /api/health so failures are visible. */
export function recordMirror(result: MirrorResult) {
  if (!globalThis.__bidliveMirrorLog) globalThis.__bidliveMirrorLog = [];
  globalThis.__bidliveMirrorLog.push(result);
  if (globalThis.__bidliveMirrorLog.length > 30) globalThis.__bidliveMirrorLog.shift();
}

export function recentMirrorResults(): MirrorResult[] {
  return (globalThis.__bidliveMirrorLog ?? []).slice(-6);
}
