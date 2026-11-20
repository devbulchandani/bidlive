import {
  BID_RATE_MS,
  extensionFor,
  nextMin,
  recomputeTop,
  validateBid,
} from "./auction";
import { emitUserNotice, appendEvent, eventsFor, getLot, participants } from "./store";
import {
  createLotChannel,
  getUserToken,
  isNexconnConfigured,
  joinLotChannel,
  notifyUser,
  publishCustomMessage,
  recordMirror,
} from "./nexconn/server";
import type { BidRejection, Lot } from "./types";

export const MSG_BID = "bidlive:Bid";
export const MSG_SYSTEM = "bidlive:System";
export const MSG_CHAT = "bidlive:Chat";

export type BidResult =
  | { ok: true; amount: number; endsAt: number; extended: boolean; seq: number }
  | { ok: false; rejection: BidRejection };

const SYSTEM_USER = "system:auctioneer";
/** The room is owned by a bot identity so creation never depends on a bidder. */
const BOT_ID = process.env.NEXCONN_BOT_USER?.trim() || "bidlive_auctioneer";
const readyChannels = new Set<string>();

declare global {
  // eslint-disable-next-line no-var
  var __bidliveAttempts: Map<string, number> | undefined;
}

/**
 * Make sure the lot's group channel exists (owned by the auctioneer bot) before we
 * publish into it. Publishing to a channel that was never created is the most
 * common silent failure in a chat integration.
 */
async function ensureChannel(lot: Lot): Promise<boolean> {
  if (readyChannels.has(lot.channelId)) return true;
  const bot = await getUserToken(BOT_ID, "Auctioneer");
  if (!bot.ok) return false;
  // A "group already exists" error is success for our purposes.
  await createLotChannel(lot.channelId, lot.title, BOT_ID);
  readyChannels.add(lot.channelId);
  return true;
}

function bidAttempts() {
  if (!globalThis.__bidliveAttempts) globalThis.__bidliveAttempts = new Map();
  return globalThis.__bidliveAttempts;
}

