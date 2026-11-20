"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "./api";
import type { AuctionEvent, LotView, Notice } from "@/lib/types";

/** Server clock offset, so a phone with the wrong time still sees the right countdown. */
export function useNow(offset: number, tickMs = 250) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), tickMs);
    return () => clearInterval(t);
  }, [offset, tickMs]);
  return now;
}

export function useLotFeed(lotId: string) {
  const [lot, setLot] = useState<LotView | null>(null);
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [online, setOnline] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSeq = useRef(0);

  const refresh = useCallback(async () => {
    const res = await client.lot(lotId);
    setLot(res.lot);
    setEvents(res.events);
    setOffset(res.serverTime - Date.now());
    lastSeq.current = res.events.reduce((m, e) => Math.max(m, e.seq), 0);
    setLoading(false);
  }, [lotId]);

  useEffect(() => {
    refresh().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    const source = new EventSource(`/api/lots/${encodeURIComponent(lotId)}/stream`);

    source.onopen = () => {
      setOnline(true);
      setError(null);
    };
    source.onerror = () => setOnline(false);

    source.onmessage = (raw) => {
      let payload: {
        type: string;
        serverTime?: number;
        lot?: LotView;
        event?: AuctionEvent;
      };
      try {
        payload = JSON.parse(raw.data);
      } catch {
        return;
      }

      if (typeof payload.serverTime === "number") {
        setOffset(payload.serverTime - Date.now());
      }
      if (payload.lot) setLot(payload.lot);

      if (payload.type === "event" && payload.event) {
        const event = payload.event;
        // A gap means we missed messages while disconnected — resync rather than
        // render an auction with a hole in it.
        if (lastSeq.current && event.seq > lastSeq.current + 1) {
          void refresh();
          return;
        }
        lastSeq.current = Math.max(lastSeq.current, event.seq);
        setEvents((prev) => (prev.some((e) => e.id === event.id) ? prev : [...prev, event]));
      }
    };

    return () => source.close();
  }, [lotId, refresh]);

  const applyLot = useCallback((next: LotView) => setLot(next), []);

  return { lot, events, online, offset, error, loading, refresh, applyLot };
}

/** Private notices for one user: outbid warnings and settlement results. */
export function useNotices(userId: string | null, onNotice: (notice: Notice) => void) {
  const handler = useRef(onNotice);
  handler.current = onNotice;

  useEffect(() => {
    if (!userId) return;
    const source = new EventSource(
      `/api/notifications/stream?userId=${encodeURIComponent(userId)}`,
    );
    source.onmessage = (raw) => {
      try {
        const payload = JSON.parse(raw.data) as { type: string; notice?: Notice };
        if (payload.type === "notice" && payload.notice?.type) {
          handler.current(payload.notice);
        }
      } catch {
        /* ignore malformed */
      }
    };
    return () => source.close();
  }, [userId]);
}
