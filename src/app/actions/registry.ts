"use server";

import { db } from "@/lib/db";
import { canClaim, canUnclaim } from "@/lib/registry";
import { eligibleForGifts, findGiftGuest } from "@/lib/gift-guests";
import { isDelivery, type Shipping } from "@/lib/shipping";
import { readShipping } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export type ClaimResult = { ok: boolean; error?: string };

/** Prisma's code for a unique-constraint violation. */
const UNIQUE_VIOLATION = "P2002";

function revalidateRegistry(token: string) {
  revalidatePath("/registry");
  revalidatePath(`/invite/${token}/registry`);
  revalidatePath(`/invite/${token}`);
}

/**
 * Claim a gift for the guest holding `token`.
 *
 * The check-then-write here is deliberately not the safety net: two guests can
 * both pass the check and race to insert. The unique constraint on
 * GiftClaim.giftId settles it, and the loser is told the truth rather than
 * being shown a success they didn't get.
 */
export async function claimGift(token: string, giftId: string): Promise<ClaimResult> {
  const guest = await db.guest.findUnique({ where: { token } });
  if (!guest) return { ok: false, error: "We couldn't find your invitation." };

  const gift = await db.gift.findUnique({
    where: { id: giftId },
    include: { claim: true },
  });
  if (!gift || !gift.active) {
    return { ok: false, error: "That gift is no longer on the registry." };
  }

  const decision = canClaim(gift, guest.id);
  if (!decision.ok) return { ok: false, error: decision.reason };

  try {
    await db.giftClaim.create({ data: { giftId: gift.id, guestId: guest.id } });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === UNIQUE_VIOLATION) {
      return { ok: false, error: "Someone just claimed this one." };
    }
    throw err;
  }

  revalidateRegistry(token);
  return { ok: true };
}

/** Release a claim. Only the guest who made it may do this. */
export async function unclaimGift(token: string, giftId: string): Promise<ClaimResult> {
  const guest = await db.guest.findUnique({ where: { token } });
  if (!guest) return { ok: false, error: "We couldn't find your invitation." };

  const gift = await db.gift.findUnique({
    where: { id: giftId },
    include: { claim: true },
  });

  const decision = canUnclaim(gift, guest.id);
  if (!decision.ok) return { ok: false, error: decision.reason };

  // Scope the delete by guestId too, so a claim that changed hands between the
  // check above and this write is not deleted by the wrong person.
  const { count } = await db.giftClaim.deleteMany({
    where: { giftId, guestId: guest.id },
  });
  if (count === 0) return { ok: false, error: "That claim is no longer yours." };

  revalidateRegistry(token);
  return { ok: true };
}

/**
 * Record whether a guest is posting their gift or bringing it on the day.
 *
 * Only the guest holding the claim may set this, and the update is scoped by
 * guestId so a claim that changed hands in between is not overwritten. Guests
 * change their minds, so this can be called again.
 */
export async function setDelivery(
  token: string,
  giftId: string,
  delivery: string
): Promise<ClaimResult> {
  if (!isDelivery(delivery)) return { ok: false, error: "That isn't a delivery option." };

  const guest = await db.guest.findUnique({ where: { token } });
  if (!guest) return { ok: false, error: "We couldn't find your invitation." };

  const { count } = await db.giftClaim.updateMany({
    where: { giftId, guestId: guest.id },
    data: { delivery },
  });
  if (count === 0) {
    return { ok: false, error: "Claim this gift first, then tell us how it's reaching us." };
  }

  revalidateRegistry(token);
  return { ok: true };
}

/**
 * Claim a gift without a personal invite link, by the email the guest was
 * invited with.
 *
 * Only people on the guest list can claim, so only they can ever see the
 * shipping address. An email is the check rather than a name because a guest's
 * name is often known to other people while their email address rarely is.
 * Self-added guests from the website RSVP form don't count until the couple
 * approves them in admin (see gift-guests.ts).
 *
 * Returns the claim's id. The browser keeps it so the same person can set how
 * it's arriving, see the address, and undo; the id is a cuid and never appears
 * on the page. If this guest already holds the claim, from their invite link or
 * another device, it is handed back rather than refused.
 */
