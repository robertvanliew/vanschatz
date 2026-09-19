import { describe, expect, test } from "vitest";
import {
  announcementSummary,
  countdownLabel,
  planAnnouncement,
  REGISTRY_KEY,
  UPDATE_KEY,
  type AnnouncementGuest,
} from "@/lib/registry-email";

const guest = (over: Partial<AnnouncementGuest> & { id: string }): AnnouncementGuest => ({
  name: "Guest",
  email: "g@example.com",
  rsvpStatus: "PENDING",
  reminders: [],
  ...over,
});

const sentAlready = [{ scheduleKey: REGISTRY_KEY, channel: "email", simulated: false }];
const sentInPractice = [{ scheduleKey: REGISTRY_KEY, channel: "email", simulated: true }];

describe("planAnnouncement", () => {
  test("a guest who hasn't replied gets the RSVP nudge", () => {
    const { sends } = planAnnouncement([guest({ id: "1", rsvpStatus: "PENDING" })]);
    expect(sends).toEqual([{ guestId: "1", to: "g@example.com", nudgeRsvp: true, partySize: null }]);
  });

  test("a guest who already said yes gets the registry without the nudge", () => {
    const { sends } = planAnnouncement([guest({ id: "1", rsvpStatus: "YES" })]);
    expect(sends[0].nudgeRsvp).toBe(false);
  });

  test("someone who declined is left out entirely", () => {
    // Mailing a registry to someone who already apologised for not coming
    // reads as asking them for a gift anyway.
    const { sends, skipped } = planAnnouncement([guest({ id: "1", rsvpStatus: "NO" })]);
    expect(sends).toHaveLength(0);
    expect(skipped[0].reason).toBe("declined");
  });

  test("a guest with no email address is skipped, not crashed on", () => {
    const { sends, skipped } = planAnnouncement([guest({ id: "1", email: null })]);
    expect(sends).toHaveLength(0);
    expect(skipped[0].reason).toBe("no-email");
  });

  test("nobody is emailed twice", () => {
    const { sends, skipped } = planAnnouncement([guest({ id: "1", reminders: sentAlready })]);
    expect(sends).toHaveLength(0);
    expect(skipped[0].reason).toBe("already-sent");
  });

  test("a practice-mode send does not block the real one", () => {
    const { sends } = planAnnouncement([guest({ id: "1", reminders: sentInPractice })]);
    expect(sends).toHaveLength(1);
  });

  test("an unrelated reminder does not count as this announcement", () => {
    const other = [{ scheduleKey: "1week", channel: "email", simulated: false }];
    expect(planAnnouncement([guest({ id: "1", reminders: other })]).sends).toHaveLength(1);
  });

  test("a guest added after the first send still gets it", () => {
    const { sends } = planAnnouncement([
      guest({ id: "old", reminders: sentAlready }),
      guest({ id: "new" }),
    ]);
    expect(sends.map((s) => s.guestId)).toEqual(["new"]);
  });
});

describe("announcementSummary", () => {
  test("counts what the couple is about to do", () => {
    const summary = announcementSummary([
      guest({ id: "1", rsvpStatus: "PENDING" }),
      guest({ id: "2", rsvpStatus: "PENDING" }),
      guest({ id: "3", rsvpStatus: "YES" }),
      guest({ id: "4", rsvpStatus: "NO" }),
      guest({ id: "5", email: null }),
    ]);
    expect(summary).toEqual({ total: 3, withNudge: 2, registryOnly: 1, skipped: 2 });
  });

  test("an empty guest list is zero, not an error", () => {
    expect(announcementSummary([])).toEqual({
      total: 0,
      withNudge: 0,
      registryOnly: 0,
      skipped: 0,
    });
  });
});

describe("wedding update", () => {
  test("an attending guest is shown the headcount we have for them", () => {
    const { sends } = planAnnouncement([guest({ id: "1", rsvpStatus: "YES", partySize: 3 })]);
    expect(sends[0]).toMatchObject({ nudgeRsvp: false, partySize: 3 });
  });

  test("a guest who hasn't replied has no headcount to show", () => {
    const { sends } = planAnnouncement([guest({ id: "1", rsvpStatus: "PENDING", partySize: 2 })]);
    expect(sends[0]).toMatchObject({ nudgeRsvp: true, partySize: null });
  });

  test("anyone who already had this update is not emailed again", () => {
    const sent = [{ scheduleKey: UPDATE_KEY, channel: "email", simulated: false }];
    expect(planAnnouncement([guest({ id: "1", reminders: sent })]).sends).toHaveLength(0);
  });

  test("the automatic one-month reminder does not stop the update", () => {
    const monthly = [{ scheduleKey: "1month", channel: "email", simulated: false }];
    expect(planAnnouncement([guest({ id: "1", reminders: monthly })]).sends).toHaveLength(1);
  });
});

describe("countdownLabel", () => {
  test("weeks when it's a fortnight or more away", () => {
    expect(countdownLabel(28)).toBe("Four weeks to go");
    expect(countdownLabel(14)).toBe("Two weeks to go");
    expect(countdownLabel(31)).toBe("Four weeks to go");
  });
  test("days when it's close", () => {
    expect(countdownLabel(10)).toBe("Ten days to go");
    expect(countdownLabel(2)).toBe("Two days to go");
  });
  test("tomorrow, today, and afterwards", () => {
    expect(countdownLabel(1)).toBe("Tomorrow");
    expect(countdownLabel(0)).toBe("Today's the day");
    expect(countdownLabel(-3)).toBe("Thank you");
  });
});