import { describe, expect, test } from "vitest";
import { getScheduleKey, eligibleSends } from "@/lib/reminders";

describe("getScheduleKey", () => {
  test("30 days out → 1month", () => {
    expect(getScheduleKey(new Date(2026, 8, 17))).toBe("1month");
  });
  test("7 days out → 1week", () => {
    expect(getScheduleKey(new Date(2026, 9, 10))).toBe("1week");
  });
  test("3 days out → 3days", () => {
    expect(getScheduleKey(new Date(2026, 9, 14))).toBe("3days");
  });
  test("other days → null", () => {
    expect(getScheduleKey(new Date(2026, 9, 12))).toBeNull();
  });
});

describe("eligibleSends", () => {
  const base = { rsvpStatus: "PENDING", reminders: [] as { scheduleKey: string; channel: string }[] };
  test("skips guests who already responded", () => {
    const guests = [
      { id: "a", ...base, rsvpStatus: "YES", email: "a@x.com", phone: null },
      { id: "b", ...base, email: "b@x.com", phone: null },
    ];
    expect(eligibleSends(guests, "1week")).toEqual([
      { guestId: "b", channel: "email", to: "b@x.com" },
    ]);
  });
  test("sends on every available channel", () => {
    const guests = [{ id: "c", ...base, email: "c@x.com", phone: "+15551234567" }];
    expect(eligibleSends(guests, "1week")).toEqual([
      { guestId: "c", channel: "email", to: "c@x.com" },
      { guestId: "c", channel: "sms", to: "+15551234567" },
    ]);
  });
  test("idempotent: skips channels already logged for this key", () => {
    const guests = [
      {
        id: "d",
        rsvpStatus: "PENDING",
        email: "d@x.com",
        phone: "+15550000000",
        reminders: [{ scheduleKey: "1week", channel: "email" }],
      },
    ];
    expect(eligibleSends(guests, "1week")).toEqual([
      { guestId: "d", channel: "sms", to: "+15550000000" },
    ]);
  });
  test("guest with no contact info yields nothing", () => {
    const guests = [{ id: "e", ...base, email: null, phone: null }];
    expect(eligibleSends(guests, "1week")).toEqual([]);
  });
});
