/**
 * Registry rules, kept pure so they can be tested without a database.
 *
 * The server actions in app/actions/registry.ts are thin wrappers over these —
 * every decision about who may claim or unclaim a gift is made here.
 */

export type GiftClaimView = {
  /** Null when the claim was made without an invite link. */
  guestId: string | null;
  claimedName: string | null;
  /** "SHIP" | "BRING" | null — how the claimant is getting it to the couple. */
  delivery: string | null;
};

export type GiftView = {
  id: string;
  slug: string;
  title: string;
  note: string | null;
  retailer: string;
  url: string;
  image: string | null;
  priceCents: number | null;
  claim: GiftClaimView | null;
};

export type GiftFilter = "all" | "available" | "taken";

/** Formats a price for display. Prices are approximate, and often absent. */
export function formatPrice(priceCents: number | null | undefined): string | null {
  if (priceCents == null || !Number.isFinite(priceCents) || priceCents <= 0) return null;
  const dollars = priceCents / 100;
  // Whole-dollar prices read better without the trailing ".00"
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function isClaimed(gift: Pick<GiftView, "claim">): boolean {
  return gift.claim != null;
}

/** True when this gift is claimed by the guest currently looking at the page. */
export function isClaimedByMe(gift: Pick<GiftView, "claim">, guestId: string | null): boolean {
  if (!gift.claim || !guestId) return false;
  return gift.claim.guestId === guestId;
}

export function filterGifts<T extends Pick<GiftView, "claim">>(gifts: T[], filter: GiftFilter): T[] {
  if (filter === "available") return gifts.filter((g) => !isClaimed(g));
  if (filter === "taken") return gifts.filter((g) => isClaimed(g));
  return gifts;
}

export type ClaimDecision = { ok: true } | { ok: false; reason: string };

/**
 * May this guest claim this gift?
 *
 * A guest must be identified — the public /registry has no token, so claiming
 * there is refused rather than recorded anonymously and made impossible to
 * thank someone for.
 */
export function canClaim(
  gift: Pick<GiftView, "claim"> | null,
  guestId: string | null
): ClaimDecision {
  if (!gift) return { ok: false, reason: "That gift is no longer on the registry." };
  if (!guestId) {
    return { ok: false, reason: "Open your personal invitation link to claim a gift." };
  }
  if (gift.claim) {
    return isClaimedByMe(gift, guestId)
      ? { ok: false, reason: "You've already claimed this one." }
      : { ok: false, reason: "Someone just claimed this one." };
  }
  return { ok: true };
}

/** Only the guest holding a claim may release it. */
export function canUnclaim(
  gift: Pick<GiftView, "claim"> | null,
  guestId: string | null
): ClaimDecision {
  if (!gift) return { ok: false, reason: "That gift is no longer on the registry." };
  if (!gift.claim) return { ok: false, reason: "That gift isn't claimed." };
  if (!guestId || !isClaimedByMe(gift, guestId)) {
    return { ok: false, reason: "Only the person who claimed a gift can release it." };
  }
  return { ok: true };
}

/** "8 of 12 claimed" — shown above the grid. */
export function claimSummary(gifts: Pick<GiftView, "claim">[]): {
  total: number;
  claimed: number;
  available: number;
} {
  const total = gifts.length;
  const claimed = gifts.filter(isClaimed).length;
  return { total, claimed, available: total - claimed };
}

/** Initials used by the placeholder tile when a gift has no photograph. */
export function placeholderInitials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s&-]/gu, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 0 && w !== "&");
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
