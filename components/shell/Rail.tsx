"use client";

import Link from "next/link";
import type { LotSummary } from "@/lib/types";
import type { Identity } from "@/lib/client/identity";
import { initials, rupee } from "@/lib/format";
import { Countdown } from "@/components/Countdown";

function RailRow({
  lot,
  active,
  onClick,
  index,
}: {
  lot: LotSummary;
  active: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <Link
      href={`/app/${lot.id}`}
      onClick={onClick}
      className={`rail-item ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="rail-emoji" aria-hidden>
        {lot.emoji}
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="rail-title">{lot.title}</span>
        <span className="rail-sub">
          {lot.status === "live" ? (
            <>
              <i className="dot" style={{ color: "var(--rust)" }} />
              {rupee(lot.currentBid)}
              <span style={{ color: "var(--faint)" }}>·</span>
              <span>{lot.bidCount}</span>
            </>
          ) : (
            <>
              <i className="dot" style={{ color: "var(--faint)" }} />
              {lot.status}
            </>
          )}
        </span>
      </span>
      <span className="rail-clock">
        {lot.status === "live" ? <Countdown endsAt={lot.endsAt} /> : `0${index + 1}`}
      </span>
    </Link>
  );
}

export function Rail({
  lots,
  activeId,
  identity,
  nexconn,
  onWho,
  onNavigate,
  onClose,
  open,
}: {
  lots: LotSummary[];
  activeId?: string;
  identity: Identity | null;
  nexconn: boolean | null;
  onWho: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
  open: boolean;
}) {
  const yours = lots.filter((l) => l.watching);
  const openLots = lots.filter((l) => !l.watching && l.status === "live");
  const past = lots.filter((l) => !l.watching && l.status !== "live");

  return (
    <aside className={`rail ${open ? "open" : ""}`} aria-label="Auctions">
      <div className="rail-head">
        <Link href="/" className="wordmark" style={{ fontSize: 20 }}>
          BidLive<span>.</span>
        </Link>
        {onClose ? (
          <button className="icon-btn mobile-only" onClick={onClose} aria-label="Close menu">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path
                d="M1 1l10 10M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="rail-scroll">
        <div className="rail-label">Your rooms</div>
        {yours.length ? (
          yours.map((lot, i) => (
            <RailRow
              key={lot.id}
              lot={lot}
              index={i}
              active={lot.id === activeId}
              onClick={() => onNavigate?.()}
            />
          ))
        ) : (
          <p
            className="hint"
            style={{ padding: "2px 10px 10px", display: "block", lineHeight: 1.5 }}
          >
            {identity
              ? "Open a lot below — rooms you enter show up here."
              : "Take a seat, then enter a lot."}
          </p>
        )}

        {openLots.length ? (
          <>
            <div className="rail-label">Open now</div>
            {openLots.map((lot, i) => (
              <RailRow
                key={lot.id}
                lot={lot}
                index={i}
                active={lot.id === activeId}
                onClick={() => onNavigate?.()}
              />
            ))}
          </>
        ) : null}

        {past.length ? (
          <>
            <div className="rail-label">Closed</div>
            {past.map((lot, i) => (
              <RailRow
                key={lot.id}
                lot={lot}
                index={i}
                active={lot.id === activeId}
                onClick={() => onNavigate?.()}
              />
            ))}
          </>
        ) : null}

        <div className="rail-label" style={{ marginTop: 8 }}>
          <Link href="/app" onClick={() => onNavigate?.()} style={{ textDecoration: "none" }}>
            All lots →
          </Link>
        </div>
      </div>

      <div className="rail-foot">
        <span className="hint" style={{ padding: "0 4px" }}>
          {nexconn === null
            ? "checking…"
            : nexconn
              ? "Nexconn · connected"
              : "Nexconn · local bus"}
        </span>
        <button className="who" onClick={onWho} title="Switch name">
          {identity ? (
            <>
              <span className="avatar" style={{ background: identity.color }}>
                {initials(identity.name)}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="who-name" style={{ display: "block" }}>
                  {identity.name}
                </span>
                <span className="who-sub">switch name</span>
              </span>
            </>
          ) : (
            <>
              <span className="avatar" style={{ background: "var(--line-strong)" }}>
                ?
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="who-name" style={{ display: "block" }}>
                  Not seated
                </span>
                <span className="who-sub">take a seat</span>
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
