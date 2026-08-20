/**
 * Matching a website RSVP to someone already on the guest list.
 *
 * Guests who scan the QR on a printed invitation have no personal link, so they
 * type their name. That reply still has to reach the right row rather than
 * creating a second copy of someone already invited.
 */

export type MatchableGuest = {
  id: string;
  name: string;
  email: string | null;
};

/** Lowercase, collapse runs of whitespace, drop surrounding space. */
export function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Find the guest this RSVP belongs to, or null to add someone new.
 *
 * Email wins over name: two cousins can share a name, but an address is theirs.
 * Name matching is exact once normalised — deliberately not fuzzy, because
 * quietly attaching "Dave Goldstein" to David Goldstein's invitation would
 * overwrite a real RSVP with a stranger's, and a duplicate row the couple can
 * see and merge is the safer failure.
 */
export function findGuestMatch(
  guests: MatchableGuest[],
  input: { name: string; email?: string | null }
): MatchableGuest | null {
  const email = normalise(input.email);
  if (email) {
    const byEmail = guests.find((g) => normalise(g.email) === email);
    if (byEmail) return byEmail;
  }

  const name = normalise(input.name);
  if (!name) return null;

  const byName = guests.filter((g) => normalise(g.name) === name);
  // Exactly one match is a match. Two people with the same name and no email to
  // separate them is not something to guess at.
  return byName.length === 1 ? byName[0] : null;
}
