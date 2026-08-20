/**
 * Seed the honeymoon fund with generic pieces of a trip.
 *
 * These are placeholders on purpose — the destination isn't decided, and a tile
 * named "an excursion" is easier to rename in admin than to invent from nothing.
 * Idempotent: matched on slug, so re-running updates wording rather than adding
 * duplicates, and contributions are never touched.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const TILES = [
  {
    slug: "a-nights-stay",
    title: "A night's stay",
    note: "One night of somewhere lovely",
    targetCents: 18000,
    suggested: [3000, 6000, 9000],
  },
  {
    slug: "dinner-for-two",
    title: "Dinner for two",
    note: "Somewhere we'd never normally book",
    targetCents: 9000,
    suggested: [2500, 4500, 9000],
  },
  {
    slug: "an-excursion",
    title: "An excursion",
    note: "A day out — boat, hike, whatever we find",
    targetCents: 4500,
    suggested: [1500, 2500, 4500],
  },
  {
    slug: "getting-there",
    title: "Getting there",
    note: "Transfers, trains, the unglamorous bits",
    targetCents: 6000,
    suggested: [2000, 3000, 6000],
  },
  {
    slug: "a-bottle-of-something",
    title: "A bottle of something",
    note: "To toast you with, from wherever we are",
    targetCents: 3500,
    suggested: [1000, 2000, 3500],
  },
];

let created = 0;
let updated = 0;

for (const [i, tile] of TILES.entries()) {
  const data = { ...tile, sortOrder: i, active: true };
  const existing = await db.fundTile.findUnique({ where: { slug: tile.slug } });
  if (existing) {
    await db.fundTile.update({ where: { slug: tile.slug }, data });
    updated++;
  } else {
    await db.fundTile.create({ data });
    created++;
  }
}

const contributions = await db.contribution.count();
console.log(`${created} created, ${updated} updated, ${contributions} contributions untouched`);
console.log("\nRename and re-price these in /admin once the destination is settled.");
console.log("The fund stays hidden from the site until a PayPal link is saved there.");

await db.$disconnect();
