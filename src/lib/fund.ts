/**
 * The honeymoon fund.
 *
 * No money moves through this site. Guests are sent to PayPal and then say they
 * have sent it, exactly as they say they have bought a gift. These functions
 * hold the arithmetic and the link building so both can be tested without a
 * database or a browser.
 *
 * There are deliberately no goals. A target caps how much feels appropriate to
 * give — someone minded to give $300 hesitates at a $45 goal — and a progress
 * bar at zero reads as "nobody has given". Guests' notes carry the social proof
 * instead, and those only ever look better as more arrive.
 */

export const FUND_KEYS = {
  payLink: "fund.payLink",
  heading: "fund.heading",
  blurb: "fund.blurb",
  amounts: "fund.amounts",
} as const;

/** Largest single contribution we will record. Guards against a typo'd 500000. */
export const MAX_CONTRIBUTION_CENTS = 2_000_000; // $20,000

/** Offered when the couple hasn't set their own. */
export const DEFAULT_AMOUNTS_CENTS = [5000, 10000, 15000, 25000];

/** "$45", "$1,200", "$66.99" — cents dropped when they are zero. */
export function money(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const dollars = safe / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type AmountResult = { ok: true; cents: number } | { ok: false; error: string };

/** "45", "$45.50", " 45 " -> cents. Rejects anything that isn't real money. */
export function parseAmount(raw: string): AmountResult {
  const cleaned = (raw ?? "").replace(/[$,\s]/g, "");
  if (!cleaned) return { ok: false, error: "How much would you like to give?" };
  if (!/^\d*\.?\d*$/.test(cleaned)) return { ok: false, error: "Please enter an amount like 45 or 45.50." };

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "Please enter an amount above zero." };

  const cents = Math.round(value * 100);
  if (cents > MAX_CONTRIBUTION_CENTS) {
    return {
      ok: false,
      error: `That's wonderfully generous — please get in touch for anything over ${money(MAX_CONTRIBUTION_CENTS)}.`,
    };
  }
  return { ok: true, cents };
}

/**
 * The quick-pick buttons, from a string the couple types as "50, 100, 250".
 * Falls back to the defaults rather than leaving a guest with no shortcut.
 */
export function parseAmounts(raw: string | null | undefined): number[] {
  const parts = (raw ?? "")
    .split(/[,\s]+/)
    .map((part) => parseAmount(part))
    .filter((r): r is { ok: true; cents: number } => r.ok)
    .map((r) => r.cents);

  const unique = [...new Set(parts)].sort((a, b) => a - b).slice(0, 5);
  return unique.length > 0 ? unique : DEFAULT_AMOUNTS_CENTS;
}

/**
 * Where "Donate" sends the guest.
 *
 * A paypal.me link takes the amount as a path segment, so the guest arrives with
 * the number already filled in. Anything else — a Donate button URL, a business
 * profile — is opened untouched, because appending a segment would break it.
 * Whatever PayPal hands the couple therefore works.
 */
export function payLink(base: string | null | undefined, amountCents: number): string | null {
  const url = (base ?? "").trim();
  if (!url) return null;

  if (!/^https?:\/\/(www\.)?paypal\.me\//i.test(url)) return url;

  const cents = Math.max(0, Math.round(amountCents || 0));
  if (cents <= 0) return url;

  const dollars = cents / 100;
  const amount = dollars % 1 === 0 ? String(dollars) : dollars.toFixed(2);
  return `${url.replace(/\/+$/, "")}/${amount}`;
}

export type PublicNote = {
  id: string;
  name: string;
  message: string;
};

/**
 * The notes shown under the donate card.
 *
 * Amounts are never included: publishing them invites comparison, and someone
 * giving $25 beside a $250 should not feel it. A contribution without a message
 * is left out entirely rather than shown as a bare name, which would read as a
 * public list of who has paid.
 */
export function publicNotes(
  contributions: {
    id: string;
    message: string | null;
    noteHidden: boolean;
    givenName: string | null;
    guest: { name: string } | null;
  }[]
): PublicNote[] {
  return contributions
    .filter((c) => !c.noteHidden && (c.message ?? "").trim().length > 0)
    .map((c) => ({
      id: c.id,
      name: (c.guest?.name ?? c.givenName ?? "").trim() || "A friend",
      message: (c.message ?? "").trim(),
    }));
}
