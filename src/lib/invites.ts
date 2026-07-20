import { Prisma } from "@prisma/client";
import { WEDDING } from "@/lib/wedding";
import { db } from "@/lib/db";
import { sendMessage } from "@/lib/messaging";

const INVITE_KEY = "invite";
const INVITE_SUBJECT = "You're invited — Julie & Robert's wedding";

function baseUrl(): string {
  // Must be set in production (e.g. https://thevanschatz.com) so email links
  // don't point at localhost.
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

export function inviteBody(name: string, token: string): string {
  return (
    `Hi ${name}! Julie & Robert are getting married on ${WEDDING.dateLabel} ` +
    `at ${WEDDING.venueName}, Newburgh, NY — and you're invited. ` +
    `Please RSVP with your personal link (let us know how many adults & children): ` +
    `${baseUrl()}/invite/${token}`
  );
}

const claimWhere = (guestId: string) => ({
  guestId_scheduleKey_channel: { guestId, scheduleKey: INVITE_KEY, channel: "email" },
});

/** Email one guest their invite. Re-sendable; records that they've been invited. */
export async function sendInviteToGuest(
  guestId: string
): Promise<{ ok: boolean; reason?: string }> {
  const guest = await db.guest.findUnique({ where: { id: guestId } });
  if (!guest) return { ok: false, reason: "not found" };
  if (!guest.email) return { ok: false, reason: "no email on file" };

  const { simulated } = await sendMessage(
    "email",
    guest.email,
    inviteBody(guest.name, guest.token),
    INVITE_SUBJECT
  );

  // Mark as invited (upsert so re-sends just refresh the timestamp).
  await db.reminderLog.upsert({
    where: claimWhere(guest.id),
    create: { guestId: guest.id, scheduleKey: INVITE_KEY, channel: "email", simulated },
    update: { simulated, sentAt: new Date() },
  });
  return { ok: true };
}

/** Email every guest who has an address and hasn't been invited yet. */
export async function sendAllInvites(): Promise<{ sent: number; skipped: number }> {
  const guests = await db.guest.findMany({ include: { reminders: true } });
  let sent = 0;
  let skipped = 0;

  for (const g of guests) {
    if (!g.email) {
      skipped++;
      continue;
    }
    if (g.reminders.some((r) => r.scheduleKey === INVITE_KEY && r.channel === "email")) {
      skipped++;
      continue;
    }
    // Claim first so overlapping runs can't double-send the same guest.
    try {
      await db.reminderLog.create({
        data: { guestId: g.id, scheduleKey: INVITE_KEY, channel: "email", simulated: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        skipped++;
        continue;
      }
      throw e;
    }
    try {
      const { simulated } = await sendMessage(
        "email",
        g.email,
        inviteBody(g.name, g.token),
        INVITE_SUBJECT
      );
      if (!simulated) {
        await db.reminderLog.update({ where: claimWhere(g.id), data: { simulated: false } });
      }
      sent++;
    } catch (err) {
      // Release the claim so it can be retried later.
      console.error(`Failed to send invite to guest ${g.id}:`, err);
      await db.reminderLog.delete({ where: claimWhere(g.id) }).catch(() => {});
    }
  }
  return { sent, skipped };
}
