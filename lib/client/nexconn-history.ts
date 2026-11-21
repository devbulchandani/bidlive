"use client";

import type { HistoryMessage } from "@/lib/replay";

/**
 * Reads a lot's transcript back out of Nexconn.
 *
 * The server holds no database — on a cold start its projection is empty. The
 * browser is the component that already has an authenticated chat session, so it
 * asks the SDK for the channel history and hands it to `/rehydrate`, where the
 * server replays it through the auction rules.
 */
export async function readChannelHistory(
  channelId: string,
  { max = 200, pageSize = 100 } = {},
): Promise<HistoryMessage[]> {
  const sdk = await import("@nexconn/chat");
  const { BaseChannel, GroupChannelIdentifier } = sdk;

  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: new GroupChannelIdentifier(channelId),
    pageSize,
    isAscending: true,
  });

  const out: HistoryMessage[] = [];
  let pages = 0;

  while (pages < 4 && out.length < max) {
    const result = await query.loadNextPage();
    const ok = (result as { isOk?: boolean }).isOk ?? (result as { code?: number }).code === 0;
    if (!ok) break;

    const rows = (result as { data?: { data?: unknown[] } }).data?.data ?? [];
    for (const row of rows) {
      const m = row as {
        messageId?: string;
        messageType?: string;
        objectName?: string;
        content?: unknown;
        sentTime?: number;
        senderUserId?: string;
      };
      const objectName = m.messageType ?? m.objectName ?? "";
      if (!objectName.startsWith("bidlive:")) continue;
      out.push({
        id: m.messageId ?? `${objectName}:${m.sentTime ?? 0}:${out.length}`,
        objectName,
        content: m.content,
        sentAt: m.sentTime ?? 0,
        senderId: m.senderUserId ?? "",
      });
    }

    pages += 1;
    if (!query.hasNext) break;
  }

  return out.slice(0, max);
}
