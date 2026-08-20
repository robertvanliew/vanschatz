import { describe, expect, test } from "vitest";
import {
  addressLines,
  addressOneLine,
  deliveryLabel,
  isDelivery,
  toShipping,
  visibleShipping,
  SHIPPING_KEYS,
  type Shipping,
} from "@/lib/shipping";

const raw = (recipient?: string, address?: string, arriveBy?: string) => ({
  [SHIPPING_KEYS.recipient]: recipient,
  [SHIPPING_KEYS.address]: address,
  [SHIPPING_KEYS.arriveBy]: arriveBy,
});

const sample: Shipping = {
  recipient: "Julie & Robert Van Liew",
  address: "12 Example Lane\nApt 4\nNewburgh, NY 12550",
  arriveBy: "10 October 2026",
};

describe("toShipping", () => {
  test("builds from settings", () => {
    expect(toShipping(raw("Julie & Robert", "12 Example Lane", "10 Oct"))).toEqual({
      recipient: "Julie & Robert",
      address: "12 Example Lane",
      arriveBy: "10 Oct",
    });
  });

  test("half an address is treated as no address", () => {
    // A guest would post to it anyway, and the parcel would be lost.
    expect(toShipping(raw("Julie & Robert", ""))).toBeNull();
    expect(toShipping(raw("", "12 Example Lane"))).toBeNull();
    expect(toShipping(raw("   ", "   "))).toBeNull();
    expect(toShipping({})).toBeNull();
  });

  test("a missing arrive-by date is optional, not fatal", () => {
    expect(toShipping(raw("Julie", "12 Example Lane"))?.arriveBy).toBeNull();
  });
});

describe("addressLines", () => {
  test("recipient first, then each line", () => {
    expect(addressLines(sample)).toEqual([
      "Julie & Robert Van Liew",
      "12 Example Lane",
      "Apt 4",
      "Newburgh, NY 12550",
    ]);
  });

  test("blank lines left in the admin box are dropped", () => {
    const lines = addressLines({ ...sample, address: "12 Example Lane\n\n\nNewburgh, NY 12550" });
    expect(lines).toEqual(["Julie & Robert Van Liew", "12 Example Lane", "Newburgh, NY 12550"]);
  });

  test("windows line endings are handled", () => {
    const lines = addressLines({ ...sample, address: "12 Example Lane\r\nNewburgh, NY 12550" });
    expect(lines).toEqual(["Julie & Robert Van Liew", "12 Example Lane", "Newburgh, NY 12550"]);
  });
});

describe("addressOneLine", () => {
  test("joins with commas for a checkout field", () => {
    expect(addressOneLine(sample)).toBe(
      "Julie & Robert Van Liew, 12 Example Lane, Apt 4, Newburgh, NY 12550"
    );
  });

  test("does not double up commas the couple already typed", () => {
    const shipping = { ...sample, address: "12 Example Lane,\nNewburgh, NY 12550," };
    expect(addressOneLine(shipping)).toBe(
      "Julie & Robert Van Liew, 12 Example Lane, Newburgh, NY 12550"
    );
  });

  test("a line of only a comma disappears rather than leaving ', ,'", () => {
    const shipping = { ...sample, address: "12 Example Lane\n,\nNewburgh, NY 12550" };
    expect(addressOneLine(shipping)).toBe(
      "Julie & Robert Van Liew, 12 Example Lane, Newburgh, NY 12550"
    );
  });
});

describe("visibleShipping", () => {
  test("an identified guest gets the address", () => {
    expect(visibleShipping(sample, true)).toEqual(sample);
  });

  test("the public registry never gets it", () => {
    expect(visibleShipping(sample, false)).toBeNull();
  });

  test("nothing is invented when no address has been set", () => {
    expect(visibleShipping(null, true)).toBeNull();
  });
});

describe("isDelivery", () => {
  test("accepts only the two real choices", () => {
    expect(isDelivery("SHIP")).toBe(true);
    expect(isDelivery("BRING")).toBe(true);
    expect(isDelivery("ship")).toBe(false);
    expect(isDelivery("POST")).toBe(false);
    expect(isDelivery(null)).toBe(false);
    expect(isDelivery(undefined)).toBe(false);
  });
});

describe("deliveryLabel", () => {
  test("describes each choice, and says nothing before one is made", () => {
    expect(deliveryLabel("SHIP")).toMatch(/posting/i);
    expect(deliveryLabel("BRING")).toMatch(/bringing/i);
    expect(deliveryLabel(null)).toBeNull();
  });
});
