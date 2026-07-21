"use server";

import { sendMessage } from "@/lib/messaging";

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
 * Email RSVP fallback: a guest who doesn't have (or didn't use) their personal
 * link fills in a small form; we email the details straight to the couple.
 */
export async function submitEmailRsvp(
  input: EmailRsvpInput
): Promise<{ ok: boolean; error?: string }> {
  const name = (input.name ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Please add your name." };

  const adults = Math.min(20, Math.max(0, Math.floor(input.adults || 0)));
  const children = Math.min(20, Math.max(0, Math.floor(input.children || 0)));

  const lines = [
    "RSVP submitted from the website email form.",
    "",
    `Name: ${name}`,
    `Attending: ${input.attending ? "Yes 🎉" : "No"}`,
    input.attending ? `Party: ${adults} adult(s), ${children} child(ren)` : "",
    input.email?.trim() ? `Reply to: ${input.email.trim()}` : "",
    input.message?.trim() ? `Message: ${input.message.trim()}` : "",
  ].filter((l) => l !== "");

  try {
    await sendMessage(
      "email",
      COUPLE_EMAIL,
      lines.join("\n"),
      `RSVP: ${name} — ${input.attending ? "Yes" : "No"}`
    );
    return { ok: true };
  } catch (e) {
    console.error("email RSVP failed:", e);
    return { ok: false, error: "Sorry — something went wrong. Please try again." };
  }
}
