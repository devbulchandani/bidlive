"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { client } from "@/lib/client/api";
import { useNotices } from "@/lib/client/hooks";
import { useIdentity } from "@/lib/client/identity-context";
import type { LotSummary, Notice } from "@/lib/types";
import { initials } from "@/lib/format";
import { Rail } from "./Rail";

type Toast = { id: string; notice: Notice };

/**
 * The app frame. The rail is persistent across lot switches, which is the point:
 * if you are in three auctions you move between them here instead of in three tabs.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { identity, switchIdentity, ensureIdentity } = useIdentity();
  const pathname = usePathname();
  const activeId = pathname?.startsWith("/app/") && pathname !== "/app" ? pathname.split("/")[2] : undefined;

  const [lots, setLots] = useState<LotSummary[]>([]);
  const [nexconn, setNexconn] = useState<boolean | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      const res = await client.lots(identity?.id);
      setLots(res.lots);
    } catch {
      /* the room surfaces its own errors */
    }
  }, [identity?.id]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    // the room tells us the moment it joins or bids, so the rail is never stale
    const onRefresh = () => void load();
    window.addEventListener("bidlive:refresh-lots", onRefresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("bidlive:refresh-lots", onRefresh);
    };
  }, [load]);

  useEffect(() => {
    client
      .health()
      .then((h) => setNexconn(h.nexconnConfigured))
      .catch(() => setNexconn(false));
  }, []);

  const pushToast = useCallback((notice: Notice) => {
    const key = `${notice.type}:${notice.lotId}:${notice.amount ?? ""}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, notice }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 9000);

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      (notice.type === "outbid" || notice.type === "lost")
    ) {
      try {
        new Notification(notice.type === "outbid" ? "You've been outbid" : "Lot settled", {
          body: notice.message ?? "",
          tag: `bidlive-${notice.lotId}`,
        });
      } catch {
        /* notifications unavailable */
      }
    }
  }, []);

  useNotices(identity?.id ?? null, pushToast);

  return (
    <div className="shell">
      <Rail
        lots={lots}
        activeId={activeId}
        identity={identity}
        nexconn={nexconn}
        onWho={() => (identity ? switchIdentity() : ensureIdentity())}
        onNavigate={() => setRailOpen(false)}
        onClose={() => setRailOpen(false)}
        open={railOpen}
      />

      {railOpen ? <div className="scrim" onClick={() => setRailOpen(false)} /> : null}

      <div className="pane">
        <div className="mobile-topbar">
          <button
            className="icon-btn"
            onClick={() => setRailOpen(true)}
            aria-label="Open auction list"
          >
            <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden>
              <path
                d="M0 1h14M0 5h14M0 9h14"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <Link href="/app" className="wordmark" style={{ fontSize: 19 }}>
            BidLive<span>.</span>
          </Link>
          <div style={{ flex: 1 }} />
          <button className="icon-btn" onClick={() => (identity ? switchIdentity() : ensureIdentity())}>
            {identity ? (
              <span
                className="avatar"
                style={{ background: identity.color, width: 22, height: 22, fontSize: 10 }}
              >
                {initials(identity.name)}
              </span>
            ) : (
              "?"
            )}
          </button>
        </div>

        {children}
      </div>

      {toasts.length ? (
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <div className="t-kicker">
                {t.notice.type === "outbid"
                  ? "Outbid"
                  : t.notice.type === "lost"
                    ? "Lot settled"
                    : "Notice"}
              </div>
              <div className="t-body">{t.notice.message}</div>
              <button
                className="t-link"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              >
                dismiss
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
