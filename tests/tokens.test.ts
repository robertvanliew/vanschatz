import { expect, test } from "vitest";
import { makeToken } from "@/lib/tokens";

test("token is 16 chars, url-safe", () => {
  const t = makeToken();
  expect(t).toHaveLength(16);
  expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
});

test("tokens are unique across 1000 draws", () => {
  const seen = new Set(Array.from({ length: 1000 }, () => makeToken()));
  expect(seen.size).toBe(1000);
});
