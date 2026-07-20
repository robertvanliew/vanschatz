import { randomBytes } from "crypto";

/** 16-char unguessable URL-safe guest token. */
export function makeToken(): string {
  return randomBytes(12).toString("base64url");
}
