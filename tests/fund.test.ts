import { describe, expect, test } from "vitest";
import {
  DEFAULT_AMOUNTS_CENTS,
  money,
  parseAmount,
  parseAmounts,
  payLink,
  publicNotes,
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

describe("parseAmounts", () => {
  test("reads the couple's quick-pick buttons", () => {
    expect(parseAmounts("50, 100, 250")).toEqual([5000, 10000, 25000]);
  });
  test("sorts them and drops repeats", () => {
    expect(parseAmounts("250, 50, 100, 50")).toEqual([5000, 10000, 25000]);
  });
  test("ignores junk between the numbers", () => {
    expect(parseAmounts("$50 / lots / 100")).toEqual([5000, 10000]);
  });
  test("falls back rather than leaving a guest with no shortcut", () => {
    expect(parseAmounts("")).toEqual(DEFAULT_AMOUNTS_CENTS);
    expect(parseAmounts(null)).toEqual(DEFAULT_AMOUNTS_CENTS);
    expect(parseAmounts("nonsense")).toEqual(DEFAULT_AMOUNTS_CENTS);
  });
  test("caps how many buttons are shown", () => {
    expect(parseAmounts("10,20,30,40,50,60,70").length).toBe(5);
  });
});

describe("publicNotes", () => {
  const rows = [
    { id: "1", message: "Congratulations!", noteHidden: false, givenName: null, guest: { name: "Aunt Carol" } },
    { id: "2", message: null, noteHidden: false, givenName: "Quiet Giver", guest: null },
    { id: "3", message: "   ", noteHidden: false, givenName: "Spacey", guest: null },
    { id: "4", message: "Hidden one", noteHidden: true, givenName: "Someone", guest: null },
    { id: "5", message: "  All our love  ", noteHidden: false, givenName: "The Delgados", guest: null },
  ];

  test("shows notes with the giver's name", () => {
    expect(publicNotes(rows).map((n) => n.name)).toEqual(["Aunt Carol", "The Delgados"]);
  });

  test("a contribution without a message is left out entirely", () => {
    // Otherwise the page becomes a public list of who has paid.
    expect(publicNotes(rows).find((n) => n.name === "Quiet Giver")).toBeUndefined();
    expect(publicNotes(rows).find((n) => n.name === "Spacey")).toBeUndefined();
  });

  test("a note the couple hid does not appear", () => {
    expect(publicNotes(rows).find((n) => n.message === "Hidden one")).toBeUndefined();
  });

  test("messages are trimmed", () => {
    expect(publicNotes(rows)[1].message).toBe("All our love");
  });

  test("no amount is ever exposed", () => {
    for (const note of publicNotes(rows)) {
      expect(Object.keys(note).sort()).toEqual(["id", "message", "name"]);
    }
  });

  test("a nameless giver is not left blank", () => {
    const [n] = publicNotes([
      { id: "x", message: "hi", noteHidden: false, givenName: null, guest: null },
    ]);
    expect(n.name).toBe("A friend");
  });
});
