"use client";

import { useCallback, useEffect, useState } from "react";
import { client } from "@/lib/client/api";
import { useIdentityState } from "@/lib/client/identity";
import type { Identity } from "@/lib/client/identity";
import type { LotSummary } from "@/lib/types";
import { rupee } from "@/lib/format";
import { IdentityGate } from "@/components/IdentityGate";
import { LotCard } from "@/components/LotCard";
import { TopBar } from "@/components/TopBar";

export default function LobbyPage() {
  const { identity, ready, commit } = useIdentityState();
  const [lots, setLots] = useState<LotSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await client.lots();
      setLots(res.lots);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the room");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  const live = lots.filter((l) => l.status === "live");
  const totalBids = lots.reduce((n, l) => n + l.bidCount, 0);
  const cheapest = live.length ? Math.min(...live.map((l) => l.currentBid)) : 0;

  const pick = (name: string) => {
    const next: Identity = commit(name);
    setGate(false);
    void next;
  };

  return (
    <>
      <TopBar identity={identity} onSwitch={() => setGate(true)} />

      <main className="wrap">
        <section className="hero">
          <div>
            <div className="kicker">
              <i className="dot" style={{ color: "var(--gold)" }} />
              Live auction · chat-native
            </div>
            <h1 className="display">
              The auction is <em>the chat.</em>
            </h1>
            <p className="lede">
              No bid button in a sidebar, no separate bidding form. You raise by typing the
              number, the clock is enforced on the server, and every bid stays in the room
              forever — so a dispute has a transcript, not a he-said-she-said.
            </p>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <b className="num">{live.length}</b>
              <span>lots live</span>
            </div>
            <div className="hero-stat">
              <b className="num">{totalBids}</b>
              <span>bids placed</span>
            </div>
            <div className="hero-stat">
              <b className="num">{live.length ? rupee(cheapest) : "—"}</b>
              <span>entry price</span>
            </div>
          </div>
        </section>

        <div className="section-head">
          <h2 className="serif">On the block</h2>
          <div className="rule" />
          <span className="pill">{lots.length} lots</span>
        </div>

        {error ? (
          <div className="empty">Couldn&apos;t reach the auction server — {error}</div>
        ) : lots.length === 0 ? (
          <div className="lot-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 300 }} />
            ))}
          </div>
        ) : (
          <div className="lot-grid">
            {lots.map((lot, i) => (
              <LotCard key={lot.id} lot={lot} index={i} />
            ))}
          </div>
        )}

        <div className="section-head">
          <h2 className="serif">How the room works</h2>
          <div className="rule" />
        </div>

        <div className="lot-grid" style={{ paddingBottom: 24 }}>
          {[
            {
              t: "Type a number to bid",
              d: "The composer is dual-purpose. Enter text and you're chatting; enter a number at or above the minimum and the send button becomes the bid.",
            },
            {
              t: "The server holds the clock",
              d: "Every bid is validated against the lot's state, not the client's. Two bids in the same millisecond are ordered by a monotonic sequence, so nobody wins by lag.",
            },
            {
              t: "Bids in the last 30s extend the lot",
              d: "Anti-snipe: a bid inside the final 30 seconds pushes the clock out by 30 — visibly, as a message in the room, capped at five extensions.",
            },
            {
              t: "The transcript is the ledger",
              d: "Each raise is a durable message in a Nexconn group channel: ordered, offline-safe, and readable months later when someone disputes a price.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="lot-card"
              style={{ padding: 18, cursor: "default", minHeight: 150 }}
            >
              <div className="lot-title" style={{ fontSize: 16, marginBottom: 6 }}>
                {c.t}
              </div>
              <div className="lot-sub" style={{ lineHeight: 1.55 }}>
                {c.d}
              </div>
            </div>
          ))}
        </div>

        <footer className="footer">
          <span>BidLive — Nexconn Build Challenge 2026</span>
          <span>·</span>
          <span>Chat SDK · custom messages · server-side clock</span>
          <div className="grow" />
          <button
            className="btn ghost sm"
            onClick={async () => {
              await client.reset();
              await load();
            }}
            title="Re-arm the demo lots"
          >
            Reset demo
          </button>
        </footer>
      </main>

      {gate && !identity ? (
        <IdentityGate onPick={pick} />
      ) : null}
    </>
  );
}
