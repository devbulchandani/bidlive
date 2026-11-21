export type LotStatus = "live" | "closed" | "unsold";

export type User = {
  id: string;
  name: string;
  color: string;
};

export type TopBid = {
  amount: number;
  userId: string;
  name: string;
  seq: number;
  messageId?: string;
};

export type Lot = {
  id: string;
  /** Nexconn GroupChannel id — every auction event is also published here. */
  channelId: string;
  title: string;
  subtitle: string;
  emoji: string;
  imageUrl: string;
  description: string;
  sellerId: string;
  sellerName: string;
  basePrice: number;
  increment: number;
  createdAt: number;
  endsAt: number;
  extensions: number;
  status: LotStatus;
  top: TopBid | null;
  winner: TopBid | null;
  reserve: number | null;
  muted: string[];
  bidCount: number;
  watcherIds: string[];
};

export type EventKind =
  | "lot_created"
  | "bid"
  | "bid_recalled"
  | "lot_extended"
  | "lot_settled"
  | "chat"
  | "mod"
  | "join";

export type AuctionEvent = {
  id: string;
  lotId: string;
  /** Monotonic per-lot sequence. Clients render by this, never by arrival time. */
  seq: number;
  kind: EventKind;
  at: number;
  userId?: string;
  name?: string;
  amount?: number;
  text?: string;
  meta?: Record<string, unknown>;
  /** Set when the message was mirrored to Nexconn. */
  messageId?: string;
};

export type LotSummary = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  imageUrl: string;
  status: LotStatus;
  currentBid: number;
  basePrice: number;
  increment: number;
  nextMin: number;
  endsAt: number;
  extensions: number;
  bidCount: number;
  watchers: number;
  sellerName: string;
  topName: string | null;
  top: TopBid | null;
  description: string;
  sellerId: string;
  muted: string[];
  reserve: number | null;
  winner: TopBid | null;
  channelId: string;
  /** Whether the requesting user is in this room. */
  watching?: boolean;
};

export type BidRejection = {
  code:
    | "closed"
    | "too_low"
    | "seller"
    | "muted"
    | "rate"
    | "invalid"
    | "self_outbid"
    | "too_high";
  reason: string;
  nextMin?: number;
};

/** Full lot payload. Kept as an alias so the room never has to cast. */
export type LotView = LotSummary;

export type Notice = {
  notice?: true;
  type?: "outbid" | "lost" | string;
  lotId?: string;
  lotTitle?: string;
  amount?: number;
  byName?: string;
  message?: string;
};
