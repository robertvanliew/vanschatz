import { db } from "@/lib/db";
import { toShipping, type Shipping } from "@/lib/shipping";

/** Every setting as a plain object. There are only a handful, so one query. */
export async function readSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/**
 * The shipping address, or null if the couple hasn't filled it in yet.
 *
 * Callers must pass this through `visibleShipping` before it reaches a page —
 * this function does no permission checking of its own.
 */
export async function readShipping(): Promise<Shipping | null> {
  return toShipping(await readSettings());
}

/** Upsert a batch of settings. An empty value clears the setting. */
export async function writeSettings(values: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(values).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
}
