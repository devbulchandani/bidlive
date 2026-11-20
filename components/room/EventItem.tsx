"use client";

import type { AuctionEvent, LotView } from "@/lib/types";
import { colorFor, initials, rupee, timeOf } from "@/lib/format";

function m(event: AuctionEvent) {
  return (event.meta ?? {}) as Record<string, unknown>;
}

function SysLine({
  icon,
  children,
  alert = false,
}: {
  icon: string;
  children: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={`sysline ${alert ? "alert" : ""}`}>
      <span className="ico">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

export function EventItem({
  event,
  lot,
  meId,
  recalled,
}: {
  event: AuctionEvent;
  lot: LotView;
  meId: string;
  recalled: Set<string>;
}) {
  const meta = m(event);

  if (event.kind === "lot_created") {
    return (
      <div className="opening">
        <div className="eyebrow">Lot opens</div>
        <h3 className="serif">{String(meta.title ?? lot.title)}</h3>
        <p>{String(meta.description ?? lot.description)}</p>
        <div className="rule-chips">
          <span className="chip">Starts {rupee(Number(meta.basePrice ?? lot.basePrice))}</span>
          <span className="chip">
            +{rupee(Number(meta.increment ?? lot.increment))} increments
          </span>
          <span className="chip">
            {meta.reserve ? `Reserve ${rupee(Number(meta.reserve))}` : "No reserve"}
          </span>
          <span className="chip">Opened {timeOf(event.at)}</span>
        </div>
      </div>
    );
  }

  if (event.kind === "bid") {
    const isLeading = lot.status === "live" && lot.top?.seq === event.seq;
    const isWon = lot.winner?.seq === event.seq;
    const isRecalled = recalled.has(event.id);
    const state = isWon ? "won" : isRecalled ? "outbid" : isLeading ? "leading" : "outbid";
    const color = colorFor(event.userId ?? "x");

    return (
      <div className="msg">
        <span className="avatar" style={{ background: color }}>
          {initials(event.name ?? "?")}
        </span>
        <div className="msg-body">
          <div className="msg-name">
            <b>{event.name ?? "Bidder"}</b>
            {event.userId === meId ? <span className="pill sm">you</span> : null}
            <span style={{ color: "var(--ink-mute)", fontSize: 11 }}>{timeOf(event.at)}</span>
          </div>
          <div className={`bidcard ${isLeading || isWon ? "leading" : "outbid"}`}>
            <div>
              <div className="price-label">{isRecalled ? "withdrawn" : "bid"}</div>
              <div className="amount num">{rupee(event.amount ?? 0)}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              {state === "won" ? <span className="badge won">won</span> : null}
              {state === "leading" ? <span className="badge leading">leading</span> : null}
              {state === "outbid" && !isRecalled ? <span className="badge outbid">outbid</span> : null}
              {isRecalled ? <span className="badge outbid">recalled</span> : null}
              <span className="badge seq">#{event.seq}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (event.kind === "bid_recalled") {
    return (
      <SysLine icon="↺">
        <b>{event.name ?? "Bidder"}</b> withdrew a bid of {rupee(event.amount ?? 0)} — the lead
        recalculated automatically
      </SysLine>
    );
  }

  if (event.kind === "lot_extended") {
    const reason = String(meta.reason ?? "");
    const endsAt = Number(meta.newEndsAt ?? meta.endsAt ?? event.amount ?? lot.endsAt);
    const closing = reason === "auctioneer_closing";
    return (
      <SysLine icon={closing ? "⏳" : "⏱"} alert>
        {closing ? (
          <>
            The auctioneer is closing this lot — <b>{timeOf(endsAt)}</b>
          </>
        ) : reason === "auctioneer_extension" ? (
          <>
            Auctioneer added time — the lot now closes at <b>{timeOf(endsAt)}</b>
          </>
        ) : (
          <>
            Bid in the final 30 seconds — <b>the clock extends</b>, lot now closes at{" "}
            <b>{timeOf(endsAt)}</b>
          </>
        )}
      </SysLine>
    );
  }

  if (event.kind === "lot_settled") {
    const unsold = Boolean(meta.unsold);
    if (unsold) {
      return (
        <div className="settle unsold">
          <div className="stamp">Passed in</div>
          <h3 className="serif">Unsold</h3>
          <p style={{ color: "var(--ink-dim)", margin: 0, fontSize: 13.5 }}>
            {meta.reason === "reserve_not_met"
              ? `The highest bid didn't reach the reserve of ${rupee(Number(meta.reserve ?? 0))}.`
              : "No bids came in before the clock ran out."}
          </p>
        </div>
      );
    }
    return (
      <div className="settle">
        <div className="stamp">Sold</div>
        <h3 className="serif">{event.name ?? "Winner"}</h3>
        <div className="final num">{rupee(event.amount ?? 0)}</div>
        <p style={{ color: "var(--ink-mute)", margin: 0, fontSize: 12.5 }}>
          {String(meta.bidCount ?? lot.bidCount)} bids · {String(meta.extensions ?? 0)} clock
          extensions · settled {timeOf(event.at)}
        </p>
      </div>
    );
  }

  if (event.kind === "mod") {
    const action = String(meta.action ?? "");
    return (
      <SysLine icon="⚑" alert>
        <b>{event.name ?? "A bidder"}</b>{" "}
        {action === "mute"
          ? "was muted by the auctioneer — their bids will be refused"
          : "was unmuted"}
      </SysLine>
    );
  }

  if (event.kind === "join") {
    return (
      <SysLine icon="＋">
        <b>{event.name ?? "Someone"}</b> joined the room
      </SysLine>
    );
  }

  if (event.kind === "chat") {
    const color = colorFor(event.userId ?? "x");
    return (
      <div className="msg">
        <span className="avatar" style={{ background: color }}>
          {initials(event.name ?? "?")}
        </span>
        <div className="msg-body">
          <div className="msg-name">
            <b>{event.name ?? "Guest"}</b>
            {event.userId === meId ? <span className="pill sm">you</span> : null}
            <span style={{ color: "var(--ink-mute)", fontSize: 11 }}>{timeOf(event.at)}</span>
          </div>
          <div className={`bubble ${event.userId === meId ? "mine" : ""}`}>
            {event.text ?? ""}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
