"use client";

import Link from "next/link";
import type { LotSummary } from "@/lib/types";
import { plural, rupee } from "@/lib/format";
import { Countdown } from "@/components/Countdown";

export function LotCard({
  lot,
  index = 0,
  featured = false,
}: {
  lot: LotSummary;
  index?: number;
  featured?: boolean;
}) {
  const live = lot.status === "live";

  return (
    <Link
      href={`/app/${lot.id}`}
      className={`bezel ${featured ? "span-2" : ""}`}
      style={{
        display: "block",
        animation: `rise .5s ${index * 55}ms var(--ease-soft) both`,
      }}
    >
      <article className="lot-card">
        <div className="live-thumb">
          <span className="lot-no">LOT {String(index + 1).padStart(2, "0")}</span>
          {lot.watching ? (
            <span
              className="chip chip-rust"
              style={{ position: "absolute", top: 8, right: 8, padding: "3px 8px", fontSize: 10 }}
            >
              in room
            </span>
          ) : null}
          <span className="glyph" aria-hidden>
            {lot.emoji}
          </span>
        </div>

        <div className="lot-card-body">
          <h3>{lot.title}</h3>

          <div className="meta">
            <span>{lot.sellerName}</span>
            <span style={{ color: "var(--faint)" }}>·</span>
            <span>{plural(lot.bidCount, "bid")}</span>
            <span style={{ color: "var(--faint)" }}>·</span>
            <span>{plural(lot.watchers, "watcher")}</span>
          </div>

          <div className="foot">
            <div>
              <div className="label">{lot.bidCount ? "Current" : "Starting at"}</div>
              <div className="price-sm">{rupee(lot.currentBid)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="label">{live ? "Closes in" : "Final"}</div>
              <span className="mono" style={{ fontSize: 15 }}>
                {live ? <Countdown endsAt={lot.endsAt} /> : rupee(lot.currentBid)}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
