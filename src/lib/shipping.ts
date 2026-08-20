/**
 * Where gifts should be sent, and how each guest is getting theirs there.
 *
 * The address itself lives in the Setting table rather than in this repository:
 * it is Julie & Robert's home address, and a wedding date beside a home address
 * publicly announces when the house is empty. It is only ever served to a page
 * reached with a valid invite token — see `visibleShipping`.
 */

export type Delivery = "SHIP" | "BRING";

export type Shipping = {
  /** "Julie & Robert Van Liew" */
  recipient: string;
  /** Free text, one line per line, as typed into admin. */
  address: string;
  /** "10 October 2026", shown as guidance. Optional. */
  arriveBy: string | null;
};

export const SHIPPING_KEYS = {
  recipient: "shipping.recipient",
  address: "shipping.address",
  arriveBy: "shipping.arriveBy",
} as const;

export function isDelivery(value: unknown): value is Delivery {
  return value === "SHIP" || value === "BRING";
}

/**
 * Build a Shipping from raw settings, or null when it isn't usable yet.
 *
 * Both a recipient and an address are required: half an address is worse than
 * none, because a guest would post a parcel to it anyway.
 */
export function toShipping(raw: Record<string, string | undefined>): Shipping | null {
  const recipient = (raw[SHIPPING_KEYS.recipient] ?? "").trim();
  const address = (raw[SHIPPING_KEYS.address] ?? "").trim();
  if (!recipient || !address) return null;
  const arriveBy = (raw[SHIPPING_KEYS.arriveBy] ?? "").trim();
  return { recipient, address, arriveBy: arriveBy || null };
}

/**
 * The address as separate display lines. Blank lines a guest left in the admin
 * textarea are dropped, so the card never shows a gap.
 */
export function addressLines(shipping: Shipping): string[] {
  return [shipping.recipient, ...shipping.address.split(/\r?\n/)]
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * One line, for pasting into a checkout field.
 *
 * Joined with commas, but a line the couple already ended with a comma must not
 * become ", ,". Guests paste this straight into Amazon; a malformed address is
 * a lost parcel.
 */
export function addressOneLine(shipping: Shipping): string {
  return addressLines(shipping)
    .map((line) => line.replace(/[,\s]+$/, ""))
    .filter((line) => line.length > 0)
    .join(", ");
}

/** What a guest is told about their own claim, once they've chosen. */
export function deliveryLabel(delivery: Delivery | null): string | null {
  if (delivery === "SHIP") return "You're posting this to us";
  if (delivery === "BRING") return "You're bringing this on the day";
  return null;
}

/**
 * The shipping details a request is allowed to see.
 *
 * Deciding this on the server is the whole point: the public registry never
 * receives the address, so it cannot be read out of the page source. A page
 * without a recognised guest gets null, whatever the interface asks for.
 */
export function visibleShipping(
  shipping: Shipping | null,
  guestIdentified: boolean
): Shipping | null {
  return guestIdentified ? shipping : null;
}
