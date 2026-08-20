"use server";

import { db } from "@/lib/db";
import { canClaim, canUnclaim } from "@/lib/registry";
import { isDelivery } from "@/lib/shipping";
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
