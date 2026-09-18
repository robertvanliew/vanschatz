import { describe, expect, test } from "vitest";
import {
  APPROVED_SOURCE,
  eligibleForGifts,
  findGiftGuest,
  UNAPPROVED_SOURCE,
} from "@/lib/gift-guests";

const guests = [
  { id: "1", name: "David Goldstein", email: "david@example.com", source: null },
  { id: "2", name: "Self Added", email: "stranger@example.com", source: UNAPPROVED_SOURCE },
  { id: "3", name: "The Cotlers", email: "cotlers@example.com", source: APPROVED_SOURCE },
  { id: "4", name: "No Email", email: null, source: null },
  { id: "5", name: "Partner One", email: "shared@example.com", source: null },
  { id: "6", name: "Partner Two", email: "shared@example.com", source: null },
];

describe("findGiftGuest", () => {
  test("a guest's invitation email finds them", () => {
    expect(findGiftGuest(guests, "david@example.com")?.name).toBe("David Goldstein");
  });

  test("case and stray spaces don't matter", () => {
    expect(findGiftGuest(guests, "  DAVID@Example.com ")?.id).toBe("1");
  });

  test("an email not on the list finds nobody", () => {
    expect(findGiftGuest(guests, "someone@else.com")).toBeNull();
  });

  test("a name is not accepted in place of an email", () => {
    expect(findGiftGuest(guests, "David Goldstein")).toBeNull();
  });

  test("an empty entry finds nobody", () => {
    expect(findGiftGuest(guests, "")).toBeNull();
    expect(findGiftGuest(guests, "   ")).toBeNull();
  });

  test("a guest who added themselves through the RSVP form is refused until approved", () => {
    // Otherwise anyone could RSVP with a made-up email and use it to see the address.
    expect(findGiftGuest(guests, "stranger@example.com")).toBeNull();
  });

  test("once approved, a self-added guest is accepted", () => {
    expect(findGiftGuest(guests, "cotlers@example.com")?.id).toBe("3");
  });

  test("a guest with no email on file cannot be matched by accident", () => {
    expect(findGiftGuest(guests, "null")).toBeNull();
  });

  test("a shared household email matches the first of them", () => {
    expect(findGiftGuest(guests, "shared@example.com")?.id).toBe("5");
  });
});

describe("eligibleForGifts", () => {
  test("guests the couple added are eligible", () => {
    expect(eligibleForGifts({ source: null })).toBe(true);
  });
  test("unapproved self-added guests are not", () => {
    expect(eligibleForGifts({ source: UNAPPROVED_SOURCE })).toBe(false);
  });
  test("approved ones are", () => {
    expect(eligibleForGifts({ source: APPROVED_SOURCE })).toBe(true);
  });
});
