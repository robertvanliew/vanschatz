import { db } from "@/lib/db";
import { readSettings } from "@/lib/settings";
import { FUND_KEYS, parseAmounts, publicNotes, type PublicNote } from "@/lib/fund";

export type FundView = {
  /** The couple's PayPal link. The section is hidden entirely without one. */
  payLink: string;
  heading: string;
  blurb: string | null;
  amounts: number[];
  notes: PublicNote[];
};

/**
 * The fund as the registry page needs it.
 *
 * Amounts given are never included — the page shows notes, not numbers. The
 * running total lives on /admin only.
 */
export async function readFund(): Promise<FundView | null> {
  const settings = await readSettings();
  const payLink = (settings[FUND_KEYS.payLink] ?? "").trim();
  if (!payLink) return null;

  const contributions = await db.contribution.findMany({
    where: { noteHidden: false, message: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      message: true,
      noteHidden: true,
      givenName: true,
      guest: { select: { name: true } },
    },
  });

  return {
    payLink,
    heading: (settings[FUND_KEYS.heading] ?? "").trim() || "The honeymoon",
    blurb:
      (settings[FUND_KEYS.blurb] ?? "").trim() ||
      "We're not expecting anything — but if you'd like to help us celebrate, this goes straight to the trip.",
    amounts: parseAmounts(settings[FUND_KEYS.amounts]),
    notes: publicNotes(contributions),
  };
}
