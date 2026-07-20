import { describe, expect, test } from "vitest";
import { validateRsvp, computeTallies } from "@/lib/rsvp";

describe("validateRsvp", () => {
  test("yes with valid party size", () => {
    expect(validateRsvp({ attending: true, partySize: 2 })).toEqual({
      ok: true,
      status: "YES",
      partySize: 2,
    });
  });
  test("no normalizes party size to 0", () => {
    expect(validateRsvp({ attending: false, partySize: 5 })).toEqual({
      ok: true,
      status: "NO",
      partySize: 0,
    });
  });
  test.each([0, 11, 1.5, -1, NaN])("rejects party size %s when attending", (n) => {
    const r = validateRsvp({ attending: true, partySize: n as number });
    expect(r.ok).toBe(false);
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
