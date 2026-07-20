import { describe, expect, test } from "vitest";
import { WEDDING, daysUntil, mapsUrl, mapsEmbedUrl } from "@/lib/wedding";

describe("wedding constants", () => {
  test("facts are exact", () => {
    expect(WEDDING.coupleFull).toBe("Julie & Robert");
    expect(WEDDING.dateLabel).toBe("Saturday, October 17, 2026");
    expect(WEDDING.arrivalLabel).toBe("Guests arrive 11:30 AM");
    expect(WEDDING.timeLabel).toBe("12:00 PM – 5:00 PM");
    expect(WEDDING.venueAddress).toBe(
      "343 Lakeside Road, Orange Lake, Newburgh, NY 12550"
    );
    expect(WEDDING.date.getFullYear()).toBe(2026);
    expect(WEDDING.date.getMonth()).toBe(9); // October
    expect(WEDDING.date.getDate()).toBe(17);
  });
});

describe("daysUntil", () => {
  test("7 days before", () => {
    expect(daysUntil(new Date(2026, 9, 10, 8, 0))).toBe(7);
  });
  test("30 days before", () => {
    expect(daysUntil(new Date(2026, 8, 17, 23, 59))).toBe(30);
  });
  test("wedding day is 0", () => {
    expect(daysUntil(new Date(2026, 9, 17, 6, 0))).toBe(0);
  });
  test("after the wedding is negative", () => {
    expect(daysUntil(new Date(2026, 9, 20))).toBe(-3);
  });
});

describe("maps urls", () => {
  test("link encodes address", () => {
    expect(mapsUrl()).toContain("343+Lakeside+Road");
  });
  test("embed url uses output=embed", () => {
    expect(mapsEmbedUrl()).toContain("output=embed");
  });
});
