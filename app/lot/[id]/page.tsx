import { LotRoom } from "@/components/room/LotRoom";

export const dynamic = "force-dynamic";

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LotRoom lotId={id} />;
}
