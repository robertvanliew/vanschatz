/**
 * Gift claims made from this browser without an invite link, as
 * giftId -> claimId.
 *
 * Someone claiming without a personal link has no token to identify them on a
 * later visit, so the claim's id is kept here. It is what lets them undo a
 * mis-tap and stops anyone else doing it: the server releases a claim only when
 * this id matches, and the id never appears on the page.
 *
 * Exposed as an external store rather than read in an effect so React can render
 * it directly — an effect that sets state on mount causes a flash of the wrong
 * state and is flagged by the hooks lint rule.
 */

const KEY = "vanschatz.myGiftClaims";
const EMPTY = "{}";

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeMyClaims(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab claiming something should update this one too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The raw JSON string, so React can compare snapshots by value. */
export function myClaimsSnapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? EMPTY;
  } catch {
    // Private browsing or blocked storage: undo is simply unavailable.
    return EMPTY;
  }
}

/** The server has no browser storage; render as though nothing is claimed here. */
export function myClaimsServerSnapshot(): string {
  return EMPTY;
}

export function parseMyClaims(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberClaim(giftId: string, claimId: string | null): void {
  const next = parseMyClaims(myClaimsSnapshot());
  if (claimId) next[giftId] = claimId;
  else delete next[giftId];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not fatal — the claim itself is already recorded on the server.
  }
  emit();
}
