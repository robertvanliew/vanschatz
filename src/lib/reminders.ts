import { daysUntil, WEDDING } from "@/lib/wedding";
import { db } from "@/lib/db";
import { sendMessage, type Channel } from "@/lib/messaging";

export type ScheduleKey = "1month" | "1week" | "3days";

export function getScheduleKey(now: Date): ScheduleKey | null {
  const days = daysUntil(now);
  if (days === 30) return "1month";
  if (days === 7) return "1week";
  if (days === 3) return "3days";
  return null;
}

export type ReminderGuest = {
  id: string;
  rsvpStatus: string;
  email: string | null;
  phone: string | null;
  reminders: { scheduleKey: string; channel: string }[];
};

export type PlannedSend = { guestId: string; channel: Channel; to: string };

/** PENDING guests only; one send per available channel not already logged for this key. */
export function eligibleSends(guests: ReminderGuest[], scheduleKey: string): PlannedSend[] {
  const sends: PlannedSend[] = [];
  for (const g of guests) {
    if (g.rsvpStatus !== "PENDING") continue;
    const done = new Set(
      g.reminders.filter((r) => r.scheduleKey === scheduleKey).map((r) => r.channel)
    );
    if (g.email && !done.has("email")) sends.push({ guestId: g.id, channel: "email", to: g.email });
    if (g.phone && !done.has("sms")) sends.push({ guestId: g.id, channel: "sms", to: g.phone });
  }
  return sends;
}

function reminderBody(guestName: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return (
    `Hi ${guestName}! A gentle reminder to RSVP for Julie & Robert's wedding on ` +
    `${WEDDING.dateLabel} at ${WEDDING.venueName}. Tap your personal link: ${base}/invite/${token}`
  );
}

async function executeSends(scheduleKey: string): Promise<number> {
  const guests = await db.guest.findMany({ include: { reminders: true } });
  const planned = eligibleSends(guests, scheduleKey);
  const byId = new Map(guests.map((g) => [g.id, g]));
  let sent = 0;
  for (const p of planned) {
    const guest = byId.get(p.guestId)!;
    const { simulated } = await sendMessage(p.channel, p.to, reminderBody(guest.name, guest.token));
    await db.reminderLog.create({
      data: { guestId: p.guestId, scheduleKey, channel: p.channel, simulated },
    });
    sent++;
  }
  return sent;
}

export async function runScheduledReminders(now: Date) {
  const scheduleKey = getScheduleKey(now);
  if (!scheduleKey) return { scheduleKey: null, sent: 0 };
  return { scheduleKey, sent: await executeSends(scheduleKey) };
}

export async function runManualReminders(now: Date) {
  const scheduleKey = `manual-${now.toISOString()}`;
  return { scheduleKey, sent: await executeSends(scheduleKey) };
}
