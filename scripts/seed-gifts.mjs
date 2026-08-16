/**
 * Load the registry into the database from scripts/gifts-data.mjs.
 *
 * Idempotent: gifts are matched on slug, so re-running updates the catalogue
 * rather than duplicating it. Claims are never touched — re-seeding after
 * guests have started claiming is safe.
 *
 * An image is attached only when the file actually exists in public/registry/,
 * so a gift whose picture hasn't been supplied yet falls back to the
 * placeholder tile instead of pointing at a 404.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { GIFTS } from "./gifts-data.mjs";

const db = new PrismaClient();

const imageFor = (slug) =>
  fs.existsSync(path.join("public", "registry", `${slug}.jpg`)) ? `/registry/${slug}.jpg` : null;

let created = 0, updated = 0, withoutImage = 0;

for (const [i, gift] of GIFTS.entries()) {
  const image = imageFor(gift.slug);
  if (!image) withoutImage++;

  const data = {
    title: gift.title,
    note: gift.note ?? null,
    retailer: gift.retailer,
    url: gift.url,
    image,
    priceCents: gift.priceCents ?? null,
    sortOrder: i,
    active: true,
  };

  const existing = await db.gift.findUnique({ where: { slug: gift.slug } });
  if (existing) {
    // Don't clobber a price typed into the admin page with a null from here.
    const { priceCents, ...rest } = data;
    await db.gift.update({
      where: { slug: gift.slug },
      data: priceCents == null ? rest : data,
    });
    updated++;
  } else {
    await db.gift.create({ data: { slug: gift.slug, ...data } });
    created++;
  }
}

const claims = await db.giftClaim.count();
console.log(`${created} created, ${updated} updated, ${claims} existing claims untouched`);
if (withoutImage) {
  console.log(`${withoutImage} gifts have no image yet — run scripts/fetch-gift-images.mjs to see which`);
}

await db.$disconnect();
