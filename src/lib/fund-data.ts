import { db } from "@/lib/db";
import { readSettings } from "@/lib/settings";
import { FUND_KEYS, type TileView } from "@/lib/fund";

export type FundView = {
  tiles: TileView[];
  /** The couple's PayPal link, or null when they haven't added one yet. */
  payLink: string | null;
  heading: string;
  blurb: string | null;
};

/**
 * The fund as the registry page needs it.
 *
 * Contributions are summed here rather than counted in the browser, so the bar
 * reflects the database rather than whatever a page happened to load with.
 * Individual contributors are never exposed — a guest sees how full the bar is,
 * not who filled it.
 */
export async function readFund(): Promise<FundView | null> {
  const [tiles, settings] = await Promise.all([
    db.fundTile.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { contributions: { select: { amountCents: true } } },
    }),
    readSettings(),
  ]);

  const payLink = (settings[FUND_KEYS.payLink] ?? "").trim() || null;

  // Nothing to show until the couple has both tiles and somewhere to send money.
  if (tiles.length === 0 || !payLink) return null;

  return {
    payLink,
    heading: (settings[FUND_KEYS.heading] ?? "").trim() || "The honeymoon",
    blurb:
      (settings[FUND_KEYS.blurb] ?? "").trim() ||
      "If you'd rather help us with the trip than post a parcel, here are the bits we're saving for.",
    tiles: tiles.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      note: t.note,
      targetCents: t.targetCents,
      suggested: t.suggested,
      raisedCents: t.contributions.reduce((sum, c) => sum + c.amountCents, 0),
    })),
  };
}
