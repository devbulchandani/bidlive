"use client";

import { colorFor } from "@/lib/format";

export type Identity = { id: string; name: string; color: string };

const KEY = "bidlive.identity.v1";

export function slugify(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "guest"
  );
}

export function makeIdentity(name: string): Identity {
  const clean = name.trim().slice(0, 24) || "Guest";
  const id = slugify(clean);
  return { id, name: clean, color: colorFor(id) };
}

export function loadIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    if (!parsed?.id || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    /* private mode — the session still works, it just won't persist */
  }
}

export function clearIdentity() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

import { useCallback, useEffect, useState } from "react";

/** Identity is just a name in localStorage — no password, no signup wall to clear. */
export function useIdentityState() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // `?as=Arjun` is a demo shortcut: open a second window pre-signed so you can
    // bid against yourself without a modal in the middle of a recording.
    let initial = loadIdentity();
    try {
      const as = new URLSearchParams(window.location.search).get("as");
      if (as?.trim()) {
        initial = makeIdentity(as);
        saveIdentity(initial);
        const url = new URL(window.location.href);
        url.searchParams.delete("as");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      /* malformed url — fall back to stored identity */
    }
    setIdentity(initial);
    setReady(true);
  }, []);

  const commit = useCallback((name: string) => {
    const next = makeIdentity(name);
    saveIdentity(next);
    setIdentity(next);
    return next;
  }, []);

  return { identity, ready, commit };
}
