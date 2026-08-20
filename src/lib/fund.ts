/**
 * The honeymoon fund: named pieces of the trip guests can put money toward.
 *
 * No money moves through this site. Guests are sent to PayPal and then say they
 * have sent it, exactly as they say they have bought a gift. These functions
 * hold the arithmetic and the link building so both can be tested without a
 * database or a browser.
 */

export const FUND_KEYS = {
  payLink: "fund.payLink",
  heading: "fund.heading",
  blurb: "fund.blurb",
} as const;

/** Largest single contribution we will record. Guards against a typo'd 500000. */
export const MAX_CONTRIBUTION_CENTS = 2_000_000; // $20,000

export type TileView = {
  id: string;
  slug: string;
  title: string;
  note: string | null;
  targetCents: number;
  suggested: number[];
  raisedCents: number;
};

/** "$45", "$1,200", "$66.99" — cents dropped when they are zero. */
export function money(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const dollars = safe / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type Progress = {
  raisedCents: number;
  targetCents: number;
  /** 0–100, clamped. A tile past its target reads 100, never 140. */
  percent: number;
  fullyFunded: boolean;
};

export function progress(raisedCents: number, targetCents: number): Progress {
  const raised = Math.max(0, Math.round(raisedCents || 0));
  const target = Math.max(0, Math.round(targetCents || 0));
  // A target of zero would divide by zero; treat it as already met.
  const percent = target <= 0 ? 100 : Math.min(100, Math.round((raised / target) * 100));
  return { raisedCents: raised, targetCents: target, percent, fullyFunded: target > 0 && raised >= target };
}

/** The whole trip's progress: every tile added together. */
export function fundTotals(tiles: Pick<TileView, "raisedCents" | "targetCents">[]): Progress {
  return progress(
    tiles.reduce((sum, t) => sum + (t.raisedCents || 0), 0),
    tiles.reduce((sum, t) => sum + (t.targetCents || 0), 0)
  );
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
    return { ok: false, error: `That's wonderfully generous — please get in touch for anything over ${money(MAX_CONTRIBUTION_CENTS)}.` };
  }
  return { ok: true, cents };
}

/**
 * Where "Give this" sends the guest.
 *
 * A paypal.me link takes the amount as a path segment, so the guest arrives with
 * the number already filled in. Anything else — a Donate button URL, a business
 * profile — is opened untouched, because appending a segment to it would break
 * it. Whatever PayPal hands the couple therefore works.
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
