import { incrementFor, recomputeTop } from "./auction";
import type { AuctionEvent, EventKind, Lot, LotSummary } from "./types";

type Listener = (event: AuctionEvent) => void;

type Store = {
  lots: Map<string, Lot>;
  events: Map<string, AuctionEvent[]>;
  seq: Map<string, number>;
  listeners: Map<string, Set<Listener>>;
  userListeners: Map<string, Set<Listener>>;
  bootedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __bidlive: Store | undefined;
}

const MIN = 60_000;

function seedLots(): Lot[] {
  const now = Date.now();
  const base = [
    {
      id: "yashica",
      title: "Vintage Yashica T4",
      subtitle: "35mm point-and-shoot, tested shutter",
      emoji: "📷",
      imageUrl: "",
      description:
        "Body 8/10, lens clean, shutter fires accurately at all speeds. Original leather case included. Serial matched to the box.",
      sellerName: "Meera",
      basePrice: 500,
      reserve: null,
      minutes: 12,
    },
    {
      id: "jordan",
      title: "Air Jordan 1 'Bred' (UK 9)",
      subtitle: "2021 retro, worn twice",
      emoji: "👟",
      imageUrl: "",
      description:
        "Worn twice indoors. No creasing on the toe box, midsole clean, box and receipt included. Sold as-is.",
      sellerName: "Dev",
      basePrice: 2_500,
      reserve: 4_000,
      minutes: 25,
    },
    {
      id: "vinyl",
      title: "Aja — Steely Dan (first press)",
      subtitle: "1977 ABC, gatefold, VG+",
      emoji: "💿",
      imageUrl: "",
      description:
        "Clean first pressing on ABC. Sleeve has light shelf wear, record plays through with no skips. Gatefold intact.",
      sellerName: "Meera",
      basePrice: 800,
      reserve: null,
      minutes: 45,
    },
  ];

  return base.map((b, i) => ({
    id: b.id,
    channelId: `lot_${b.id}`,
    title: b.title,
    subtitle: b.subtitle,
    emoji: b.emoji,
    imageUrl: b.imageUrl,
    description: b.description,
    sellerId: b.sellerName.toLowerCase(),
    sellerName: b.sellerName,
    basePrice: b.basePrice,
    increment: incrementFor(b.basePrice),
    createdAt: now - (3 - i) * MIN,
    endsAt: now + b.minutes * MIN,
    extensions: 0,
    status: "live",
    top: null,
    winner: null,
    reserve: b.reserve,
    muted: [],
    bidCount: 0,
    watcherIds: [],
  }));
}

function init(): Store {
  const store: Store = {
    lots: new Map(),
    events: new Map(),
    seq: new Map(),
    listeners: new Map(),
    userListeners: new Map(),
    bootedAt: Date.now(),
  };
  for (const lot of seedLots()) {
    store.lots.set(lot.id, lot);
    // The catalogue card is the first message in the room's history — the room
    // opens with the lot, not with an empty state.
    store.events.set(lot.id, [
      {
        id: `${lot.id}:1`,
        lotId: lot.id,
        seq: 1,
        kind: "lot_created",
        at: lot.createdAt,
        userId: lot.sellerId,
        name: lot.sellerName,
        meta: {
          title: lot.title,
          description: lot.description,
          basePrice: lot.basePrice,
          increment: lot.increment,
          endsAt: lot.endsAt,
          reserve: lot.reserve,
        },
      },
    ]);
    store.seq.set(lot.id, 2);
  }
  return store;
}

export function store(): Store {
  if (!globalThis.__bidlive) globalThis.__bidlive = init();
  return globalThis.__bidlive;
}

/** Test/demo helper: wipe everything and re-seed fresh, live lots. */
export function resetStore() {
  globalThis.__bidlive = init();
  return store();
}

export function getLot(id: string): Lot | undefined {
  return store().lots.get(id);
}

export function allLots(): Lot[] {
  return [...store().lots.values()];
}

export function listLotSummaries(): LotSummary[] {
  return allLots()
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "live" ? -1 : 1;
      return a.endsAt - b.endsAt;
    })
    .map(summarise);
}

