"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { client } from "@/lib/client/api";
import { useLotFeed } from "@/lib/client/hooks";
import { useIdentity } from "@/lib/client/identity-context";
import { useNexconnBridge } from "@/lib/client/nexconn";
import { readChannelHistory } from "@/lib/client/nexconn-history";
import { parseBidInput } from "@/lib/auction";
import type { LotView } from "@/lib/types";
import { initials, plural, rupee } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { EventItem } from "./EventItem";

export function RoomPane({ lotId }: { lotId: string }) {
  const { identity, ensureIdentity } = useIdentity();
  const { lot, events, online, offset, error, loading, needsReplay, refresh } = useLotFeed(lotId);
  const bridge = useNexconnBridge(identity, lot?.channelId);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);
  const [alertsOn, setAlertsOn] = useState(false);
  const [details, setDetails] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const restored = useRef(false);

  const joined = useRef<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    if (!identity || !lotId) return;
    const key = `${lotId}:${identity.id}`;
    if (joined.current === key) return;
    joined.current = key;
    void client
      .action(lotId, { type: "join", userId: identity.id, name: identity.name })
      .then(() => window.dispatchEvent(new Event("bidlive:refresh-lots")))
      .catch(() => undefined);
  }, [identity, lotId]);

  useEffect(() => {
    if (!needsReplay || !lot || !identity || bridge.status !== "connected") return;
    if (restored.current) return;
    restored.current = true;

    let cancelled = false;
    setRestoring(true);

    void (async () => {
      try {
        // the join may still be in flight when the socket comes up, so give the
        // channel a second chance before concluding the transcript is empty
        let messages = await readChannelHistory(lot.channelId);
        if (!cancelled && messages.length === 0) {
          await new Promise((r) => setTimeout(r, 1400));
          if (!cancelled) messages = await readChannelHistory(lot.channelId);
        }
        if (cancelled || messages.length === 0) return;
        await client.rehydrate(lotId, messages);
        if (!cancelled) await refresh();
      } catch {
        /* an empty projection is not fatal — the room just starts clean */
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsReplay, lot, identity, bridge.status, lotId, refresh]);

  useEffect(() => {
    if (!stick.current) return;
    const el = streamRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "instant" as ScrollBehavior });
  }, [events.length]);

  const recalled = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) if (e.kind === "bid_recalled") set.add(String(e.meta?.bidEventId ?? ""));
    return set;
  }, [events]);

  const participants = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of events) if (e.kind === "bid" && e.userId) map.set(e.userId, e.name ?? "Bidder");
    if (lot) map.delete(lot.sellerId);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [events, lot]);

  const flash = (message: string) => {
    setFail(message);
    setNudge(true);
    setTimeout(() => setNudge(false), 340);
  };

  const submitBid = useCallback(
    async (amount: number) => {
      if (!identity) {
        ensureIdentity();
        return false;
      }
      setBusy(true);
      setFail(null);
      try {
        const res = await client.action(lotId, {
          type: "bid",
          userId: identity.id,
          name: identity.name,
          amount,
        });
        if (res.rejected) {
          flash(res.rejection?.reason ?? "Bid refused");
          return false;
        }
        setText("");
        window.dispatchEvent(new Event("bidlive:refresh-lots"));
        window.dispatchEvent(new Event("bidlive:bid-placed"));
        return true;
      } catch (err) {
        flash(err instanceof Error ? err.message : "Bid failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identity, lotId],
  );

  const moderate = useCallback(
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
        /* room state will show the truth */
      }
    },
    [identity, lotId, refresh],
  );

  if (!lot) {
    return (
      <>
        <Bar title="Loading lot…" />
        <div className="stream">
          {error ? (
            <div className="empty">{error}</div>
          ) : (
            <>
              <div className="skeleton" style={{ height: 120, maxWidth: 520 }} />
              <div className="skeleton" style={{ height: 64, maxWidth: 380 }} />
            </>
          )}
        </div>
      </>
    );
  }

  const live = lot.status === "live";
  const isSeller = identity?.id === lot.sellerId;
  const isMuted = Boolean(identity && lot.muted.includes(identity.id));
  const isLeading = Boolean(identity && lot.top?.userId === identity.id);
  const min = lot.nextMin;
  const amount = parseBidInput(text, lot);
  const numberish = amount !== null;
  const validBid = numberish && amount >= min;

  const send = async () => {
    if (!identity) {
      ensureIdentity();
      return;
    }
    const value = text.trim();
    if (!value || busy) return;

    if (validBid) {
      await submitBid(amount);
      return;
    }
    if (numberish && amount < min) {
      flash(`Minimum is ${rupee(min)}`);
      return;
    }

    setBusy(true);
    setFail(null);
    try {
      await client.action(lotId, {
        type: "chat",
        userId: identity.id,
        name: identity.name,
        text: value,
      });
      setText("");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Message failed");
    } finally {
      setBusy(false);
    }
  };

  const enableAlerts = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setAlertsOn(p === "granted");
  };

  return (
    <>
      {/* ------------------------------------------------------------ header */}
      <div className="pane-bar">
        <div className="lot-head" style={{ minWidth: 0 }}>
          <h1>{lot.title}</h1>
          <div className="sub">
            {lot.sellerName} · {plural(lot.bidCount, "bid")} · {plural(lot.watchers, "watcher")}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div className="lot-head-price">
          <div>
            <div className="label">{lot.bidCount ? "Current bid" : "Starting at"}</div>
            <div className="price">{rupee(lot.currentBid)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label">{live ? "Closes in" : "Status"}</div>
            {live ? (
              <Countdown endsAt={lot.endsAt} offset={offset} className="clock" onExpire={refresh} />
            ) : (
              <span className="clock" style={{ fontSize: 24 }}>
                {lot.status}
              </span>
            )}
          </div>
        </div>

        <div className="pane-pills">
          <span
            className={`chip ${live ? "chip-rust" : ""}`}
            title={online ? "Live over SSE" : "Reconnecting"}
          >
            <i className={`dot ${live && online ? "pulse" : ""}`} />
            {live ? (online ? "live" : "…") : "closed"}
          </span>
          {restoring ? <span className="chip chip-accent">restoring…</span> : null}
          {bridge.status === "connected" ? (
            <span className="chip" title={`Nexconn socket · ${bridge.received} messages received`}>
              SDK {bridge.received}
            </span>
          ) : bridge.status === "connecting" ? (
            <span className="chip">SDK …</span>
          ) : null}
        </div>

        <button
          className="icon-btn sheet-close"
          onClick={() => setDetails(true)}
          aria-label="Lot details"
          title="Lot details"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path
              d="M7 1.2v11.6M1.2 7h11.6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* -------------------------------------------------------------- body */}
      <div className="room">
        <div className="room-main">
          <div
            className="stream"
            ref={streamRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            {loading ? (
              <>
                <div className="skeleton" style={{ height: 120, maxWidth: 520 }} />
                <div className="skeleton" style={{ height: 64, maxWidth: 380 }} />
              </>
            ) : events.length === 0 ? (
              <div className="empty">No messages yet. Ask the seller something.</div>
            ) : (
              events.map((event) => (
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

          {/* ---------------------------------------------------- composer */}
          <div className="composer">
            <div className="composer-row">
              <input
                className={`input ${nudge ? "bad" : ""}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void send()}
                placeholder={
                  live
                    ? `Message ${lot.sellerName}, or type ${min.toLocaleString("en-IN")} to bid`
                    : "This lot has closed"
                }
                disabled={!live}
                maxLength={500}
                aria-label="Message or bid amount"
              />
              <button
                className={`btn ${validBid ? "btn-rust" : "btn-primary"} btn-sm`}
                style={{ padding: "12px 20px", flex: "none" }}
                onClick={() => void send()}
                disabled={busy || !text.trim() || !live}
              >
                {busy ? "…" : validBid ? `Bid ${rupee(amount)}` : "Send"}
              </button>
            </div>

            {live ? (
              <div className="bid-strip">
                <span className="label">Bid</span>
                <button
                  className={`bid-chip ${isLeading ? "bid-chip-mine" : "bid-chip-primary"}`}
                  onClick={() => void submitBid(min)}
                  disabled={busy || isSeller || isMuted}
                  title={isSeller ? "You are the auctioneer" : undefined}
                >
                  {rupee(min)}
                </button>
                <button
                  className="bid-chip"
                  onClick={() => void submitBid(min + lot.increment)}
                  disabled={busy || isSeller || isMuted}
                >
                  {rupee(min + lot.increment)}
                </button>
                <button
                  className="bid-chip"
                  onClick={() => void submitBid(min + lot.increment * 4)}
                  disabled={busy || isSeller || isMuted}
                >
                  {rupee(min + lot.increment * 4)}
                </button>
                <span className="hint" style={{ marginLeft: "auto" }}>
                  {isSeller
                    ? "You are the auctioneer"
                    : isMuted
                      ? "Muted for this lot"
                      : isLeading
                        ? "You hold the top bid"
                        : `${lot.increment} increment`}
                </span>
              </div>
            ) : null}

            <div className={`hint ${fail ? "err" : ""}`} aria-live="polite">
              {fail ? `⚠ ${fail}` : numberish && !validBid ? `Minimum is ${rupee(min)}` : ""}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- side rail */}
        {details ? <div className="scrim" onClick={() => setDetails(false)} /> : null}
        <aside className={`rail-panel ${details ? "sheet" : ""}`}>
          <div
            className="sheet-close"
            style={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <span className="label">Lot details</span>
            <button className="icon-btn" onClick={() => setDetails(false)} aria-label="Close details">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path
                  d="M1 1l10 10M11 1L1 11"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="hero-thumb">
            <img src={lot.image} alt="" />
          </div>

          <p className="desc">{lot.description}</p>

          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              Lot facts
            </div>
            <div className="kv">
              <span>Opened at</span>
              <b>{rupee(lot.basePrice)}</b>
            </div>
            <div className="kv">
              <span>Increment</span>
              <b>{rupee(lot.increment)}</b>
            </div>
            <div className="kv">
              <span>Reserve</span>
              <b>{lot.reserve ? rupee(lot.reserve) : "none"}</b>
            </div>
            <div className="kv">
              <span>Extensions</span>
              <b>{lot.extensions} / 5</b>
            </div>
            <div className="kv">
              <span>Channel</span>
              <b>{lot.channelId}</b>
            </div>
          </div>

          {isSeller && live ? (
            <div className="rail-section">
              <div className="label">Auctioneer</div>
              <div className="chips">
                <button className="mod-btn" onClick={() => void moderate("extend")}>
                  +60s
                </button>
                <button className="mod-btn" onClick={() => void moderate("close_now")}>
                  Close in 30s
                </button>
              </div>

              {participants.length ? (
                <div style={{ marginTop: 6 }}>
                  {participants.map((p) => {
                    const muted = lot.muted.includes(p.id);
                    return (
                      <div key={p.id} className="mod-row" style={{ padding: "6px 0" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            className="avatar"
                            style={{
                              background: "var(--paper-deep)",
                              color: "var(--ink-2)",
                              width: 22,
                              height: 22,
                              fontSize: 9,
                            }}
                          >
                            {initials(p.name)}
                          </span>
                          {p.name}
                          {muted ? <span className="badge badge-outbid">muted</span> : null}
                        </span>
                        <button
                          className={`mod-btn ${muted ? "" : "danger"}`}
                          onClick={() => void moderate(muted ? "unmute" : "mute", p.id, p.name)}
                        >
                          {muted ? "unmute" : "mute"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="hint">No bidders yet.</p>
              )}
            </div>
          ) : null}

          <div className="rail-section">
            <div className="label">Rules</div>
            <p className="hint" style={{ display: "block", lineHeight: 1.55 }}>
              A bid in the last 30 seconds extends the clock by 30, up to five times. Every bid is a
              message in this lot&apos;s Nexconn channel — the transcript is the ledger.
            </p>
          </div>

          <div className="chips" style={{ paddingTop: 4 }}>
            {"Notification" in (globalThis as object) && identity && !alertsOn ? (
              <button className="mod-btn" onClick={() => void enableAlerts()}>
                Enable alerts
              </button>
            ) : null}
            <Link href="/app" className="mod-btn">
              All lots
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

function Bar({ title }: { title: string }) {
  return (
    <div className="pane-bar">
      <h1>{title}</h1>
    </div>
  );
}
