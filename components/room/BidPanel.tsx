"use client";

import { useMemo, useState } from "react";
import type { LotView } from "@/lib/types";
import type { Identity } from "@/lib/client/identity";
import { parseBidInput } from "@/lib/auction";
import { initials, plural, rupee, timeOf } from "@/lib/format";
import { Countdown } from "@/components/Countdown";

export function BidPanel({
  lot,
  identity,
  offset,
  onBid,
  onModerate,
  participants,
  onRefresh,
}: {
  lot: LotView;
  identity: Identity;
  offset: number;
  onBid: (amount: number) => Promise<{ ok: boolean; message?: string }>;
  onModerate: (
    action: "mute" | "unmute" | "extend" | "close_now",
    targetId?: string,
    targetName?: string,
  ) => Promise<void>;
  participants: { id: string; name: string }[];
  onRefresh: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const live = lot.status === "live";
  const isSeller = identity.id === lot.sellerId;
  const isMuted = lot.muted.includes(identity.id);
  const isLeading = lot.top?.userId === identity.id;
  const min = lot.nextMin;

  const parsed = useMemo(() => parseBidInput(raw, lot), [raw, lot]);

  const tooLow = parsed !== null && parsed < min;
  const valid = parsed !== null && parsed >= min;

  const flash = (message: string) => {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 340);
  };

  const submit = async (amount: number) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await onBid(amount);
      if (res.ok) setRaw("");
      else flash(res.message ?? "Bid refused");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="panel">
      <div className="panel-hero">
        <div className="panel-thumb">
          <span aria-hidden>{lot.emoji}</span>
        </div>
        <div className="panel-hero-body">
          <div className="lot-title" style={{ fontSize: 17 }}>
            {lot.title}
          </div>
          <div className="lot-sub" style={{ marginTop: 2 }}>
            Listed by {lot.sellerName}
          </div>
          <p className="panel-desc" style={{ marginTop: 10, marginBottom: 0 }}>
            {lot.description}
          </p>
        </div>
      </div>

      <div className="stat-block">
        <div>
          <div className="price-label">{lot.bidCount ? "current bid" : "starting price"}</div>
          <div className="serif num" style={{ fontSize: 34, lineHeight: 1, color: "var(--gold-soft)" }}>
            {rupee(lot.currentBid)}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            {lot.bidCount
              ? live
                ? `${plural(lot.bidCount, "bid")} · next ${rupee(min)}`
                : `${plural(lot.bidCount, "bid")} · final`
              : live
                ? `No bids yet · start at ${rupee(min)}`
                : "No bids placed"}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="clock-label">{live ? "closes in" : "status"}</div>
          {live ? (
            <div className="clock">
              <Countdown endsAt={lot.endsAt} offset={offset} onExpire={onRefresh} />
            </div>
          ) : (
            <div className="clock" style={{ fontSize: 22 }}>
              {lot.status === "closed" ? "sold" : "unsold"}
            </div>
          )}
          <div className="hint" style={{ justifyContent: "flex-end", marginTop: 4 }}>
            {timeOf(lot.endsAt)}
            {lot.extensions > 0 ? ` · +${lot.extensions} ext` : ""}
          </div>
        </div>
      </div>

      <div className="divider" />

      {!live ? (
        <div className="bidbox" style={{ alignItems: "flex-start", gap: 6 }}>
          <div className="price-label">hammer down</div>
          <div style={{ fontSize: 14, color: "var(--ink-dim)" }}>
            {lot.status === "closed" && lot.winner
              ? `Won by ${lot.winner.name} at ${rupee(lot.winner.amount)}.`
              : "This lot closed without a sale."}
          </div>
        </div>
      ) : isSeller ? (
        <div className="bidbox" style={{ gap: 12 }}>
          <div>
            <div className="price-label">you are the auctioneer</div>
            <div style={{ fontSize: 13.5, color: "var(--ink-dim)" }}>
              You can&apos;t bid on your own lot, but you can steer the room.
            </div>
          </div>
          <div className="quick-row">
            <button className="btn sm" onClick={() => void onModerate("extend")}>
              +60s
            </button>
            <button className="btn sm" onClick={() => void onModerate("close_now")}>
              Close in 30s
            </button>
          </div>

          {participants.length > 0 ? (
            <div className="muted-list">
              <div className="price-label" style={{ marginTop: 4 }}>
                bidders in this lot
              </div>
              {participants.map((p) => {
                const muted = lot.muted.includes(p.id);
                return (
                  <div key={p.id} className="meta-row" style={{ alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span
                        className="avatar"
                        style={{ background: "var(--surf-3)", color: "var(--ink-dim)", width: 20, height: 20, fontSize: 9 }}
                      >
                        {initials(p.name)}
                      </span>
                      {p.name}
                      {muted ? <span className="badge outbid">muted</span> : null}
                    </span>
                    <button
                      className={`btn sm ${muted ? "ghost" : "danger"}`}
                      onClick={() =>
                        void onModerate(muted ? "unmute" : "mute", p.id, p.name)
                      }
                    >
                      {muted ? "unmute" : "mute"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hint">No bidders yet.</div>
          )}
        </div>
      ) : isMuted ? (
        <div className="bidbox">
          <div className="price-label">muted</div>
          <div style={{ fontSize: 13.5, color: "var(--red)" }}>
            The auctioneer has muted you for this lot. Your bids will be refused.
          </div>
        </div>
      ) : isLeading ? (
        <div className="bidbox">
          <div className="price-label">you&apos;re leading</div>
          <div style={{ fontSize: 13.5, color: "var(--gold-soft)" }}>
            You hold the top bid at {rupee(lot.top?.amount ?? 0)}. The room has to beat{" "}
            {rupee(min)} — you can&apos;t bid against yourself.
          </div>
          <div className="hint">Stay in the room: if someone outbids you, you&apos;ll be told.</div>
        </div>
      ) : (
        <BidForm
          raw={raw}
          setRaw={setRaw}
          min={min}
          parsed={parsed}
          tooLow={tooLow}
          valid={valid}
          busy={busy}
          shake={shake}
          error={error}
          submit={submit}
          lot={lot}
        />
      )}

      <div className="note">
        Bids inside the final 30 seconds extend the clock by 30s (max five times). Every bid is
        recorded as a message in this room&apos;s Nexconn channel — the transcript is the ledger.
      </div>
    </aside>
  );
}

function BidForm({
  raw,
  setRaw,
  min,
  parsed,
  tooLow,
  valid,
  busy,
  shake,
  error,
  submit,
  lot,
  label = "Place bid",
}: {
  raw: string;
  setRaw: (v: string) => void;
  min: number;
  parsed: number | null;
  tooLow: boolean;
  valid: boolean;
  busy: boolean;
  shake: boolean;
  error: string | null;
  submit: (amount: number) => Promise<void>;
  lot: LotView;
  label?: string;
}) {
  return (
    <div className="bidbox">
      <div className="input-row" style={{ position: "relative" }}>
        <span className="rupee">₹</span>
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/[^\d+k]/gi, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) void submit(parsed ?? min);
          }}
          placeholder={`Enter ${min.toLocaleString("en-IN")} or more`}
          inputMode="numeric"
          aria-label="Bid amount"
          className={shake ? "shake" : ""}
        />
        <span className="badge seq" style={{ marginRight: 2 }}>
          min {min.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="quick-row">
        <button className="btn sm ghost" onClick={() => setRaw(String(min))}>
          {rupee(min)}
        </button>
        <button className="btn sm ghost" onClick={() => setRaw(String(min + lot.increment))}>
          {rupee(min + lot.increment)}
        </button>
        <button className="btn sm ghost" onClick={() => setRaw(String(min + lot.increment * 4))}>
          {rupee(min + lot.increment * 4)}
        </button>
      </div>

      <button
        className="btn gold"
        disabled={!valid || busy}
        onClick={() => valid && void submit(parsed ?? min)}
      >
        {busy ? "Sending…" : valid && parsed !== null ? `${label} ${rupee(parsed)}` : label}
      </button>

      {error ? (
        <div className="hint err">⚠ {error}</div>
      ) : tooLow ? (
        <div className="hint err">Minimum is {rupee(min)}</div>
      ) : (
        <div className="hint">
          Typing a number here is the bid — no separate form, no second tab.
        </div>
      )}
    </div>
  );
}
