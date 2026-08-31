import { WEDDING } from "@/lib/wedding";
import { db } from "@/lib/db";
import { sendMessage } from "@/lib/messaging";
import { registryEmailHtml, weddingEmailHtml } from "@/lib/email-template";
import {
  planAnnouncement,
  REGISTRY_KEY,
  type AnnouncementGuest,
} from "@/lib/registry-email";

const INVITE_KEY = "invite";
const INVITE_SUBJECT = "You're invited — Julie & Robert's wedding";
const INVITE_INTRO = "We're getting married, and we'd be honored to have you celebrate with us.";

function baseUrl(): string {
  // Prefer an explicit env override; otherwise the production domain so email
  // links never point at localhost.
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://thevanschatz.com";
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
    INVITE_SUBJECT,
    weddingEmailHtml({ name: guest.name, token: guest.token, intro: INVITE_INTRO })
  );

  // Mark as invited (upsert so re-sends just refresh the timestamp).
  await db.reminderLog.upsert({
    where: claimWhere(guest.id),
    create: { guestId: guest.id, scheduleKey: INVITE_KEY, channel: "email", simulated },
    update: { simulated, sentAt: new Date() },
  });
  return { ok: true };
}

/**
 * Email every guest who has an address and hasn't had a *real* invite sent yet.
 * A simulated send (practice mode, before Resend keys exist) does NOT count as
 * done, so testing the button now won't block the real send later.
 */
export async function sendAllInvites(): Promise<{ sent: number; skipped: number }> {
  const guests = await db.guest.findMany({ include: { reminders: true } });
  let sent = 0;
  let skipped = 0;

  for (const g of guests) {
    if (!g.email) {
      skipped++;
      continue;
    }
    const reallyInvited = g.reminders.some(
      (r) => r.scheduleKey === INVITE_KEY && r.channel === "email" && !r.simulated
    );
    if (reallyInvited) {
      skipped++;
      continue;
    }
    try {
      const { simulated } = await sendMessage(
        "email",
        g.email,
        inviteBody(g.name, g.token),
        INVITE_SUBJECT,
        weddingEmailHtml({ name: g.name, token: g.token, intro: INVITE_INTRO })
      );
      // upsert so the fixed (guest, invite, email) row can't collide, and a
      // later real send can overwrite an earlier simulated one.
      await db.reminderLog.upsert({
        where: claimWhere(g.id),
        create: { guestId: g.id, scheduleKey: INVITE_KEY, channel: "email", simulated },
        update: { simulated, sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send invite to guest ${g.id}:`, err);
    }
  }
  return { sent, skipped };
}

/* ------------------------------------------------- registry announcement */

const REGISTRY_SUBJECT = "Our gift registry is up — Julie & Robert";

function registryBody(name: string, token: string, nudgeRsvp: boolean): string {
  const registry = `${baseUrl()}/invite/${token}/registry`;
  return (
    `Hi ${name}! We've put together a small gift registry — and a honeymoon fund, ` +
    `if you'd rather help with the trip. Have a look: ${registry}` +
    (nudgeRsvp
      ? `\n\nWe also haven't heard from you yet — could you let us know if you can make it? ` +
        `${baseUrl()}/invite/${token}`
      : "")
  );
}

/**
 * Email one guest the registry announcement, ignoring send-once protection.
 * Used for the couple's own test send, which must work however many times they
 * click it.
 */
export async function sendRegistryTest(guestId: string): Promise<{ ok: boolean; reason?: string }> {
  const guest = await db.guest.findUnique({ where: { id: guestId } });
  if (!guest) return { ok: false, reason: "not found" };
  if (!guest.email) return { ok: false, reason: "no email on file" };

  const nudge = guest.rsvpStatus === "PENDING";
  await sendMessage(
    "email",
    guest.email,
    registryBody(guest.name, guest.token, nudge),
    `[TEST] ${REGISTRY_SUBJECT}`,
    registryEmailHtml({ name: guest.name, token: guest.token, nudgeRsvp: nudge })
  );
  return { ok: true };
}

/**
 * Send the announcement to everyone who should get it.
 *
 * Who that is lives in planAnnouncement and is unit-tested, so this function
 * only does the sending. Each success is logged immediately, so a failure part
 * way through never re-emails the people already reached.
 */
export async function sendRegistryAnnouncement(): Promise<{ sent: number; skipped: number }> {
  const guests = await db.guest.findMany({ include: { reminders: true } });
  const { sends, skipped } = planAnnouncement(guests as unknown as AnnouncementGuest[]);
  const byId = new Map(guests.map((g) => [g.id, g]));
  let sent = 0;

  for (const plan of sends) {
    const g = byId.get(plan.guestId);
    if (!g) continue;
    try {
      const { simulated } = await sendMessage(
        "email",
        plan.to,
        registryBody(g.name, g.token, plan.nudgeRsvp),
        REGISTRY_SUBJECT,
        registryEmailHtml({ name: g.name, token: g.token, nudgeRsvp: plan.nudgeRsvp })
      );
      await db.reminderLog.upsert({
        where: {
          guestId_scheduleKey_channel: {
            guestId: g.id,
            scheduleKey: REGISTRY_KEY,
            channel: "email",
          },
        },
        create: { guestId: g.id, scheduleKey: REGISTRY_KEY, channel: "email", simulated },
        update: { simulated, sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`registry announcement failed for guest ${g.id}:`, err);
    }
  }

  return { sent, skipped: skipped.length };
}
