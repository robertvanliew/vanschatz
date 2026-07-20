"use server";

import { db } from "@/lib/db";
import { validateRsvp } from "@/lib/rsvp";
import { revalidatePath } from "next/cache";

export async function submitRsvp(
  token: string,
  input: { attending: boolean; partySize: number }
): Promise<{ ok: boolean; error?: string }> {
  const result = validateRsvp(input);
  if (!result.ok) return { ok: false, error: result.error };

  const guest = await db.guest.findUnique({ where: { token } });
  if (!guest) return { ok: false, error: "Invitation not found." };

  await db.guest.update({
    where: { token },
    data: {
      rsvpStatus: result.status,
      partySize: result.partySize,
      respondedAt: new Date(),
    },
  });
  revalidatePath(`/invite/${token}`);
  return { ok: true };
}
