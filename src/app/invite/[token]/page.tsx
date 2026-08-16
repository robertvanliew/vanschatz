import { db } from "@/lib/db";
import InvitePage from "@/components/InvitePage";
import { getRegistryPreview } from "@/lib/registry-preview";

export const dynamic = "force-dynamic";

export default async function GuestInvite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [guest, registry] = await Promise.all([
    db.guest.findUnique({ where: { token } }),
    getRegistryPreview(),
  ]);
  if (!guest) {
    return (
      <InvitePage
        guest={null}
        unknownToken
        registryPreview={registry.preview}
        registryTotal={registry.total}
      />
    );
  }
  return (
    <InvitePage
      guest={{
        name: guest.name,
        token: guest.token,
        rsvpStatus: guest.rsvpStatus,
        partySize: guest.partySize,
        adults: guest.adults,
        children: guest.children,
      }}
      registryPreview={registry.preview}
      registryTotal={registry.total}
    />
  );
}
