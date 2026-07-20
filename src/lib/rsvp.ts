export type RsvpInput = { attending: boolean; partySize: number };

export type RsvpResult =
  | { ok: true; status: "YES" | "NO"; partySize: number }
  | { ok: false; error: string };

export const MAX_PARTY_SIZE = 10;

export function validateRsvp(input: RsvpInput): RsvpResult {
  if (!input.attending) return { ok: true, status: "NO", partySize: 0 };
  const n = input.partySize;
  if (!Number.isInteger(n) || n < 1 || n > MAX_PARTY_SIZE) {
    return { ok: false, error: `Party size must be between 1 and ${MAX_PARTY_SIZE}.` };
  }
  return { ok: true, status: "YES", partySize: n };
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
