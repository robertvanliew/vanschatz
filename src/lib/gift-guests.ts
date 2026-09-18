/**
 * Who may claim a gift — and so see the shipping address — without an invite
 * link.
 *
 * Only people on the guest list. They prove it with the email they were
 * invited with rather than their name: all guests have one on file, and a name
 * is often known to other people while an email address rarely is.
 *
 * Guests added by the website RSVP form do not count until the couple approves
 * them. Otherwise anyone could RSVP with a made-up name and email, join the list
 * automatically, and use that email to see the couple's home address.
 */

import { normalise } from "@/lib/rsvp-matching";

/** Set by the website RSVP form on a guest nobody on the list matched. */
export const UNAPPROVED_SOURCE = "website";
/** Set when the couple approves such a guest in admin. */
export const APPROVED_SOURCE = "website-approved";

export type GiftGuest = {
  id: string;
  name: string;
  email: string | null;
  source: string | null;
};

export function eligibleForGifts(guest: Pick<GiftGuest, "source">): boolean {
  return guest.source !== UNAPPROVED_SOURCE;
}

/**
 * The guest this email belongs to, or null if they aren't on the list.
 *
 * Case and surrounding spaces are ignored, since people type their address
 * however they like. If two guests share an address — a couple entered
 * separately — the first is returned; a gift from the household can be
 * attributed to either.
 */
export function findGiftGuest<T extends GiftGuest>(guests: T[], email: string): T | null {
  const wanted = normalise(email);
  if (!wanted || !wanted.includes("@")) return null;
  return guests.find((g) => eligibleForGifts(g) && normalise(g.email) === wanted) ?? null;
}
