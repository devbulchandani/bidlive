"use client";

import Link from "next/link";
import type { LotSummary } from "@/lib/types";
import { rupee } from "@/lib/format";
import { Countdown } from "./Countdown";

export function LotCard({ lot, index = 0 }: { lot: LotSummary; index?: number }) {
  const live = lot.status === "live";

  return (
    <Link
      href={`/lot/${lot.id}`}
      className="lot-card"
      style={{ animation: `rise .4s ${index * 60}ms cubic-bezier(.22,1,.36,1) both` }}
    >
      <div className="lot-thumb">
        <span className="tag">
          {live ? (
            <span className="pill live">
              <i className="dot" /> live
            </span>
          ) : (
            <span className="pill">{lot.status === "closed" ? "sold" : "unsold"}</span>
          )}
        </span>
        <span aria-hidden>{lot.emoji}</span>
      </div>

      <div className="lot-body">
        <div>
          <div className="lot-title">{lot.title}</div>
          <div className="lot-sub">{lot.subtitle}</div>
        </div>

        <div className="lot-meta">
          <span>🔨 {lot.sellerName}</span>
          <span>·</span>
          <span>
            {lot.bidCount} {lot.bidCount === 1 ? "bid" : "bids"}
          </span>
          <span>·</span>
          <span>{lot.watchers} watching</span>
        </div>

        <div className="lot-price-row">
          <div>
            <div className="price-label">{lot.bidCount ? "current bid" : "starting at"}</div>
            <div className="price-big num">{rupee(lot.currentBid)}</div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="price-label">{live ? "closes in" : "final"}</div>
            <div
              className="num"
              style={{ fontSize: 17, color: live ? "var(--ink)" : "var(--ink-mute)" }}
            >
              {live ? (
                <Countdown endsAt={lot.endsAt} offset={0} />
              ) : (
                rupee(lot.currentBid)
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
