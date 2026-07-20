import { describe, expect, test } from "vitest";
import { validateRsvp, computeTallies } from "@/lib/rsvp";

describe("validateRsvp", () => {
  test("yes with adults and children", () => {
    expect(validateRsvp({ attending: true, adults: 2, children: 1 })).toEqual({
      ok: true,
      status: "YES",
      adults: 2,
      children: 1,
      partySize: 3,
    });
  });
  test("no normalizes counts to 0", () => {
    expect(validateRsvp({ attending: false, adults: 3, children: 2 })).toEqual({
      ok: true,
      status: "NO",
      adults: 0,
      children: 0,
      partySize: 0,
    });
  });
  test("rejects zero adults when attending", () => {
    expect(validateRsvp({ attending: true, adults: 0, children: 2 }).ok).toBe(false);
  });
  test("rejects a party larger than the max", () => {
    expect(validateRsvp({ attending: true, adults: 9, children: 2 }).ok).toBe(false);
  });
  test.each([1.5, -1, NaN])("rejects non-integer/negative adults %s", (n) => {
    expect(validateRsvp({ attending: true, adults: n as number, children: 0 }).ok).toBe(false);
  });
});

describe("computeTallies", () => {
  test("sums statuses and headcount", () => {
    const guests = [
      { rsvpStatus: "YES", partySize: 2 },
      { rsvpStatus: "YES", partySize: 1 },
      { rsvpStatus: "NO", partySize: 0 },
      { rsvpStatus: "PENDING", partySize: 0 },
    ];
    expect(computeTallies(guests)).toEqual({
      attending: 2,
      declined: 1,
      pending: 1,
      headcount: 3,
    });
  });
});
