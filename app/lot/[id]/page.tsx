import { redirect } from "next/navigation";

/**
 * Old links (`/lot/x?as=Riya`) keep working — they land in the app shell.
 * `as` is forwarded so the rehearsal scripts and any shared links still resolve.
 */
export default async function LegacyLotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { id } = await params;
  const { as } = await searchParams;
  redirect(`/app/${id}${as ? `?as=${encodeURIComponent(as)}` : ""}`);
}
