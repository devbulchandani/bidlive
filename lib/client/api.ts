"use client";

import type { AuctionEvent, LotSummary, LotView, BidRejection } from "@/lib/types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok && json?.ok === false) throw new Error(json.error ?? "request failed");
  return json as T;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "request failed");
  return json as T;
}

export type LotResponse = {
  ok: true;
  lot: LotView;
  events: AuctionEvent[];
  needsReplay?: boolean;
  serverTime: number;
};

export type ActionResponse = {
  ok: boolean;
  accepted?: boolean;
  rejected?: boolean;
  rejection?: BidRejection;
  amount?: number;
  endsAt?: number;
  extended?: boolean;
  seq?: number;
  lot?: LotSummary;
  error?: string;
};

export const client = {
  lots: (userId?: string) =>
    getJSON<{ lots: LotSummary[] }>(
      userId ? `/api/lots?userId=${encodeURIComponent(userId)}` : "/api/lots",
    ),
  lot: (id: string) => getJSON<LotResponse>(`/api/lots/${encodeURIComponent(id)}`),
  health: () =>
    getJSON<{ nexconnConfigured: boolean; nexconnApiBase: string | null; lots: number }>(
      "/api/health",
    ),
  token: (userId: string, name: string) =>
    getJSON<{ configured: boolean; token: string | null }>(
      `/api/token?userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(name)}`,
    ),
  rehydrate: (id: string, messages: unknown[]) =>
    postJSON<{ applied: number; skipped: number }>(
      `/api/lots/${encodeURIComponent(id)}/rehydrate`,
      { messages },
    ),
  action: (id: string, body: Record<string, unknown>) =>
    postJSON<ActionResponse>(`/api/lots/${encodeURIComponent(id)}/action`, body),
  reset: () => postJSON<{ lots: LotSummary[] }>("/api/dev/reset", {}),
};
