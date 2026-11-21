import { RoomPane } from "@/components/room/RoomPane";

export const dynamic = "force-dynamic";

export default async function LotPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  return <RoomPane lotId={lotId} />;
}
