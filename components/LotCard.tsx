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
      className={featured ? "span-2" : undefined}
      style={{ display: "block", animation: `rise .5s ${index * 55}ms var(--ease-soft) both` }}
    >
      <article className="lot-card">
        <div className="lot-media">
          <img src={lot.image} alt="" loading="lazy" />
          <span className="tag">
            {live ? (
              <span className="chip chip-accent">
                <i className="dot pulse" />
                live
              </span>
            ) : (
              <span className="chip">{lot.status === "closed" ? "sold" : "unsold"}</span>
            )}
          </span>
          {lot.watching ? (
            <span className="tag-r">
              <span className="chip">in room</span>
            </span>
          ) : null}
        </div>

        <div className="lot-body">
          <h3>{lot.title}</h3>

          <div className="lot-meta">
            <span>{lot.sellerName}</span>
            <span style={{ color: "var(--faint)" }}>·</span>
            <span>{plural(lot.bidCount, "bid")}</span>
            <span style={{ color: "var(--faint)" }}>·</span>
            <span>{plural(lot.watchers, "watcher")}</span>
          </div>

          <div className="lot-foot">
            <div>
              <div className="label">{lot.bidCount ? "Current bid" : "Starting at"}</div>
              <div className="price-sm">{rupee(lot.currentBid)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="label">{live ? "Closes in" : "Final"}</div>
              <span className="mono" style={{ fontSize: 15, fontWeight: 500 }}>
                {live ? <Countdown endsAt={lot.endsAt} /> : rupee(lot.currentBid)}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
