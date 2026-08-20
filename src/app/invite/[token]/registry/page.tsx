import { db } from "@/lib/db";
import RegistryPage from "@/components/registry/RegistryPage";
import { listGifts } from "@/lib/gifts";
import { readShipping } from "@/lib/settings";
import { visibleShipping } from "@/lib/shipping";

export const dynamic = "force-dynamic";

/**
 * The registry as seen from a personal invitation. The token identifies the
 * guest, so claiming is a single tap with nothing to type.
 *
 * An unrecognised token falls back to the read-only view rather than a 404 —
 * a mistyped link should still let someone see the gifts.
 */
export default async function GuestRegistry({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [guest, gifts, shipping] = await Promise.all([
    db.guest.findUnique({ where: { token } }),
    listGifts(),
    readShipping(),
  ]);

  if (!guest) {
    return (
      <RegistryPage gifts={gifts} guestId={null} guestName={null} token={null} shipping={null} />
    );
  }

  return (
    <RegistryPage
      gifts={gifts}
      guestId={guest.id}
      guestName={guest.name}
      token={guest.token}
      shipping={visibleShipping(shipping, true)}
    />
  );
}
