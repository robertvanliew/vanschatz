import { db } from "@/lib/db";
import InvitePage from "@/components/InvitePage";
import { getRegistryPreview } from "@/lib/registry-preview";
import type { PickedSong } from "@/components/SongPicker";

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
  const rows = await db.songRequest.findMany({
    where: { guestId: guest.id },
    orderBy: { createdAt: "asc" },
  });
  const songs: PickedSong[] = rows.map((r) => ({
    trackId: r.trackId,
    title: r.title,
    artist: r.artist,
    composer: r.composer,
    album: null,
    artwork: r.artwork,
    previewUrl: r.previewUrl,
    appleUrl: r.appleUrl,
    explicit: r.explicit,
    manual: r.manual,
    note: r.note ?? "",
  }));
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
      songs={songs}
    />
  );
}
