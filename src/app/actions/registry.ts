"use server";

import { db } from "@/lib/db";
import { canClaim, canClaimNamed, canUnclaim } from "@/lib/registry";
import { findGuestMatch } from "@/lib/rsvp-matching";
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
 * Claim a gift without a personal invite link.
 *
 * For guests who declined but still want to send something, and for anyone whose
 * invitation was on paper. The typed name is matched against the guest list, so
 * a claim by someone already invited attaches to their row rather than floating
 * loose; an unmatched name is recorded as typed. No guest is created — claiming
 * a gift is not an RSVP.
 *
 * Returns the claim's id. The browser keeps it so the same person can undo, and
 * nobody else can: the id is a cuid, so it cannot be guessed from the page.
 */
export async function claimGiftByName(
  giftId: string,
  name: string
): Promise<ClaimResult & { claimId?: string }> {
  const trimmed = (name ?? "").trim();

  const gift = await db.gift.findUnique({
    where: { id: giftId },
    include: { claim: true },
  });
  if (!gift || !gift.active) {
    return { ok: false, error: "That gift is no longer on the registry." };
  }

  const decision = canClaimNamed(gift, trimmed);
  if (!decision.ok) return { ok: false, error: decision.reason };

  // Attach to an existing guest when the name clearly belongs to one, so the
  // couple's thank-you list stays accurate. Ambiguity matches nobody by design.
  const guests = await db.guest.findMany({ select: { id: true, name: true, email: true } });
  const match = findGuestMatch(guests, { name: trimmed });

  try {
    const claim = await db.giftClaim.create({
      data: { giftId: gift.id, guestId: match?.id ?? null, claimedName: trimmed },
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
 * Record how a gift claimed *without* an invite link is reaching the couple.
 *
 * Authorised by the claim's own id, like unclaimGiftByClaimId: the update is
 * scoped by both ids, so it touches nothing unless this browser really made
 * this claim.
 *
 * When the answer is "post it", the shipping address comes back in the
 * response. That is a deliberate widening of who can see it: Julie and Robert
 * chose it so that people who can't attend, and people who only had a paper
 * invitation, can still send a gift. It is still never rendered into a public
 * page; you have to have claimed a gift to receive it.
 */
export async function setDeliveryByClaimId(
  giftId: string,
  claimId: string,
  delivery: string
): Promise<ClaimResult & { shipping?: Shipping | null }> {
  if (!isDelivery(delivery)) return { ok: false, error: "That isn't a delivery option." };
  if (!claimId) return { ok: false, error: "That claim isn't yours." };

  const { count } = await db.giftClaim.updateMany({
    where: { id: claimId, giftId },
    data: { delivery },
  });
  if (count === 0) return { ok: false, error: "That claim isn't yours." };

  revalidatePath("/registry");
  revalidatePath("/admin");
  return { ok: true, shipping: delivery === "SHIP" ? await readShipping() : null };
}

/**
 * The address again, for someone who claimed without a link, chose "post it",
 * and has come back later. Same rule: only for the holder of a real claim.
 */
export async function revealShippingForClaim(
  giftId: string,
  claimId: string
): Promise<ClaimResult & { shipping?: Shipping | null }> {
  if (!claimId) return { ok: false, error: "That claim isn't yours." };
  const claim = await db.giftClaim.findFirst({ where: { id: claimId, giftId } });
  if (!claim) return { ok: false, error: "That claim isn't yours." };
  return { ok: true, shipping: await readShipping() };
}