export async function claimGiftByEmail(
  giftId: string,
  email: string
): Promise<ClaimResult & { claimId?: string }> {
  const gift = await db.gift.findUnique({
    where: { id: giftId },
    include: { claim: true },
  });
  if (!gift || !gift.active) {
    return { ok: false, error: "That gift is no longer on the registry." };
  }

  const guests = await db.guest.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, source: true },
  });
  const guest = findGiftGuest(guests, email);
  if (!guest) {
    return {
      ok: false,
      error:
        "We couldn't find that email on our guest list. Try the one we invited you with, use the link from your invitation, or get in touch with us.",
    };
  }

  if (gift.claim && gift.claim.guestId === guest.id) {
    return { ok: true, claimId: gift.claim.id };
  }

  const decision = canClaim(gift, guest.id);
  if (!decision.ok) return { ok: false, error: decision.reason };

  try {
    const claim = await db.giftClaim.create({
      data: { giftId: gift.id, guestId: guest.id, claimedName: guest.name },
    });
    revalidatePath("/registry");
    revalidatePath("/admin");
    return { ok: true, claimId: claim.id };
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === UNIQUE_VIOLATION) {
      return { ok: false, error: "Someone just claimed this one." };
    }
    throw err;
  }
}

/**
 * The claim this browser holds, if it belongs to someone entitled to see the
 * address: a guest on the list who isn't an unapproved self-added one.
 */
async function eligibleClaim(giftId: string, claimId: string) {
  if (!claimId) return null;
  const claim = await db.giftClaim.findFirst({
    where: { id: claimId, giftId },
    include: { guest: { select: { source: true } } },
  });
  if (!claim || !claim.guest || !eligibleForGifts(claim.guest)) return null;
  return claim;
}

/**
 * Release a claim made without an invite link.
 *
 * Authorised by the claim's own id, which only the browser that made it holds.
 * Scoping the delete by both ids means a stale id cannot release a gift that has
 * since been claimed by somebody else.
 */
export async function unclaimGiftByClaimId(
  giftId: string,
  claimId: string
): Promise<ClaimResult> {
  if (!claimId) return { ok: false, error: "That claim isn't yours to release." };

  const { count } = await db.giftClaim.deleteMany({ where: { id: claimId, giftId } });
  if (count === 0) return { ok: false, error: "That claim isn't yours to release." };

  revalidatePath("/registry");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Record how a gift claimed without an invite link is reaching the couple, and
 * hand over the address if it's being posted.
 *
 * Authorised by the claim id this browser kept, and only for claims belonging
 * to someone on the guest list, so a stranger never receives the address.
 */
export async function setDeliveryByClaimId(
  giftId: string,
  claimId: string,
  delivery: string
): Promise<ClaimResult & { shipping?: Shipping | null }> {
  if (!isDelivery(delivery)) return { ok: false, error: "That isn't a delivery option." };
  const claim = await eligibleClaim(giftId, claimId);
  if (!claim) return { ok: false, error: "That claim isn't yours." };

  await db.giftClaim.update({ where: { id: claim.id }, data: { delivery } });

  revalidatePath("/registry");
  revalidatePath("/admin");
  return { ok: true, shipping: delivery === "SHIP" ? await readShipping() : null };
}

/**
 * The address again, for a guest who claimed without their link, chose "post
 * it", and has come back later. Same rule as above.
 */
export async function revealShippingForClaim(
  giftId: string,
  claimId: string
): Promise<ClaimResult & { shipping?: Shipping | null }> {
  const claim = await eligibleClaim(giftId, claimId);
  if (!claim) return { ok: false, error: "That claim isn't yours." };
  return { ok: true, shipping: await readShipping() };
}
