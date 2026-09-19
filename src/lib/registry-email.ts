/**
 * The wedding update: one email to every guest who hasn't declined, reminding
 * them of the day and pointing them at the registry.
 *
 * One email, three versions. Everyone gets the details and the registry; guests
 * who haven't replied also get a short RSVP line; guests who said yes are told
 * the headcount we have for them, so a mistake can be caught before the day.
 *
 * This replaced a registry-only announcement that was never sent. Anyone who had
 * received either counts as already done, so nobody is emailed twice.
 *
 * The decision of who receives it is kept here, as a pure function, so it can be
 * checked without sending anything to real people.
 */

/** The earlier, registry-only announcement. Kept so a send of it still counts. */
export const REGISTRY_KEY = "registry-announcement";
/** This campaign. */
export const UPDATE_KEY = "wedding-update-2026-09";
const DONE_KEYS = [REGISTRY_KEY, UPDATE_KEY];

export type AnnouncementGuest = {
  id: string;
  name: string;
  email: string | null;
  rsvpStatus: string;
  partySize?: number;
  reminders: { scheduleKey: string; channel: string; simulated: boolean }[];
};

export type PlannedAnnouncement = {
  guestId: string;
  to: string;
  /** True when this guest still hasn't replied and should get the nudge. */
  nudgeRsvp: boolean;
  /** Headcount we have for a guest who said yes, so they can correct it. */
  partySize: number | null;
};

export type SkipReason = "declined" | "no-email" | "already-sent";

/**
 * Who gets the update, and who is skipped and why.
 *
 * Anyone who declined is left out: "see you on the 17th" to someone who has said
 * they can't come reads badly. A simulated send does not count as sent, so
 * testing in practice mode never blocks the real send later.
 */
export function planAnnouncement(guests: AnnouncementGuest[]): {
  sends: PlannedAnnouncement[];
  skipped: { guestId: string; name: string; reason: SkipReason }[];
} {
  const sends: PlannedAnnouncement[] = [];
  const skipped: { guestId: string; name: string; reason: SkipReason }[] = [];

  for (const g of guests) {
    if (g.rsvpStatus === "NO") {
      skipped.push({ guestId: g.id, name: g.name, reason: "declined" });
      continue;
    }
    if (!g.email) {
      skipped.push({ guestId: g.id, name: g.name, reason: "no-email" });
      continue;
    }
    const alreadySent = g.reminders.some(
      (r) => DONE_KEYS.includes(r.scheduleKey) && r.channel === "email" && !r.simulated
    );
    if (alreadySent) {
      skipped.push({ guestId: g.id, name: g.name, reason: "already-sent" });
      continue;
    }
    sends.push({
      guestId: g.id,
      to: g.email,
      nudgeRsvp: g.rsvpStatus === "PENDING",
      partySize: g.rsvpStatus === "YES" && g.partySize ? g.partySize : null,
    });
  }

  return { sends, skipped };
}

/** Counts for the admin panel, so the couple sees the size of the send first. */
export function announcementSummary(guests: AnnouncementGuest[]): {
  total: number;
  withNudge: number;
  registryOnly: number;
  skipped: number;
} {
  const { sends, skipped } = planAnnouncement(guests);
  return {
    total: sends.length,
    withNudge: sends.filter((s) => s.nudgeRsvp).length,
    registryOnly: sends.filter((s) => !s.nudgeRsvp).length,
    skipped: skipped.length,
  };
}

/**
 * "Four weeks to go", "Ten days to go", "Tomorrow" — worked out when the email
 * is sent, not written into it, so a later resend never lies about the date.
 */
export function countdownLabel(days: number): string {
  const words = [
    "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen",
  ];
  const say = (n: number) => words[n] ?? String(n);
  if (days < 0) return "Thank you";
  if (days === 0) return "Today's the day";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `${say(days)} days to go`;
  const weeks = Math.round(days / 7);
  return `${say(weeks)} weeks to go`;
}
