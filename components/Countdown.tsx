"use client";

import { useEffect, useRef } from "react";
import { clock } from "@/lib/format";
import { useNow } from "@/lib/client/hooks";

/**
 * Countdown rendered against the *server's* clock (offset-adjusted), not the
 * device's. A phone that is two minutes slow still sees the truth.
 */
export function Countdown({
  endsAt,
  offset,
  urgentMs = 30_000,
  onExpire,
  className = "",
  showSeconds = true,
}: {
  endsAt: number;
  offset: number;
  urgentMs?: number;
  onExpire?: () => void;
  className?: string;
  showSeconds?: boolean;
}) {
  const now = useNow(offset, showSeconds ? 200 : 1000);
  const remaining = Math.max(0, endsAt - now);
  const urgent = remaining > 0 && remaining <= urgentMs;
  const fired = useRef(false);

  useEffect(() => {
    if (remaining > 0) {
      fired.current = false;
      return;
    }
    if (!fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [remaining, onExpire]);

  return (
    <span
      className={`num ${urgent ? "urgent" : ""} ${className}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {remaining === 0 ? "closed" : clock(remaining)}
    </span>
  );
}
