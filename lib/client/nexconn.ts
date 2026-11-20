"use client";

import { useEffect, useRef, useState } from "react";
import type { Identity } from "./identity";
import { client } from "./api";

export type BridgeState = {
  status: "off" | "connecting" | "connected" | "error";
  received: number;
  error?: string;
};

const INITIAL: BridgeState = { status: "off", received: 0 };

let engineReady = false;

/**
 * Browser side of the Nexconn integration.
 *
 * The server is the only writer (it holds the App Secret and mirrors every auction
 * event into the lot's group channel). This hook connects the Chat SDK so the
 * client is a real participant: it joins the channel, tracks connection state and
 * receives the same messages over Nexconn's socket. `received` is counted from the
 * SDK itself, so the pill in the room is evidence rather than decoration.
 */
export function useNexconnBridge(identity: Identity | null, channelId: string | undefined) {
  const [state, setState] = useState<BridgeState>(INITIAL);
  const received = useRef(0);

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_NEXCONN_APP_KEY;
    if (!identity || !channelId || !appKey) {
      setState(INITIAL);
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      setState({ status: "connecting", received: 0 });
      try {
        const tokenRes = await client.token(identity.id, identity.name);
        if (cancelled) return;
        if (!tokenRes.configured || !tokenRes.token) {
          setState({ status: "off", received: 0 });
          return;
        }

        const sdk = await import("@nexconn/chat");
        if (cancelled) return;
        const { NCEngine, GroupChannel, MessageHandler, ConnectionStatusHandler } = sdk;

        if (!engineReady) {
          NCEngine.initialize({ appKey });
          NCEngine.registerCustomMessages([
            { messageType: "bidlive:Bid", isPersisted: true, isCounted: true },
            { messageType: "bidlive:System", isPersisted: true, isCounted: true },
            { messageType: "bidlive:Chat", isPersisted: true, isCounted: true },
          ]);
          engineReady = true;
        }

        NCEngine.addConnectionStatusHandler(
          "bidlive-connection",
          new ConnectionStatusHandler({
            onConnectionStatusChanged: ({ status }: { status?: unknown }) => {
              if (cancelled) return;
              const label = String(status ?? "");
              if (/connect/i.test(label) && !/disconnect/i.test(label)) {
                setState((prev) =>
                  prev.status === "connected" ? prev : { ...prev, status: "connected" },
                );
              }
            },
          }),
        );

        NCEngine.addMessageHandler(
          "bidlive-messages",
          new MessageHandler({
            onMessageReceived: () => {
              if (cancelled) return;
              received.current += 1;
              setState((prev) => ({ ...prev, received: received.current }));
            },
          }),
        );

        const result = await NCEngine.connect({ token: tokenRes.token });
        if (cancelled) return;

        const ok = readOk(result);
        if (!ok) {
          setState({ status: "error", received: 0, error: "connect failed" });
          return;
        }

        setState({ status: "connected", received: 0 });

        const channel = new GroupChannel(channelId);
        try {
          await channel.join();
        } catch {
          /* membership is also ensured server-side */
        }

        cleanup = () => {
          try {
            NCEngine.removeMessageHandler("bidlive-messages");
            NCEngine.removeConnectionStatusHandler("bidlive-connection");
          } catch {
            /* handler already gone */
          }
        };
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          received: 0,
          error: err instanceof Error ? err.message : "sdk error",
        });
      }
    };

    void start();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [identity, channelId]);

  return state;
}

/** RCResult carries `isOk` and `code`; tolerate either shape. */
function readOk(result: unknown) {
  if (!result || typeof result !== "object") return false;
  const r = result as { isOk?: boolean; code?: number };
  if (typeof r.isOk === "boolean") return r.isOk;
  return r.code === 0;
}
