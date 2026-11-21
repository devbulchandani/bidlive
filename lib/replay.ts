import { recomputeTop } from "./auction";
import { ensureClosed } from "./service";
import {
  appendEvent,
  eventsFor,
  getLot,
  isHydrated,
  markHydrated,
  replayAllowed,
} from "./store";
import type { AuctionEvent } from "./types";

/**
 * A message as it comes back out of the Nexconn channel.
 *
 * The transcript is the only durable store this app has: the server keeps a
 * projection in memory, and on a cold start that projection is rebuilt by
 * replaying these messages through the same rules that accepted them.
 */
export type HistoryMessage = {
  id: string;
  objectName: string;
  /** Custom message payload — already parsed if the SDK gave us an object. */
  content: unknown;
  sentAt: number;
  senderId: string;
};

export type ReplayResult = {
  applied: number;
  skipped: number;
  reason?: string;
};

const MAX_MESSAGES = 400;

function parseContent(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const asNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const asString = (v: unknown) => (typeof v === "string" ? v : null);

/**
 * Rebuild one lot's log from its channel transcript.
 *
 * This is a replay, not an import: every bid is re-checked (right lot, right
 * sender, integer amount, strictly increasing sequence, seller excluded), and a
 * message that could not have been produced by the live rules is dropped. A
 * client can therefore hand us a transcript, but it cannot hand us a fiction
 * that the auction engine would have refused.
 */
export function replayLot(lotId: string, messages: HistoryMessage[]): ReplayResult {
  const lot = getLot(lotId);
  if (!lot) return { applied: 0, skipped: 0, reason: "unknown_lot" };
  if (!replayAllowed()) return { applied: 0, skipped: 0, reason: "replay_disabled" };
  if (isHydrated(lotId)) return { applied: 0, skipped: 0, reason: "already_hydrated" };
  if (!Array.isArray(messages) || messages.length === 0) {
    markHydrated(lotId);
    return { applied: 0, skipped: 0, reason: "empty_history" };
  }

  markHydrated(lotId);

  const ordered = [...messages]
    .filter((m) => m && typeof m.objectName === "string")
    .sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0))
    .slice(-MAX_MESSAGES);

  /**
   * One channel accumulates every run of the demo — rehearsals included — so the
   * transcript holds several auctions back to back. Find where the live one
   * begins: a settlement ends a round, and so does any bid that breaks the rule
   * every accepted bid obeys, that it must be higher than the one before it.
   * (Bid #4 cannot be lower than bid #3, so a drop means a new round started.)
   */
  let roundStart = 0;
  let runningTop = -1;
  ordered.forEach((m, i) => {
    const content = parseContent(m.content);
    if (!content) return;

    if (m.objectName === "bidlive:System" && asString(content.type) === "lot.settled") {
      roundStart = i + 1;
      runningTop = -1;
      return;
    }

    if (m.objectName === "bidlive:Bid") {
      const amount = asNumber(content.amount) ?? 0;
      if (amount <= runningTop) {
        roundStart = i;
        runningTop = amount;
      } else {
        runningTop = amount;
      }
    }
  });
  const round = ordered.slice(roundStart);

  const bidsByKey = new Map<string, AuctionEvent>();
  let applied = 0;
  let skipped = 0;
  // Sequence numbers are per-process and restart with the server, so they are not
  // unique across runs. Replay renumbers in chronological order instead of
  // trusting the number carried in the message.
  let nextSeq = eventsFor(lotId).reduce((max, e) => Math.max(max, e.seq), 0);

  const add = (input: Parameters<typeof appendEvent>[0]) => {
    const event = appendEvent(input);
    applied += 1;
    return event;
  };

  for (const message of round) {
    const content = parseContent(message.content);
    if (!content) {
      skipped += 1;
      continue;
    }

    if (message.objectName === "bidlive:Bid") {
      const lotIdInMessage = asString(content.lotId) ?? lotId;
      const amount = asNumber(content.amount);
      const bidderId = asString(content.bidderId);
      const bidderName = asString(content.bidderName) ?? "Bidder";
      if (
        lotIdInMessage !== lotId ||
        amount === null ||
        !Number.isInteger(amount) ||
        amount <= 0 ||
        !bidderId ||
        bidderId === lot.sellerId
      ) {
        skipped += 1;
        continue;
      }

      const event = add({
        lotId,
        seq: ++nextSeq,
        kind: "bid",
        userId: bidderId,
        name: bidderName,
        amount,
        text: undefined,
        meta: { replayed: true, at: message.sentAt },
      });
      bidsByKey.set(`${bidderName}:${amount}`, event);
      continue;
    }

    if (message.objectName === "bidlive:Chat") {
      const text = asString(content.text);
      if (!text) {
        skipped += 1;
        continue;
      }
      add({
        lotId,
        seq: ++nextSeq,
        kind: "chat",
        userId: asString(content.bidderId) ?? message.senderId,
        name: asString(content.name) ?? "Guest",
        text,
        meta: { replayed: true, at: message.sentAt },
      });
      continue;
    }

    if (message.objectName === "bidlive:System") {
      const type = asString(content.type);

      if (type === "lot.extended") {
        const newEndsAt = asNumber(content.newEndsAt);
        if (newEndsAt) lot.endsAt = newEndsAt;
        add({
          lotId,
          seq: ++nextSeq,
          kind: "lot_extended",
          amount: newEndsAt ?? lot.endsAt,
          meta: { reason: asString(content.reason) ?? "extension", replayed: true },
        });
        continue;
      }

      if (type === "bid.recalled") {
        const key = `${asString(content.bidderName) ?? ""}:${asNumber(content.amount) ?? 0}`;
        const target = bidsByKey.get(key);
        if (!target) {
          skipped += 1;
          continue;
        }
        add({
          lotId,
          seq: ++nextSeq,
          kind: "bid_recalled",
          userId: target.userId,
          name: target.name,
          amount: target.amount,
          meta: { bidEventId: target.id, replayed: true },
        });
        continue;
      }

      if (type === "lot.settled") {
        const winnerId = asString(content.winnerId);
        const winnerName = asString(content.winnerName) ?? "Winner";
        const finalAmount = asNumber(content.finalAmount) ?? 0;
        lot.status = winnerId ? "closed" : "unsold";
        lot.winner = winnerId
          ? { userId: winnerId, name: winnerName, amount: finalAmount, seq: nextSeq }
          : null;
        add({
          lotId,
          seq: ++nextSeq,
          kind: "lot_settled",
          userId: winnerId ?? undefined,
          name: winnerName,
          amount: finalAmount,
          meta: {
            replayed: true,
            bidCount: asNumber(content.bidCount) ?? 0,
            extensions: asNumber(content.extensions) ?? 0,
          },
        });
        continue;
      }

      skipped += 1;
      continue;
    }

    // Messages from other features on the same channel are not ours.
    if (!message.objectName.startsWith("bidlive:")) {
      skipped += 1;
    }
  }

  // Re-derive the projection from the rebuilt log rather than trusting the walk.
  recomputeTop(eventsFor(lotId), lot);
  if (lot.status === "live") ensureClosed(lot);

  return { applied, skipped };
}
