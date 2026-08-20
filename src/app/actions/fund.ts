"use server";

import { db } from "@/lib/db";
import { parseAmount } from "@/lib/fund";
import { revalidatePath } from "next/cache";

export type GiveResult = { ok: boolean; error?: string };

/**
 * Record that someone has sent money toward the honeymoon.
 *
 * Honour system by design: PayPal tells this site nothing, so the alternative to
 * trusting the guest is having no record at all. The couple reconciles on
 * /admin, where each row can be confirmed, hidden or removed.
 *
 * A name is required without an invite token — an anonymous row is one the
 * couple can never thank anyone for.
 */
export async function recordContribution(input: {
  amount: string;
  token: string | null;
  name: string;
  message: string;
}): Promise<GiveResult> {
  const parsed = parseAmount(input.amount);
  if (!parsed.ok) return { ok: false, error: parsed.error };

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
      guestId,
      givenName,
      amountCents: parsed.cents,
      // Trimmed and capped: this is shown publicly under the donate card.
      message: (input.message ?? "").trim().slice(0, 400) || null,
    },
  });

  revalidatePath("/registry");
  if (input.token) revalidatePath(`/invite/${input.token}/registry`);
  revalidatePath("/admin");
  return { ok: true };
}
