import { describe, expect, it } from "vitest";
import { allow, clientKey } from "@/lib/server/rate-limit";

describe("rate limit", () => {
  it("prefers the platform x-real-ip over a spoofable x-forwarded-for", () => {
    expect(clientKey(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }))).toBe("1.1.1.1");
    expect(clientKey(new Headers({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" }))).toBe("9.9.9.9");
  });

  it("allows `limit` calls per minute, then blocks, then frees the slot after a minute", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(allow("rl-test", 3, t0 + i)).toBe(true);
    expect(allow("rl-test", 3, t0 + 10)).toBe(false);
    expect(allow("rl-test", 3, t0 + 60_001)).toBe(true);
  });

  it("evicting old callers never resets an active one", () => {
    const now = 5_000_000;
    for (let i = 0; i < 2; i++) allow("active", 2, now);
    for (let i = 0; i < 5_001; i++) allow(`old-${i}`, 2, now - 120_000);
    allow("trigger", 2, now);
    expect(allow("active", 2, now + 1)).toBe(false);
  });
});
