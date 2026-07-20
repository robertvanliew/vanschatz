import { db } from "@/lib/db";
import InvitePage from "@/components/InvitePage";

export const dynamic = "force-dynamic";

export default async function GuestInvite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await db.guest.findUnique({ where: { token } });
  if (!guest) return <InvitePage guest={null} unknownToken />;
  return (
    <InvitePage
      guest={{
        name: guest.name,
        token: guest.token,
        rsvpStatus: guest.rsvpStatus,
        partySize: guest.partySize,
      }}
    />
  );
}
