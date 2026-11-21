"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useIdentityState, type Identity } from "./identity";
import { IdentityGate } from "@/components/IdentityGate";

type Ctx = {
  identity: Identity | null;
  ready: boolean;
  /** Ask for a name. Resolves through the gate modal. */
  openGate: () => void;
  switchIdentity: () => void;
  ensureIdentity: () => boolean;
};

const IdentityCtx = createContext<Ctx | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const { identity, ready, commit } = useIdentityState();
  const [gateOpen, setGateOpen] = useState(false);

  const openGate = useCallback(() => setGateOpen(true), []);
  const switchIdentity = useCallback(() => setGateOpen(true), []);
  const ensureIdentity = useCallback(() => {
    if (identity) return true;
    setGateOpen(true);
    return false;
  }, [identity]);

  const value = useMemo(
    () => ({ identity, ready, openGate, switchIdentity, ensureIdentity }),
    [identity, ready, openGate, switchIdentity, ensureIdentity],
  );

  return (
    <IdentityCtx.Provider value={value}>
      {children}
      {gateOpen ? (
        <IdentityGate
          onPick={(name) => {
            commit(name);
            setGateOpen(false);
          }}
          onClose={identity ? () => setGateOpen(false) : undefined}
        />
      ) : null}
    </IdentityCtx.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityCtx);
  if (!ctx) throw new Error("useIdentity must be used inside IdentityProvider");
  return ctx;
}
