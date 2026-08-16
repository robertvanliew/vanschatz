import { describe, expect, test } from "vitest";
import {
  canClaim,
  canUnclaim,
  claimSummary,
  filterGifts,
  formatPrice,
  isClaimedByMe,
  placeholderInitials,
} from "@/lib/registry";

const unclaimed = { claim: null };
const claimedBy = (guestId: string | null) => ({
  claim: { guestId, claimedName: null },
});

describe("formatPrice", () => {
  test("whole dollars drop the cents", () => {
    expect(formatPrice(13000)).toBe("$130");
  });
  test("keeps cents when they matter", () => {
    expect(formatPrice(6699)).toBe("$66.99");
  });
  test("thousands are grouped", () => {
    expect(formatPrice(120000)).toBe("$1,200");
  });
  test("absent or nonsense prices render nothing rather than $0", () => {
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
    expect(formatPrice(0)).toBeNull();
    expect(formatPrice(-500)).toBeNull();
    expect(formatPrice(Number.NaN)).toBeNull();
  });
});

describe("canClaim", () => {
  test("an identified guest may claim a free gift", () => {
    expect(canClaim(unclaimed, "guest-1")).toEqual({ ok: true });
  });

  test("a guest without an invite link is refused, not recorded anonymously", () => {
    const result = canClaim(unclaimed, null);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/invitation link/i);
  });

  test("a gift someone else holds cannot be claimed twice", () => {
    const result = canClaim(claimedBy("guest-1"), "guest-2");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/just claimed/i);
  });

  test("claiming your own claim again is refused distinctly", () => {
    const result = canClaim(claimedBy("guest-1"), "guest-1");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/already claimed/i);
  });

  test("a gift removed from the registry cannot be claimed", () => {
    expect(canClaim(null, "guest-1").ok).toBe(false);
  });
});

describe("canUnclaim", () => {
  test("the holder may release their own claim", () => {
    expect(canUnclaim(claimedBy("guest-1"), "guest-1")).toEqual({ ok: true });
  });

  test("nobody else may release it", () => {
    const result = canUnclaim(claimedBy("guest-1"), "guest-2");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/only the person/i);
  });

  test("an anonymous visitor may not release a claim", () => {
    expect(canUnclaim(claimedBy("guest-1"), null).ok).toBe(false);
  });

  test("a claim made without a guest cannot be released by a guest", () => {
    expect(canUnclaim(claimedBy(null), "guest-1").ok).toBe(false);
  });

  test("an unclaimed gift cannot be released", () => {
    expect(canUnclaim(unclaimed, "guest-1").ok).toBe(false);
  });
});

describe("isClaimedByMe", () => {
  test("false when nobody is identified, even for an anonymous claim", () => {
    expect(isClaimedByMe(claimedBy(null), null)).toBe(false);
  });
  test("true only for the holder", () => {
    expect(isClaimedByMe(claimedBy("guest-1"), "guest-1")).toBe(true);
    expect(isClaimedByMe(claimedBy("guest-1"), "guest-2")).toBe(false);
  });
});

describe("filterGifts", () => {
  const gifts = [unclaimed, claimedBy("guest-1"), unclaimed];

  test("available hides taken gifts", () => {
    expect(filterGifts(gifts, "available")).toHaveLength(2);
  });
  test("taken shows only claimed gifts", () => {
    expect(filterGifts(gifts, "taken")).toHaveLength(1);
  });
  test("all passes everything through", () => {
    expect(filterGifts(gifts, "all")).toHaveLength(3);
  });
});

describe("claimSummary", () => {
  test("counts claimed and available", () => {
    expect(claimSummary([unclaimed, claimedBy("g"), claimedBy("g")])).toEqual({
      total: 3,
      claimed: 2,
      available: 1,
    });
  });
  test("an empty registry does not divide by zero or throw", () => {
    expect(claimSummary([])).toEqual({ total: 0, claimed: 0, available: 0 });
  });
});

describe("placeholderInitials", () => {
  test("takes the first letter of the first two words", () => {
    expect(placeholderInitials("Ninja PossibleCooker PRO")).toBe("NP");
  });
  test("a single word gives two letters", () => {
    expect(placeholderInitials("Stockpot")).toBe("ST");
  });
  test("skips a leading ampersand rather than using it", () => {
    expect(placeholderInitials("Crock-Pot Cook & Carry")).toBe("CP");
  });
  test("degrades rather than throwing on empty input", () => {
    expect(placeholderInitials("")).toBe("?");
    expect(placeholderInitials("   ")).toBe("?");
  });
});