export function summarise(lot: Lot): LotSummary {
  return {
    id: lot.id,
    title: lot.title,
    subtitle: lot.subtitle,
    emoji: lot.emoji,
    imageUrl: lot.imageUrl,
    status: lot.status,
    currentBid: lot.top?.amount ?? lot.basePrice,
    basePrice: lot.basePrice,
    increment: lot.increment,
    nextMin: lot.top ? lot.top.amount + lot.increment : lot.basePrice,
    endsAt: lot.endsAt,
    extensions: lot.extensions,
    bidCount: lot.bidCount,
    watchers: lot.watcherIds.length,
    sellerName: lot.sellerName,
    topName: lot.top?.name ?? null,
    top: lot.top,
    description: lot.description,
    sellerId: lot.sellerId,
    muted: lot.muted,
    reserve: lot.reserve,
    winner: lot.winner,
    channelId: lot.channelId,
  };
}

export function eventsFor(lotId: string): AuctionEvent[] {
  return store().events.get(lotId) ?? [];
}

export type AppendInput = {
  lotId: string;
  kind: EventKind;
  userId?: string;
  name?: string;
  amount?: number;
  text?: string;
  meta?: Record<string, unknown>;
};

/**
 * The single writer. Every auction event is appended here exactly once, given a
 * monotonic seq, then fanned out to SSE subscribers and (when configured) mirrored
 * into the lot's Nexconn GroupChannel.
 */
export function appendEvent(input: AppendInput): AuctionEvent {
  const s = store();
  const seq = (s.seq.get(input.lotId) ?? 1) + 0;
  s.seq.set(input.lotId, seq + 1);

  const event: AuctionEvent = {
    id: `${input.lotId}:${seq}`,
    lotId: input.lotId,
    seq,
    kind: input.kind,
    at: Date.now(),
    userId: input.userId,
    name: input.name,
    amount: input.amount,
    text: input.text,
    meta: input.meta,
  };

  const list = s.events.get(input.lotId) ?? [];
  list.push(event);
  if (list.length > 600) list.splice(0, list.length - 600);
  s.events.set(input.lotId, list);

  // Broadcast on a microtask, not inline. Callers append an event and then finish
  // mutating the lot (e.g. stamping the winning bid's seq). Broadcasting inline
  // would ship a summary taken mid-mutation, and the room would render the newest
  // bid as OUTBID because top.seq was still 0.
  queueMicrotask(() => {
    for (const fn of s.listeners.get(input.lotId) ?? []) {
      safely(() => fn(event));
    }
    if (input.userId) {
      for (const fn of s.userListeners.get(input.userId) ?? []) {
        safely(() => fn(event));
      }
    }
  });
  return event;
}

function safely(fn: () => void) {
  try {
    fn();
  } catch {
    /* a broken subscriber must never take down the writer */
  }
}

export function subscribe(lotId: string, fn: Listener) {
  const s = store();
  const set = s.listeners.get(lotId) ?? new Set<Listener>();
  set.add(fn);
  s.listeners.set(lotId, set);
  return () => set.delete(fn);
}

export function subscribeUser(userId: string, fn: Listener) {  const s = store();
  const set = s.userListeners.get(userId) ?? new Set<Listener>();
  set.add(fn);
  s.userListeners.set(userId, set);
  return () => set.delete(fn);
}

export function rehydrateLot(lotId: string) {
  const lot = getLot(lotId);
  if (!lot) return undefined;
  return recomputeTop(eventsFor(lotId), lot);
}

/**
 * Private notice for one user (outbid, lost, moderation). Not appended to the lot
 * log — it belongs to the recipient's stream, the way a push notification does.
 */
export function emitUserNotice(userId: string, notice: Record<string, unknown>) {
  const s = store();
  const event = {
    id: `notice:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    lotId: String(notice.lotId ?? ""),
    seq: 0,
    kind: "chat" as const,
    at: Date.now(),
    meta: { notice: true, ...notice },
  } satisfies AuctionEvent;

  for (const fn of s.userListeners.get(userId) ?? []) {
    safely(() => fn(event));
  }
}

/** Anyone who touched the lot — used to alert losing bidders at close. */
export function participants(lotId: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of eventsFor(lotId)) {
    if (e.kind === "bid" && e.userId) out.set(e.userId, e.name ?? "bidder");
  }
  return out;
}
