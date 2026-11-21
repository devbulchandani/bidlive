"use client";

import type { AuctionEvent, LotView } from "@/lib/types";
import { colorFor, initials, rupee, timeOf } from "@/lib/format";

const meta = (event: AuctionEvent) => (event.meta ?? {}) as Record<string, unknown>;

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
  const m = meta(event);

  if (event.kind === "lot_created") {
    return (
      <div className="opening">
        <div className="label" style={{ marginBottom: 8 }}>
          Lot opens · {timeOf(event.at)}
        </div>
        <h3>{String(m.title ?? lot.title)}</h3>
        <p>{String(m.description ?? lot.description)}</p>
        <div className="chips">
          <span className="chip">Starts {rupee(Number(m.basePrice ?? lot.basePrice))}</span>
          <span className="chip">+{rupee(Number(m.increment ?? lot.increment))}</span>
          <span className="chip">
            {m.reserve ? `Reserve ${rupee(Number(m.reserve))}` : "No reserve"}
          </span>
        </div>
      </div>
    );
  }

  if (event.kind === "bid") {
    const isLeading = lot.status === "live" && lot.top?.seq === event.seq;
    const isWon = lot.winner?.seq === event.seq;
    const isRecalled = recalled.has(event.id);
    const mine = event.userId === meId;

    return (
      <div className="msg">
        <span className="avatar" style={{ background: colorFor(event.userId ?? "x") }}>
          {initials(event.name ?? "?")}
        </span>
        <div className="msg-body">
          <div className="msg-name">
            <b>{event.name ?? "Bidder"}</b>
            {mine ? <span style={{ color: "var(--rust)" }}>you</span> : null}
            <span className="mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>
              {timeOf(event.at)}
            </span>
          </div>

          <div className={`bidcard ${isLeading || isWon ? "leading" : "outbid"}`}>
            <div>
              <div className="label">{isRecalled ? "Withdrawn" : "Bid"}</div>
              <div className="amount">{rupee(event.amount ?? 0)}</div>
            </div>
            <div
              style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}
            >
              {isWon ? <span className="badge badge-won">won</span> : null}
              {isLeading ? <span className="badge badge-leading">leading</span> : null}
              {!isWon && !isLeading && !isRecalled ? (
                <span className="badge badge-outbid">outbid</span>
              ) : null}
              {isRecalled ? <span className="badge badge-outbid">recalled</span> : null}
              <span className="badge badge-seq">#{event.seq}</span>
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
        recalculated from the record
      </SysLine>
    );
  }

  if (event.kind === "lot_extended") {
    const reason = String(m.reason ?? "");
    const endsAt = Number(m.newEndsAt ?? m.endsAt ?? event.amount ?? lot.endsAt);
    return (
      <SysLine icon={reason === "auctioneer_closing" ? "◷" : "↗"} alert>
        {reason === "auctioneer_closing" ? (
          <>
            The auctioneer is closing this lot at <b>{timeOf(endsAt)}</b>
          </>
        ) : reason === "auctioneer_extension" ? (
          <>
            The auctioneer added time — closes at <b>{timeOf(endsAt)}</b>
          </>
        ) : (
          <>
            Bid in the final 30 seconds — <b>the clock extends</b>, closing at{" "}
            <b>{timeOf(endsAt)}</b>
          </>
        )}
      </SysLine>
    );
  }

  if (event.kind === "lot_settled") {
    if (Boolean(m.unsold)) {
      return (
        <div className="settle unsold">
          <div className="stamp">Passed in</div>
          <h3>Unsold</h3>
          <p>
            {m.reason === "reserve_not_met"
              ? `The highest bid did not reach the reserve of ${rupee(Number(m.reserve ?? 0))}.`
              : "No bids came in before the clock ran out."}
          </p>
        </div>
      );
    }
    return (
      <div className="settle">
        <div className="stamp">Sold · hammer down</div>
        <h3>{event.name ?? "Winner"}</h3>
        <div className="final">{rupee(event.amount ?? 0)}</div>
        <p>
          {String(m.bidCount ?? lot.bidCount)} bids · {String(m.extensions ?? 0)} clock extensions ·
          settled {timeOf(event.at)}
        </p>
      </div>
    );
  }

  if (event.kind === "mod") {
    return (
      <SysLine icon="⊘" alert>
        <b>{event.name ?? "A bidder"}</b>{" "}
        {String(m.action) === "mute"
          ? "was muted by the auctioneer — their bids are now refused"
          : "was unmuted"}
      </SysLine>
    );
  }

  if (event.kind === "join") {
    return (
      <SysLine icon="+">
        <b>{event.name ?? "Someone"}</b> entered the room
      </SysLine>
    );
  }

  if (event.kind === "chat") {
    const mine = event.userId === meId;
    return (
      <div className="msg">
        <span className="avatar" style={{ background: colorFor(event.userId ?? "x") }}>
          {initials(event.name ?? "?")}
        </span>
        <div className="msg-body">
          <div className="msg-name">
            <b>{event.name ?? "Guest"}</b>
            {mine ? <span style={{ color: "var(--rust)" }}>you</span> : null}
            <span className="mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>
              {timeOf(event.at)}
            </span>
          </div>
          <div className={`bubble ${mine ? "mine" : ""}`}>{event.text ?? ""}</div>
        </div>
      </div>
    );
  }

  return null;
}
