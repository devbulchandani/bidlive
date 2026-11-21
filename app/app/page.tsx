"use client";

import { useCallback, useEffect, useState } from "react";
import { client } from "@/lib/client/api";
import { useIdentity } from "@/lib/client/identity-context";
import type { LotSummary } from "@/lib/types";
import { plural } from "@/lib/format";
import { LotCard } from "@/components/LotCard";

export default function OverviewPage() {
  const { identity, ensureIdentity } = useIdentity();
  const [lots, setLots] = useState<LotSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await client.lots(identity?.id);
      setLots(res.lots);
    } finally {
      setLoaded(true);
    }
  }, [identity?.id]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    const onRefresh = () => void load();
    window.addEventListener("bidlive:refresh-lots", onRefresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("bidlive:refresh-lots", onRefresh);
    };
  }, [load]);

  const live = lots.filter((l) => l.status === "live");
  const yours = lots.filter((l) => l.watching);

  // Your rooms first, then the rest — one continuous grid, so the numbering and
  // the spacing never restart mid-page.
  const ordered = [
    ...yours,
    ...lots.filter((l) => !l.watching),
  ];

  return (
    <div className="overview">
      <header className="overview-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {identity ? `Signed in as ${identity.name}` : "No name yet"}
          </div>
          <h2>Pick a lot to enter.</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="chip chip-rust">
            <i className="dot pulse" />
            {plural(live.length, "live lot")}
          </span>
          {!identity ? (
            <button className="btn btn-primary btn-sm" onClick={ensureIdentity}>
              Take a seat
            </button>
          ) : null}
        </div>
      </header>

      {!loaded ? (
        <div className="lot-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 320 }} />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="empty">No lots are open right now.</div>
      ) : (
        <div className="lot-grid">
          {ordered.map((lot, i) => (
            <LotCard key={lot.id} lot={lot} index={i} featured={i === 0} />
          ))}
        </div>
      )}

      <footer
        style={{
          marginTop: 48,
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "var(--muted)",
          fontSize: 12.5,
          flexWrap: "wrap",
        }}
      >
        <span>Rehearsing the demo? Re-arm the lots and the clocks.</span>
        <button
          className="mod-btn"
          onClick={async () => {
            await client.reset();
            await load();
          }}
        >
          Reset demo lots
        </button>
      </footer>
    </div>
  );
}
