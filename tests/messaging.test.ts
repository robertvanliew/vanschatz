import { describe, expect, test } from "vitest";
import { retryDelayMs } from "@/lib/messaging";

describe("retryDelayMs", () => {
  test("too many requests is retried, waiting as long as the provider asks", () => {
    expect(retryDelayMs(429, "2", 1)).toBe(2000);
  });

  test("without a Retry-After header it backs off 1s, 2s, 4s", () => {
    expect(retryDelayMs(429, null, 1)).toBe(1000);
    expect(retryDelayMs(429, null, 2)).toBe(2000);
    expect(retryDelayMs(429, null, 3)).toBe(4000);
  });

  test("gives up after the last attempt rather than retrying forever", () => {
    expect(retryDelayMs(429, null, 4)).toBeNull();
  });

  test("a brief server error on their side is retried", () => {
    expect(retryDelayMs(503, null, 1)).toBe(1000);
  });

  test("a real failure — bad address, bad key — fails straight away", () => {
    expect(retryDelayMs(422, null, 1)).toBeNull();
    expect(retryDelayMs(401, null, 1)).toBeNull();
    expect(retryDelayMs(403, null, 1)).toBeNull();
  });

  test("an absurd Retry-After is capped so a send can't hang", () => {
    expect(retryDelayMs(429, "3600", 1)).toBe(10_000);
  });

  test("a garbled Retry-After falls back to the backoff", () => {
    expect(retryDelayMs(429, "soon", 1)).toBe(1000);
  });
});
