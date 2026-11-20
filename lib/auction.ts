import type { AuctionEvent, BidRejection, Lot } from "./types";

/** Anti-snipe: a bid inside this window pushes the clock out. */
export const SNIPE_WINDOW_MS = 30_000;
export const SNIPE_EXTENSION_MS = 30_000;
export const MAX_EXTENSIONS = 5;
/** One accepted bid per user per this window — stops troll spam. */
export const BID_RATE_MS = 450;

/** Bid banding: keeps a ₹1 troll from creeping a ₹2,500 lot. */
export function incrementFor(basePrice: number): number {
  if (basePrice < 1_000) return 50;
  if (basePrice < 10_000) return 250;
  if (basePrice < 50_000) return 500;
  return 1_000;
}

export function nextMin(lot: Lot): number {
  return lot.top ? lot.top.amount + lot.increment : lot.basePrice;
}

export function validateBid(
  lot: Lot,
  amount: number,
  userId: string,
  now = Date.now(),
): { ok: true } | { ok: false; rejection: BidRejection } {
  const min = nextMin(lot);

  if (lot.status !== "live" || now >= lot.endsAt) {
    return {
      ok: false,
      rejection: { code: "closed", reason: "This lot has closed." },
    };
  }
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    return {
      ok: false,
      rejection: { code: "invalid", reason: "Enter a whole rupee amount.", nextMin: min },
    };
  }
  if (amount > 50_000_000) {
    return {
      ok: false,
      rejection: { code: "too_high", reason: "That bid is above the lot ceiling.", nextMin: min },
    };
  }
  if (userId === lot.sellerId) {
    return {
      ok: false,
      rejection: {
        code: "seller",
        reason: "Sellers can't bid on their own lot.",
        nextMin: min,
      },
    };
  }
  if (lot.muted.includes(userId)) {
    return {
      ok: false,
      rejection: {
        code: "muted",
        reason: "The auctioneer has muted you for this lot.",
        nextMin: min,
      },
    };
  }
  if (lot.top?.userId === userId) {
    return {
      ok: false,
      rejection: {
        code: "self_outbid",
        reason: "You're already the leading bidder.",
        nextMin: min,
      },
    };
  }
  if (amount < min) {
    return {
      ok: false,
      rejection: {
        code: "too_low",
        reason: `Minimum bid is ₹${min.toLocaleString("en-IN")}.`,
        nextMin: min,
      },
    };
  }
  return { ok: true };
}

/**
 * Anti-snipe decision. Pure so the client can preview the same rule it sees
 * enforced in the message stream.
 */
export function extensionFor(lot: Lot, now = Date.now()) {
  const inSnipeWindow = lot.endsAt - now <= SNIPE_WINDOW_MS;
  if (!inSnipeWindow || lot.extensions >= MAX_EXTENSIONS) return null;
  return {
    newEndsAt: lot.endsAt + SNIPE_EXTENSION_MS,
    reason: "bid_in_final_30s",
    extension: lot.extensions + 1,
  };
}

/**
 * The projection: a lot's top bid is recomputable from its event log alone.
 * This is what makes "the chat history is the database" true rather than a slogan.
 */
export function recomputeTop(events: AuctionEvent[], lot: Lot) {
  const recalled = new Set(
    events.filter((e) => e.kind === "bid_recalled").map((e) => String(e.meta?.bidEventId)),
  );
  let top: Lot["top"] = null;
  let bidCount = 0;
  for (const e of events) {
    if (e.kind !== "bid") continue;
    bidCount += 1;
    if (recalled.has(e.id)) continue;
    if (!top || e.seq > top.seq) {
      top = {
        amount: e.amount ?? 0,
        userId: e.userId ?? "",
        name: e.name ?? "",
        seq: e.seq,
        messageId: e.messageId,
      };
    }
  }
  lot.top = top;
  lot.bidCount = bidCount;
  return lot;
}

export function parseBidInput(
  raw: string,
  lot: { basePrice: number; top: { amount: number } | null },
): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/[₹,\s]/g, "");
  if (!cleaned) return null;
  const kMatch = /^(\d+(?:\.\d+)?)k$/.exec(cleaned);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const plusMatch = /^\+(\d+)$/.exec(cleaned);
  if (plusMatch) return (lot.top?.amount ?? lot.basePrice) + parseInt(plusMatch[1], 10);
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10);
  return null;
}
