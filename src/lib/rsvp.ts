export type RsvpInput = { attending: boolean; adults: number; children: number };

export type RsvpResult =
  | { ok: true; status: "YES" | "NO"; adults: number; children: number; partySize: number }
  | { ok: false; error: string };

export const MAX_PARTY_SIZE = 10;

export function validateRsvp(input: RsvpInput): RsvpResult {
  if (!input.attending) return { ok: true, status: "NO", adults: 0, children: 0, partySize: 0 };
  const { adults, children } = input;
  if (!Number.isInteger(adults) || !Number.isInteger(children) || adults < 1 || children < 0) {
    return { ok: false, error: "Please include at least one adult." };
  }
  const partySize = adults + children;
  if (partySize > MAX_PARTY_SIZE) {
    return {
      ok: false,
      error: `Parties of more than ${MAX_PARTY_SIZE} — please reach out to Julie & Rob directly.`,
    };
  }
  return { ok: true, status: "YES", adults, children, partySize };
}

export type GuestLike = { rsvpStatus: string; partySize: number };

export function computeTallies(guests: GuestLike[]) {
  const attending = guests.filter((g) => g.rsvpStatus === "YES");
  return {
    attending: attending.length,
    declined: guests.filter((g) => g.rsvpStatus === "NO").length,
    pending: guests.filter((g) => g.rsvpStatus === "PENDING").length,
    headcount: attending.reduce((sum, g) => sum + g.partySize, 0),
  };
}
