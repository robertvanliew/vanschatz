import { db } from "@/lib/db";
import type { GiftView } from "@/lib/registry";

/**
 * Active gifts in display order, shaped for the page.
 *
 * Only the claim's guestId is exposed — never the claimant's name. Guests see
 * that something is taken, not who took it; the couple sees who on /admin.
 */
export async function listGifts(): Promise<GiftView[]> {
  const gifts = await db.gift.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { claim: true },
  });

  return gifts.map((g) => ({
    id: g.id,
    slug: g.slug,
    title: g.title,
    note: g.note,
    retailer: g.retailer,
    url: g.url,
    image: g.image,
    priceCents: g.priceCents,
    claim: g.claim ? { guestId: g.claim.guestId, claimedName: null } : null,
  }));
}