/** Mirror to Nexconn without ever blocking or failing the auction itself. */
function mirror(
  lot: Lot,
  args: {
    userId: string;
    messageType: string;
    content: Record<string, unknown>;
    pushContent?: string;
    pushData?: string;
    disableNotification?: boolean;
  },
) {
  if (!isNexconnConfigured()) return;
  void ensureChannel(lot)
    .then(() =>
      publishCustomMessage({
        channelId: lot.channelId,
        fromUserId: args.userId,
        messageType: args.messageType,
        content: args.content,
        pushContent: args.pushContent,
        pushData: args.pushData,
        disableNotification: args.disableNotification,
      }),
    )
    .then((res) => {
      recordMirror({
        at: Date.now(),
        ok: res.ok,
        kind: args.messageType,
        error: res.ok ? undefined : String(res.error),
        code: res.ok ? undefined : res.code,
      });
      if (!res.ok && process.env.NODE_ENV !== "production") {
        console.warn("[nexconn] mirror failed:", args.messageType, res.error, res.code);
      }
    })
    .catch((err) => {
      recordMirror({
        at: Date.now(),
        ok: false,
        kind: args.messageType,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}

export function placeBid(args: {
  lotId: string;
  userId: string;
  name: string;
  amount: number;
  now?: number;
}): BidResult {
  const lot = getLot(args.lotId);
  if (!lot) {
    return {
      ok: false,
      rejection: { code: "closed", reason: "This lot no longer exists." },
    };
  }
  const now = args.now ?? Date.now();
  ensureClosed(lot, now);

  // Request-level throttle: covers accepted *and* rejected bids, so a held-down
  // Enter key can't hammer the room.
  const throttleKey = `${lot.id}:${args.userId}`;
  const lastAttempt = bidAttempts().get(throttleKey) ?? 0;
  if (now - lastAttempt < BID_RATE_MS) {
    return {
      ok: false,
      rejection: {
        code: "rate",
        reason: "Give the room a second to catch up.",
        nextMin: nextMin(lot),
      },
    };
  }
  bidAttempts().set(throttleKey, now);

  const check = validateBid(lot, args.amount, args.userId, now);
  if (!check.ok) return { ok: false, rejection: check.rejection };

  const previousLeader = lot.top;

  lot.top = {
    amount: args.amount,
    userId: args.userId,
    name: args.name,
    seq: 0,
  };
  lot.bidCount += 1;

  const event = appendEvent({
    lotId: lot.id,
    kind: "bid",
    userId: args.userId,
    name: args.name,
    amount: args.amount,
    meta: { previousLeader: previousLeader?.userId ?? null },
  });
  if (lot.top) lot.top.seq = event.seq;

  mirror(lot, {
    userId: args.userId,
    messageType: MSG_BID,
    content: {
      lotId: lot.id,
      amount: args.amount,
      bidderId: args.userId,
      bidderName: args.name,
      seq: event.seq,
      endsAt: lot.endsAt,
    },
    pushContent: `${args.name} bid ₹${args.amount.toLocaleString("en-IN")}`,
    pushData: JSON.stringify({ lotId: lot.id, type: "bid" }),
  });

  // Anti-snipe: visibly extend rather than silently changing a number.
  const ext = extensionFor(lot, now);
  let extended = false;
  if (ext) {
    lot.endsAt = ext.newEndsAt;
    lot.extensions = ext.extension;
    extended = true;
    appendEvent({
      lotId: lot.id,
      kind: "lot_extended",
      amount: ext.newEndsAt,
      meta: { reason: ext.reason, extension: ext.extension },
    });
    mirror(lot, {
      userId: SYSTEM_USER,
      messageType: MSG_SYSTEM,
      content: {
        type: "lot.extended",
        lotId: lot.id,
        reason: ext.reason,
        newEndsAt: ext.newEndsAt,
        extension: ext.extension,
      },
      disableNotification: true,
    });
  }

  // Only the displaced leader gets told — not every past bidder.
  if (previousLeader && previousLeader.userId !== args.userId) {
    const body = `You've been outbid on ${lot.title} — ₹${args.amount.toLocaleString(
      "en-IN",
    )} by ${args.name}.`;
    emitUserNotice(previousLeader.userId, {
      type: "outbid",
      lotId: lot.id,
      lotTitle: lot.title,
      amount: args.amount,
      byName: args.name,
      message: body,
    });
    if (isNexconnConfigured()) {
      void notifyUser(
        previousLeader.userId,
        SYSTEM_USER,
        body,
        body,
        JSON.stringify({ lotId: lot.id, type: "outbid" }),
      )
        .then((res) =>
          recordMirror({
            at: Date.now(),
            ok: res.ok,
            kind: "private:outbid",
            error: res.ok ? undefined : String(res.error),
            code: res.ok ? undefined : res.code,
          }),
        )
        .catch(() => undefined);
    }
  }

  return { ok: true, amount: args.amount, endsAt: lot.endsAt, extended, seq: event.seq };
}

export function recallLastBid(args: { lotId: string; userId: string }) {
  const lot = getLot(args.lotId);
  if (!lot) return { ok: false as const, reason: "No such lot." };
  if (lot.status !== "live") return { ok: false as const, reason: "This lot has closed." };
  if (lot.top?.userId === args.userId) {
    return {
      ok: false as const,
      reason: "You're the leading bidder — you can't withdraw while you're winning.",
    };
  }

  const last = [...eventsFor(lot.id)]
    .reverse()
    .find((e) => e.kind === "bid" && e.userId === args.userId);
  if (!last) return { ok: false as const, reason: "You haven't bid on this lot." };

  const alreadyRecalled = eventsFor(lot.id).some(
    (e) => e.kind === "bid_recalled" && e.meta?.bidEventId === last.id,
  );
  if (alreadyRecalled) return { ok: false as const, reason: "That bid was already withdrawn." };

  appendEvent({
    lotId: lot.id,
    kind: "bid_recalled",
    userId: args.userId,
    name: last.name,
    amount: last.amount,
    meta: { bidEventId: last.id },
  });
  recomputeTop(eventsFor(lot.id), lot);

  mirror(lot, {
    userId: args.userId,
    messageType: MSG_SYSTEM,
    content: {
      type: "bid.recalled",
      lotId: lot.id,
      amount: last.amount,
      bidderName: last.name,
      leadingAmount: lot.top?.amount ?? lot.basePrice,
    },
    disableNotification: true,
  });

  return { ok: true as const, refunded: last.amount };
}

export function sendChat(args: { lotId: string; userId: string; name: string; text: string }) {
  const lot = getLot(args.lotId);
  if (!lot) return { ok: false as const, reason: "No such lot." };
  const text = args.text.trim().slice(0, 500);
  if (!text) return { ok: false as const, reason: "Say something first." };
  const event = appendEvent({
    lotId: lot.id,
    kind: "chat",
    userId: args.userId,
    name: args.name,
    text,
  });
  mirror(lot, {
    userId: args.userId,
    messageType: MSG_CHAT,
    content: { lotId: lot.id, text, name: args.name },
    pushContent: `${args.name}: ${text.slice(0, 80)}`,
    pushData: JSON.stringify({ lotId: lot.id, type: "chat" }),
  });
  return { ok: true as const, seq: event.seq };
}

export function moderate(args: {
  lotId: string;
  actorId: string;
  action: "mute" | "unmute" | "extend" | "close_now";
  targetId?: string;
  targetName?: string;
  seconds?: number;
}) {
  const lot = getLot(args.lotId);
  if (!lot) return { ok: false as const, reason: "No such lot." };
  if (args.actorId !== lot.sellerId && args.actorId !== "system:auctioneer") {
    return { ok: false as const, reason: "Only the auctioneer can do that." };
  }

  if (args.action === "mute" && args.targetId) {
    if (!lot.muted.includes(args.targetId)) lot.muted.push(args.targetId);
    appendEvent({
      lotId: lot.id,
      kind: "mod",
      userId: args.targetId,
      name: args.targetName,
      meta: { action: "mute", targetId: args.targetId },
    });
    return { ok: true as const };
  }
  if (args.action === "unmute" && args.targetId) {
    lot.muted = lot.muted.filter((id) => id !== args.targetId);
    appendEvent({
      lotId: lot.id,
      kind: "mod",
      userId: args.targetId,
      name: args.targetName,
      meta: { action: "unmute", targetId: args.targetId },
    });
    return { ok: true as const };
  }
  if (args.action === "extend") {
    const seconds = args.seconds ?? 60;
    lot.endsAt += seconds * 1000;
    appendEvent({
      lotId: lot.id,
      kind: "lot_extended",
      amount: lot.endsAt,
      meta: { reason: "auctioneer_extension", seconds },
    });
    return { ok: true as const, endsAt: lot.endsAt };
  }
  if (args.action === "close_now") {
    lot.endsAt = Date.now() + (args.seconds ?? 30) * 1000;
    appendEvent({
      lotId: lot.id,
      kind: "lot_extended",
      amount: lot.endsAt,
      meta: { reason: "auctioneer_closing", seconds: args.seconds ?? 30 },
    });
    return { ok: true as const, endsAt: lot.endsAt };
  }
  return { ok: false as const, reason: "Unknown action." };
}

/**
 * Lazy close: any read after endsAt settles the lot. Serverless has no long
 * timer, so the settlement is driven by whoever touches the room first.
 */
export function ensureClosed(lot: Lot, now = Date.now()) {
  if (lot.status !== "live" || now < lot.endsAt) return false;
  settle(lot);
  return true;
}

function settle(lot: Lot) {
  const top = lot.top;
  const meetsReserve = !lot.reserve || (top ? top.amount >= lot.reserve : false);

  if (!top || !meetsReserve) {
    lot.status = "unsold";
    lot.winner = null;
    appendEvent({
      lotId: lot.id,
      kind: "lot_settled",
      meta: {
        unsold: true,
        reason: top ? "reserve_not_met" : "no_bids",
        reserve: lot.reserve,
      },
    });
    return;
  }

  lot.status = "closed";
  lot.winner = top;
  appendEvent({
    lotId: lot.id,
    kind: "lot_settled",
    userId: top.userId,
    name: top.name,
    amount: top.amount,
    meta: { bidCount: lot.bidCount, extensions: lot.extensions },
  });

  mirror(lot, {
    userId: SYSTEM_USER,
    messageType: MSG_SYSTEM,
    content: {
      type: "lot.settled",
      lotId: lot.id,
      winnerId: top.userId,
      winnerName: top.name,
      finalAmount: top.amount,
      bidCount: lot.bidCount,
    },
  });

  for (const [userId] of participants(lot.id)) {
    if (userId === top.userId) continue;
    emitUserNotice(userId, {
      type: "lost",
      lotId: lot.id,
      lotTitle: lot.title,
      amount: top.amount,
      message: `${lot.title} went to ${top.name} at ₹${top.amount.toLocaleString("en-IN")}.`,
    });
  }
}

export function closeLot(lotId: string) {
  const lot = getLot(lotId);
  if (!lot) return { ok: false as const, reason: "No such lot." };
  if (lot.status !== "live") return { ok: true as const, already: true };
  settle(lot);
  return { ok: true as const, winner: lot.winner, status: lot.status };
}

export function joinLot(lotId: string, userId: string, name: string) {
  const lot = getLot(lotId);
  if (!lot) return { ok: false as const, reason: "No such lot." };
  ensureClosed(lot);

  // Membership so the client SDK receives this lot's messages (and its pushes).
  if (isNexconnConfigured()) {
    void ensureChannel(lot)
      .then(() => joinLotChannel(lot.channelId, userId, name))
      .catch(() => undefined);
  }

  if (!lot.watcherIds.includes(userId)) {
    lot.watcherIds.push(userId);
    appendEvent({ lotId, kind: "join", userId, name, meta: { name } });
  }
  return { ok: true as const };
}
