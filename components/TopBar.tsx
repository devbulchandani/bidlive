"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { client } from "@/lib/client/api";
import type { Identity } from "@/lib/client/identity";
import { initials } from "@/lib/format";

export function TopBar({
  identity,
  onSwitch,
}: {
  identity: Identity | null;
  onSwitch?: () => void;
}) {
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    client
      .health()
      .then((h) => alive && setLive(h.nexconnConfigured))
      .catch(() => alive && setLive(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">
          <span className="brand-mark">B</span>
          BidLive
        </Link>

        <span className="pill" title="Every auction event is mirrored into a Nexconn group channel">
          {live === null ? (
            "checking…"
          ) : live ? (
            <>
              <i className="dot" style={{ color: "var(--green)" }} /> Nexconn live
            </>
          ) : (
            <>
              <i className="dot" style={{ color: "var(--gold)" }} /> Nexconn: local bus
            </>
          )}
        </span>

        <div className="grow" />

        {identity ? (
          <button
            className="pill"
            onClick={onSwitch}
            title="Switch identity (open a second window to bid against yourself)"
            style={{ cursor: "pointer" }}
          >
            <span
              className="avatar"
              style={{ background: identity.color, width: 18, height: 18, fontSize: 9 }}
            >
              {initials(identity.name)}
            </span>
            {identity.name}
          </button>
        ) : (
          <button className="btn gold sm" onClick={onSwitch}>
            Take a seat
          </button>
        )}
      </div>
    </header>
  );
}
