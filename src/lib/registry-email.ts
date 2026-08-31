/**
 * The registry announcement: one email telling everyone the registry is up, with
 * an RSVP nudge added only for guests who haven't replied.
 *
 * One email rather than two, and personalised rather than generic — nudging
 * someone who already said yes is irritating, and sending the 17 non-responders
 * a separate chase would mean two emails landing together.
 *
 * The decision of who receives it is kept here, as a pure function, so it can be
 * checked without sending anything to 28 real people.
 */

export const REGISTRY_KEY = "registry-announcement";

export type AnnouncementGuest = {
  id: string;
  name: string;
  email: string | null;
  rsvpStatus: string;
  reminders: { scheduleKey: string; channel: string; simulated: boolean }[];
};

export type PlannedAnnouncement = {
  guestId: string;
  to: string;
  /** True when this guest still hasn't replied and should get the nudge. */
  nudgeRsvp: boolean;
};

export type SkipReason = "declined" | "no-email" | "already-sent";

/**
 * Who gets the announcement, and who is skipped and why.
 *
 * Anyone who declined is left out: mailing a gift registry to someone who has
 * said they cannot come reads as asking a favour of a person who already
 * apologised. A simulated send does not count as sent, so testing in practice
 * mode never blocks the real send later.
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
      (r) => r.scheduleKey === REGISTRY_KEY && r.channel === "email" && !r.simulated
    );
    if (alreadySent) {
      skipped.push({ guestId: g.id, name: g.name, reason: "already-sent" });
      continue;
    }
    sends.push({ guestId: g.id, to: g.email, nudgeRsvp: g.rsvpStatus === "PENDING" });
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
