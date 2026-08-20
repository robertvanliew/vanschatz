"use server";

import { db } from "@/lib/db";
import { parseAmount } from "@/lib/fund";
import { revalidatePath } from "next/cache";

export type GiveResult = { ok: boolean; error?: string };

/**
 * Record that a guest has sent money toward a tile.
 *
 * This is the honour system by design: PayPal tells this site nothing, so the
 * alternative to trusting the guest is not trusting them and having no bar at
 * all. The couple reconciles in admin, where each row can be confirmed or
 * removed.
 *
 * A name is required when there is no invite token — an anonymous row is one
 * the couple can never thank anyone for.
 */
export async function recordContribution(input: {
  tileId: string;
  amount: string;
  token: string | null;
  name: string;
  message: string;
}): Promise<GiveResult> {
  const parsed = parseAmount(input.amount);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const tile = await db.fundTile.findUnique({ where: { id: input.tileId } });
  if (!tile || !tile.active) return { ok: false, error: "That's no longer on the list." };

  let guestId: string | null = null;
  let givenName: string | null = null;

  if (input.token) {
    const guest = await db.guest.findUnique({ where: { token: input.token } });
    if (!guest) return { ok: false, error: "We couldn't find your invitation." };
    guestId = guest.id;
  } else {
    const name = (input.name ?? "").trim();
    if (name.length < 2) return { ok: false, error: "Please add your name so we can thank you." };
    givenName = name;
  }

  await db.contribution.create({
    data: {
      tileId: tile.id,
      guestId,
      givenName,
      amountCents: parsed.cents,
      message: (input.message ?? "").trim() || null,
    },
  });

  revalidatePath("/registry");
  if (input.token) revalidatePath(`/invite/${input.token}/registry`);
  revalidatePath("/admin");
  return { ok: true };
}
