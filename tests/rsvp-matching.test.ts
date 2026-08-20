import { describe, expect, test } from "vitest";
import { findGuestMatch, normalise } from "@/lib/rsvp-matching";

const guests = [
  { id: "1", name: "David Goldstein", email: "david@example.com" },
  { id: "2", name: "Jorge Bultron", email: null },
  { id: "3", name: "Sam Taylor", email: "sam@example.com" },
  { id: "4", name: "Sam Taylor", email: "other-sam@example.com" },
];

describe("normalise", () => {
  test("trims, lowercases and collapses whitespace", () => {
    expect(normalise("  David   GOLDSTEIN ")).toBe("david goldstein");
  });
  test("handles null and undefined", () => {
    expect(normalise(null)).toBe("");
    expect(normalise(undefined)).toBe("");
  });
});

describe("findGuestMatch", () => {
  test("matches on email regardless of the name typed", () => {
    const m = findGuestMatch(guests, { name: "Dave G", email: "DAVID@example.com" });
    expect(m?.id).toBe("1");
  });

  test("matches on name when no email is given", () => {
    expect(findGuestMatch(guests, { name: "jorge bultron" })?.id).toBe("2");
  });

  test("email beats name when they point at different people", () => {
    const m = findGuestMatch(guests, { name: "Jorge Bultron", email: "david@example.com" });
    expect(m?.id).toBe("1");
  });

  test("an unknown person matches nobody", () => {
    expect(findGuestMatch(guests, { name: "Someone Else" })).toBeNull();
  });

  test("an ambiguous name matches nobody rather than guessing", () => {
    // Overwriting the wrong Sam Taylor's RSVP is worse than a duplicate row.
    expect(findGuestMatch(guests, { name: "Sam Taylor" })).toBeNull();
  });

  test("an ambiguous name is resolved by email", () => {
    expect(findGuestMatch(guests, { name: "Sam Taylor", email: "sam@example.com" })?.id).toBe("3");
  });

  test("a near-miss name is not fuzzily matched", () => {
    expect(findGuestMatch(guests, { name: "Dave Goldstein" })).toBeNull();
  });

  test("empty input matches nobody", () => {
    expect(findGuestMatch(guests, { name: "", email: "" })).toBeNull();
    expect(findGuestMatch([], { name: "David Goldstein" })).toBeNull();
  });

  test("an unknown email falls through to the name", () => {
    expect(findGuestMatch(guests, { name: "Jorge Bultron", email: "nobody@example.com" })?.id).toBe("2");
  });
});
