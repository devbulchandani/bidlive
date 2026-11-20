"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { client } from "@/lib/client/api";
import { useLotFeed, useNotices } from "@/lib/client/hooks";
import { useNexconnBridge } from "@/lib/client/nexconn";
import { useIdentityState } from "@/lib/client/identity";
import type { AuctionEvent, LotView, Notice } from "@/lib/types";
import { initials, plural, rupee } from "@/lib/format";
import { IdentityGate } from "@/components/IdentityGate";
import { TopBar } from "@/components/TopBar";
import { EventItem } from "@/components/room/EventItem";
import { BidPanel } from "@/components/room/BidPanel";

type Toast = { id: string; notice: Notice };

export function LotRoom({ lotId }: { lotId: string }) {
  const { identity, ready, commit } = useIdentityState();
  const { lot, events, online, offset, error, loading, refresh } = useLotFeed(lotId);
  const bridge = useNexconnBridge(identity, lot?.channelId);

  const [gate, setGate] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [chat, setChat] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [alertsOn, setAlertsOn] = useState(false);

  const joined = useRef<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const pushToast = useCallback((notice: Notice) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, notice }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 9000);

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      (notice.type === "outbid" || notice.type === "lost")
    ) {
      try {
        new Notification(notice.type === "outbid" ? "You've been outbid" : "Lot settled", {
          body: notice.message ?? "",
          tag: `bidlive-${notice.lotId}`,
        });
      } catch {
        /* notification unavailable */
      }
    }
  }, []);

  useNotices(identity?.id ?? null, pushToast);

  // Join the room once per identity so watchers and the audit trail are real.
  useEffect(() => {
    if (!identity || !lotId) return;
    const key = `${lotId}:${identity.id}`;
    if (joined.current === key) return;
    joined.current = key;
    void client
      .action(lotId, { type: "join", userId: identity.id, name: identity.name })
      .catch(() => undefined);
  }, [identity, lotId]);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = streamRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "instant" as ScrollBehavior });
  }, [events.length]);

  const recalled = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.kind === "bid_recalled") set.add(String(e.meta?.bidEventId ?? ""));
    }
    return set;
  }, [events]);

  const participants = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of events) {
      if (e.kind === "bid" && e.userId) map.set(e.userId, e.name ?? "Bidder");
    }
    if (lot) map.delete(lot.sellerId);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [events, lot]);

  const submitBid = useCallback(
    async (amount: number) => {
      if (!identity) return { ok: false, message: "Join the room first" };
      try {
        const res = await client.action(lotId, {
          type: "bid",
          userId: identity.id,
          name: identity.name,
          amount,
        });
        if (res.rejected) {
          return { ok: false, message: res.rejection?.reason ?? "Bid refused" };
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Bid failed" };
      }
    },
    [identity, lotId],
  );

  const onModerate = useCallback(
    async (
      action: "mute" | "unmute" | "extend" | "close_now",
      targetId?: string,
      targetName?: string,
    ) => {
      if (!identity) return;
      try {
        await client.action(lotId, {
          type: "moderate",
          userId: identity.id,
          action,
          targetId,
          targetName,
        });
        void refresh();
      } catch {
        /* surfaced by the room state */
      }
    },
    [identity, lotId, refresh],
  );

  const sendChat = useCallback(async () => {
    const text = chat.trim();
    if (!text || !identity || sendingChat) return;
    setSendingChat(true);
    try {
      await client.action(lotId, {
        type: "chat",
        userId: identity.id,
        name: identity.name,
        text,
      });
      setChat("");
    } catch {
      /* keep the text so nothing is lost */
    } finally {
      setSendingChat(false);
    }
  }, [chat, identity, lotId, sendingChat]);

  const enableAlerts = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setAlertsOn(permission === "granted");
  };

  if (!lot) {
    return (
      <>
        <TopBar identity={identity} onSwitch={() => setGate(true)} />
        <main className="wrap">
          {error ? (
            <div className="empty" style={{ paddingTop: 80 }}>
              {error}
            </div>
          ) : (
            <div className="room" style={{ padding: 24 }}>
              <div className="skeleton" style={{ height: 60, marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 220 }} />
            </div>
          )}
        </main>
      </>
    );
  }

  const live = lot.status === "live";

  return (
    <>
      <TopBar identity={identity} onSwitch={() => setGate(true)} />

      <main className="wrap">
        <div className="room">
          <div className="room-main">
            <div className="room-head">
              <Link href="/" className="btn ghost sm" aria-label="Back to lobby">
                ←
              </Link>
              <div style={{ minWidth: 0 }}>
                <h1>{lot.title}</h1>
                <div className="sub">
                  {lot.subtitle} · {plural(lot.bidCount, "bid")} ·{" "}
                  {plural(lot.watchers, "watcher")}
                </div>
              </div>
              <div className="grow" />
              {bridge.status === "connected" ? (
                <span
                  className="pill"
                  title={`Nexconn Chat SDK connected as ${identity?.id} — ${bridge.received} messages received over the socket`}
                >
                  SDK · {bridge.received}
                </span>
              ) : bridge.status === "connecting" ? (
                <span className="pill">SDK …</span>
              ) : bridge.status === "error" ? (
                <span className="pill warn" title={bridge.error}>
                  SDK offline
                </span>
              ) : null}
              {live ? (
                <span className={`pill ${lot.extensions > 0 ? "gold" : "live"}`}>
                  <i className="dot" /> {online ? "live" : "reconnecting"}
                </span>
              ) : (
                <span className="pill">{lot.status}</span>
              )}
            </div>

            <div
              className="stream"
              ref={streamRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
            >
              {loading ? (
                <>
                  <div className="skeleton" style={{ height: 120, maxWidth: 520 }} />
                  <div className="skeleton" style={{ height: 64, maxWidth: 380 }} />
                  <div className="skeleton" style={{ height: 64, maxWidth: 300 }} />
                </>
              ) : (
                events.map((event: AuctionEvent) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    lot={lot as LotView}
                    meId={identity?.id ?? ""}
                    recalled={recalled}
                  />
                ))
              )}
            </div>

            <div className="composer">
              <input
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void sendChat()}
                placeholder={
                  identity
                    ? `Ask ${lot.sellerName} a question…`
                    : "Join the room to chat and bid"
                }
                disabled={!identity}
                onClick={() => !identity && setGate(true)}
                maxLength={500}
                aria-label="Message the room"
              />
              <button
                className="btn"
                onClick={() => void sendChat()}
                disabled={!identity || !chat.trim() || sendingChat}
              >
                Send
              </button>
            </div>
          </div>

          {identity ? (
            <BidPanel
              lot={lot as LotView}
              identity={identity}
              offset={offset}
              onBid={submitBid}
              onModerate={onModerate}
              participants={participants}
              onRefresh={() => void refresh()}
            />
          ) : (
            <aside className="panel">
              <div className="bidbox">
                <div className="price-label">you&apos;re watching</div>
                <div style={{ fontSize: 13.5, color: "var(--ink-dim)" }}>
                  Take a seat to bid — it takes one name and no password.
                </div>
                <button className="btn gold" onClick={() => setGate(true)}>
                  Join the room
                </button>
              </div>
            </aside>
          )}
        </div>

        <footer className="footer">
          <span>
            {live
              ? `Current ${rupee(lot.currentBid)} · next bid ${rupee(lot.nextMin)}`
              : `Closed at ${rupee(lot.currentBid)}`}
          </span>
          <div className="grow" />
          {"Notification" in (globalThis as object) && identity && !alertsOn ? (
            <button className="btn ghost sm" onClick={() => void enableAlerts()}>
              Enable bid alerts
            </button>
          ) : null}
          <Link href="/" className="btn ghost sm">
            All lots
          </Link>
        </footer>
      </main>

      {gate && !identity ? (
        <IdentityGate
          onPick={(name) => {
            commit(name);
            setGate(false);
          }}
        />
      ) : null}

      {toasts.length > 0 ? (
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <div className="t-kicker">
                {t.notice.type === "outbid"
                  ? "Outbid"
                  : t.notice.type === "lost"
                    ? "Lot settled"
                    : "Notice"}
              </div>
              <div className="t-body">{t.notice.message}</div>
              <button
                className="t-link"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              >
                dismiss
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
