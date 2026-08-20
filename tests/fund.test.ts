import { describe, expect, test } from "vitest";
import {
  fundTotals,
  money,
  parseAmount,
  payLink,
  progress,
  MAX_CONTRIBUTION_CENTS,
} from "@/lib/fund";

describe("money", () => {
  test("whole dollars drop the cents", () => {
    expect(money(4500)).toBe("$45");
    expect(money(120000)).toBe("$1,200");
  });
  test("keeps cents when they matter", () => {
    expect(money(6699)).toBe("$66.99");
  });
  test("nonsense renders as zero rather than NaN", () => {
    expect(money(Number.NaN)).toBe("$0");
    expect(money(-500)).toBe("$0");
  });
});

describe("progress", () => {
  test("part way", () => {
    expect(progress(4500, 18000)).toMatchObject({ percent: 25, fullyFunded: false });
  });
  test("exactly met", () => {
    expect(progress(18000, 18000)).toMatchObject({ percent: 100, fullyFunded: true });
  });
  test("over-funded clamps at 100 rather than reading 140", () => {
    const p = progress(25000, 18000);
    expect(p.percent).toBe(100);
    expect(p.fullyFunded).toBe(true);
    expect(p.raisedCents).toBe(25000); // the real total is still reported
  });
  test("nothing given yet", () => {
    expect(progress(0, 18000)).toMatchObject({ percent: 0, fullyFunded: false });
  });
  test("a zero target does not divide by zero", () => {
    expect(progress(0, 0).percent).toBe(100);
    expect(progress(0, 0).fullyFunded).toBe(false);
  });
  test("negative input is treated as zero", () => {
    expect(progress(-100, 18000).percent).toBe(0);
  });
});

describe("fundTotals", () => {
  test("adds every tile together", () => {
    const t = fundTotals([
      { raisedCents: 4500, targetCents: 18000 },
      { raisedCents: 9000, targetCents: 9000 },
    ]);
    expect(t.raisedCents).toBe(13500);
    expect(t.targetCents).toBe(27000);
    expect(t.percent).toBe(50);
  });
  test("an empty fund does not divide by zero", () => {
    expect(fundTotals([]).percent).toBe(100);
    expect(fundTotals([]).raisedCents).toBe(0);
  });
});

describe("parseAmount", () => {
  test("accepts plain and decorated amounts", () => {
    expect(parseAmount("45")).toEqual({ ok: true, cents: 4500 });
    expect(parseAmount("$45.50")).toEqual({ ok: true, cents: 4550 });
    expect(parseAmount(" 1,200 ")).toEqual({ ok: true, cents: 120000 });
  });
  test("rejects nothing, zero and negatives", () => {
    expect(parseAmount("").ok).toBe(false);
    expect(parseAmount("0").ok).toBe(false);
    expect(parseAmount("-5").ok).toBe(false);
  });
  test("rejects text", () => {
    expect(parseAmount("lots").ok).toBe(false);
    expect(parseAmount("45abc").ok).toBe(false);
  });
  test("rejects an implausible amount rather than recording a typo", () => {
    const r = parseAmount("500000");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/generous/i);
  });
  test("accepts the largest allowed amount", () => {
    expect(parseAmount(String(MAX_CONTRIBUTION_CENTS / 100)).ok).toBe(true);
  });
});

describe("payLink", () => {
  test("puts the amount into a paypal.me link", () => {
    expect(payLink("https://paypal.me/julierobert", 4500)).toBe("https://paypal.me/julierobert/45");
  });
  test("keeps cents when they are not zero", () => {
    expect(payLink("https://paypal.me/julierobert", 4550)).toBe("https://paypal.me/julierobert/45.50");
  });
  test("tolerates a trailing slash", () => {
    expect(payLink("https://paypal.me/julierobert/", 9000)).toBe("https://paypal.me/julierobert/90");
  });
  test("accepts the www form", () => {
    expect(payLink("https://www.paypal.me/jr", 2500)).toBe("https://www.paypal.me/jr/25");
  });
  test("leaves any other PayPal URL untouched — appending would break it", () => {
    const donate = "https://www.paypal.com/donate/?hosted_button_id=ABC123";
    expect(payLink(donate, 4500)).toBe(donate);
  });
  test("no link configured means no link", () => {
    expect(payLink("", 4500)).toBeNull();
    expect(payLink(null, 4500)).toBeNull();
    expect(payLink("   ", 4500)).toBeNull();
  });
  test("a zero amount falls back to the bare link", () => {
    expect(payLink("https://paypal.me/jr", 0)).toBe("https://paypal.me/jr");
  });
});
