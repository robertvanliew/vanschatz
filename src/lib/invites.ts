import { WEDDING, daysUntil, mapsDirUrl } from "@/lib/wedding";
import { db } from "@/lib/db";
import { sendMessage } from "@/lib/messaging";
import {
  weddingEmailHtml,
  weddingUpdateHtml,
  weddingUpdateText,
  type WeddingUpdateDetails,
} from "@/lib/email-template";
import {
  countdownLabel,
  planAnnouncement,
  UPDATE_KEY,
  type AnnouncementGuest,
} from "@/lib/registry-email";
import { FUND_KEYS } from "@/lib/fund";

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

/* ------------------------------------------------------- wedding update */

const COUPLE_EMAIL = process.env.COUPLE_EMAIL ?? "robvanliew@gmail.com";

/** The parts of the update that are the same for every guest, worked out at send time. */
async function updateDetails(now: Date = new Date()): Promise<WeddingUpdateDetails> {
  const [recentGift, fundLink] = await Promise.all([
    db.gift.findFirst({
      where: { active: true, createdAt: { gt: new Date(now.getTime() - 21 * 86_400_000) } },
    }),
    db.setting.findUnique({ where: { key: FUND_KEYS.payLink } }),
  ]);
  return {
    heading: countdownLabel(daysUntil(now)),
    dateLabel: WEDDING.dateLabel,
    timeLabel: WEDDING.timeLabel,
    scheduleLabel: WEDDING.scheduleLabel,
    venueName: WEDDING.venueName,
    venueAddress: WEDDING.venueAddress,
    directionsUrl: mapsDirUrl(),
    newGifts: Boolean(recentGift),
    fundLive: Boolean(fundLink?.value.trim()),
  };
}

const updateSubject = (heading: string) => `${heading} \u2014 Julie & Robert's wedding`;

/**
 * Send the couple both versions of the update, to their own address only.
 *
 * Deliberately never addressed to a guest: a test that could reach a guest is
 * not a test. The links inside are the couple's own invitation, so every button
 * in the test works without acting on anyone else's behalf.
 */
export async function sendWeddingUpdateTest(): Promise<{ ok: boolean; reason?: string }> {
  const self = await db.guest.findFirst({
    where: { email: { equals: COUPLE_EMAIL, mode: "insensitive" } },
  });
  if (!self) return { ok: false, reason: `No guest on the list has the email ${COUPLE_EMAIL}.` };

  const details = await updateDetails();
  const versions = [
    { label: "as a guest who hasn't replied", nudgeRsvp: true, partySize: null },
    { label: "as an attending guest", nudgeRsvp: false, partySize: self.partySize || 2 },
  ];
  for (const v of versions) {
    const args = { name: self.name, token: self.token, nudgeRsvp: v.nudgeRsvp, partySize: v.partySize, details };
    await sendMessage(
      "email",
      COUPLE_EMAIL,
      weddingUpdateText(args),
      `[TEST \u2014 ${v.label}] ${updateSubject(details.heading)}`,
      weddingUpdateHtml(args)
    );
  }
  return { ok: true };
}

/**
 * Send the update to everyone who should get it.
 *
 * Who that is lives in planAnnouncement and is unit-tested, so this only sends.
 * Each success is logged as it happens, so a failure part way through never
 * re-emails anyone already reached.
 */
export async function sendWeddingUpdate(): Promise<{ sent: number; skipped: number; failed: number }> {
  const guests = await db.guest.findMany({ include: { reminders: true } });
  const { sends, skipped } = planAnnouncement(guests as unknown as AnnouncementGuest[]);
  const byId = new Map(guests.map((g) => [g.id, g]));
  const details = await updateDetails();
  let sent = 0;
  let failed = 0;

  for (const plan of sends) {
    const g = byId.get(plan.guestId);
    if (!g) continue;
    // Stay under the provider's 10-a-second limit instead of leaning on retries.
    if (sent + failed > 0) await new Promise((resolve) => setTimeout(resolve, 150));
    const args = { name: g.name, token: g.token, nudgeRsvp: plan.nudgeRsvp, partySize: plan.partySize, details };
    try {
      const { simulated } = await sendMessage(
        "email",
        plan.to,
        weddingUpdateText(args),
        updateSubject(details.heading),
        weddingUpdateHtml(args)
      );
      await db.reminderLog.upsert({
        where: { guestId_scheduleKey_channel: { guestId: g.id, scheduleKey: UPDATE_KEY, channel: "email" } },
        create: { guestId: g.id, scheduleKey: UPDATE_KEY, channel: "email", simulated },
        update: { simulated, sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      failed++;
      console.error(`wedding update failed for guest ${g.id}:`, err);
    }
  }

  return { sent, skipped: skipped.length, failed };
}
