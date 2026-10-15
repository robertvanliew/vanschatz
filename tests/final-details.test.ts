import { describe, expect, test } from "vitest";
import {
  editionDue,
  FINAL_KEYS,
  finalDetailsEmail,
  parseEdition,
  planFinalDetails,
  type FinalGuest,
} from "@/lib/final-details";
import { MENU } from "@/lib/menu";

const guest = (id: string, extra: Partial<FinalGuest> = {}): FinalGuest => ({
  id,
  name: `Guest ${id}`,
  email: `${id}@example.com`,
  rsvpStatus: "YES",
  partySize: 2,
  reminders: [],
  ...extra,
});

describe("editionDue", () => {
  // The scheduled times, in UTC as Vercel runs them.
  test("Thursday 10 AM ET is edition 1's day, not edition 2's", () => {
    const thu = new Date("2026-10-15T14:00:00Z");
    expect(editionDue(1, thu)).toBe(true);
    expect(editionDue(2, thu)).toBe(false);
  });
  test("Friday 6 PM ET is edition 2's day, not edition 1's", () => {
    const fri = new Date("2026-10-16T22:00:00Z");
    expect(editionDue(2, fri)).toBe(true);
    expect(editionDue(1, fri)).toBe(false);
  });
  test("a stray call on another day sends nothing", () => {
    const sat = new Date("2026-10-17T14:00:00Z");
    expect(editionDue(1, sat) || editionDue(2, sat)).toBe(false);
  });
  test("parseEdition accepts only 1 and 2", () => {
    expect(parseEdition("1")).toBe(1);
    expect(parseEdition("2")).toBe(2);
    expect(parseEdition("3")).toBeNull();
    expect(parseEdition(undefined)).toBeNull();
  });
});

describe("planFinalDetails", () => {
  test("everyone who hasn't declined, with an email", () => {
    const { sends, skipped } = planFinalDetails(
      [
        guest("yes"),
        guest("pending", { rsvpStatus: "PENDING", partySize: 0 }),
        guest("no", { rsvpStatus: "NO" }),
        guest("noemail", { email: null }),
      ],
      1
    );
    expect(sends).toEqual([
      { guestId: "yes", to: "yes@example.com", nudgeRsvp: false, partySize: 2 },
      { guestId: "pending", to: "pending@example.com", nudgeRsvp: true, partySize: null },
    ]);
    expect(skipped.map((s) => [s.guestId, s.reason])).toEqual([
      ["no", "declined"],
      ["noemail", "no-email"],
    ]);
  });

  test("never sends the same edition twice, but edition 1 doesn't block edition 2", () => {
    const g = guest("a", {
      reminders: [{ scheduleKey: FINAL_KEYS[1], channel: "email", simulated: false }],
    });
    expect(planFinalDetails([g], 1).sends).toHaveLength(0);
    expect(planFinalDetails([g], 2).sends).toHaveLength(1);
  });

  test("a practice-mode send doesn't count as sent", () => {
    const g = guest("a", {
      reminders: [{ scheduleKey: FINAL_KEYS[1], channel: "email", simulated: true }],
    });
    expect(planFinalDetails([g], 1).sends).toHaveLength(1);
  });
});

describe("finalDetailsEmail", () => {
  const base = { name: "Aunt May", token: "tok123", nudgeRsvp: false, partySize: 2, fundLive: true };

  test("edition 1 and 2 have their own subject and heading", () => {
    const one = finalDetailsEmail({ ...base, edition: 1 });
    const two = finalDetailsEmail({ ...base, edition: 2 });
    expect(one.subject).toContain("2 days to go");
    expect(two.subject).toContain("Tomorrow");
    expect(two.html).toContain("See you tomorrow!");
  });

  test("shows the whole menu as text", () => {
    const { html, text } = finalDetailsEmail({ ...base, edition: 1 });
    for (const e of MENU.entrees) {
      expect(html).toContain(e.name);
      expect(text).toContain(e.name);
    }
  });

  test("links go to this guest's own songs, gifts and invitation", () => {
    const { html } = finalDetailsEmail({ ...base, edition: 1 });
    expect(html).toContain("/invite/tok123#songs");
    expect(html).toContain("/invite/tok123/registry");
    expect(html).toContain("Get directions");
  });

  test("a guest who hasn't replied is asked first", () => {
    const { html } = finalDetailsEmail({ ...base, edition: 1, nudgeRsvp: true, partySize: null });
    expect(html).toContain("can you make it?");
    expect(html.indexOf("can you make it?")).toBeLessThan(html.indexOf("The day"));
    expect(html).not.toContain("We have you down for");
  });

  test("an attending guest sees their headcount, not an RSVP request", () => {
    const { html } = finalDetailsEmail({ ...base, edition: 1 });
    expect(html).toContain("<b style=\"color:#332c44;\">2 guests</b>");
    expect(html).not.toContain("can you make it?");
  });

  test("mentions the honeymoon fund only when it's live", () => {
    expect(finalDetailsEmail({ ...base, edition: 1 }).html).toContain("honeymoon fund");
    expect(finalDetailsEmail({ ...base, edition: 1, fundLive: false }).html).not.toContain("honeymoon fund");
  });

  test("a guest's name can't inject markup", () => {
    const { html } = finalDetailsEmail({ ...base, edition: 1, name: "<script>x</script>" });
    expect(html).not.toContain("<script>");
  });
});
