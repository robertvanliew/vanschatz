"use server";

import { db } from "@/lib/db";
import { sendMessage } from "@/lib/messaging";
import { makeToken } from "@/lib/tokens";
import { findGuestMatch } from "@/lib/rsvp-matching";
import { revalidatePath } from "next/cache";

const COUPLE_EMAIL = process.env.COUPLE_EMAIL ?? "robvanliew@gmail.com";

export type EmailRsvpInput = {
  name: string;
  email: string;
  attending: boolean;
  adults: number;
  children: number;
  message: string;
};

/**
 * RSVP from someone without a personal link — in practice, anyone who scanned
 * the QR on a printed invitation.
 *
 * This used to only email the couple, which meant those replies never reached
 * the guest list and were missing from every count. The reply is now recorded
 * against the matching guest, or as a new one marked "website" if nobody
 * matches, and the email is still sent so nothing is lost if the match is wrong.
 */
export async function submitEmailRsvp(
  input: EmailRsvpInput
): Promise<{ ok: boolean; error?: string }> {
  const name = (input.name ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Please add your name." };

  const email = (input.email ?? "").trim();
  const adults = Math.min(20, Math.max(0, Math.floor(input.adults || 0)));
  const children = Math.min(20, Math.max(0, Math.floor(input.children || 0)));
  const status = input.attending ? "YES" : "NO";

  let recorded: "matched" | "added" | "failed" = "failed";
  let guestName = name;

  try {
    const guests = await db.guest.findMany({ select: { id: true, name: true, email: true } });
    const match = findGuestMatch(guests, { name, email });

    if (match) {
      await db.guest.update({
        where: { id: match.id },
        data: {
          rsvpStatus: status,
          adults: input.attending ? adults : 0,
          children: input.attending ? children : 0,
          partySize: input.attending ? adults + children : 0,
          respondedAt: new Date(),
          // Fill in an address we didn't have; never overwrite one we did.
          ...(email && !match.email ? { email } : {}),
        },
      });
      recorded = "matched";
      guestName = match.name;
    } else {
      await db.guest.create({
        data: {
          name,
          email: email || null,
          token: makeToken(),
          rsvpStatus: status,
          adults: input.attending ? adults : 0,
          children: input.attending ? children : 0,
          partySize: input.attending ? adults + children : 0,
          respondedAt: new Date(),
          source: "website",
        },
      });
      recorded = "added";
    }
    revalidatePath("/admin");
  } catch (e) {
    // A failure to record must not lose the RSVP — the email below still goes.
    console.error("recording website RSVP failed:", e);
  }

  const lines = [
    "RSVP submitted from the website form (no personal link).",
    recorded === "matched"
      ? `Recorded against ${guestName} on the guest list.`
      : recorded === "added"
        ? "No match on the guest list — added as a new guest, marked 'website'."
        : "COULD NOT be recorded on the guest list — please add it by hand.",
    "",
    `Name: ${name}`,
    `Attending: ${input.attending ? "Yes 🎉" : "No"}`,
    input.attending ? `Party: ${adults} adult(s), ${children} child(ren)` : "",
    email ? `Reply to: ${email}` : "",
    input.message?.trim() ? `Message: ${input.message.trim()}` : "",
  ].filter((l) => l !== "");

  try {
    await sendMessage(
      "email",
      COUPLE_EMAIL,
      lines.join("\n"),
      `RSVP: ${name} — ${input.attending ? "Yes" : "No"}`
    );
  } catch (e) {
    console.error("email RSVP notification failed:", e);
    // The RSVP is safely on the guest list; a failed notification is not a
    // failure the guest should be asked to retry.
    if (recorded === "failed") {
      return { ok: false, error: "Sorry — something went wrong. Please try again." };
    }
  }

  return { ok: true };
}
