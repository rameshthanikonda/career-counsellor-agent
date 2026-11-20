import { describe, expect, it } from "vitest";
import { ageOn, isMinor } from "@/lib/auth/age";

const NOW = new Date("2026-11-20T00:00:00.000Z");

describe("exact consent age", () => {
  it("treats a learner who turns 18 tomorrow as a minor", () => {
    expect(isMinor("2008-11-21", NOW)).toBe(true);
    expect(ageOn("2008-11-21", NOW)).toBe(17);
  });

  it("treats a learner who turned 18 yesterday as an adult", () => {
    expect(isMinor("2008-11-19", NOW)).toBe(false);
    expect(ageOn("2008-11-19", NOW)).toBe(18);
  });

  it("does not use calendar-year subtraction", () => {
    // Year difference is 18, but the learner is still 17 until December.
    expect(isMinor("2008-12-31", NOW)).toBe(true);
  });

  it("handles a birthday on the current day", () => {
    expect(isMinor("2008-11-20", NOW)).toBe(false);
  });

  it("returns false/null for an invalid date", () => {
    expect(isMinor("not-a-date", NOW)).toBe(false);
    expect(ageOn("not-a-date", NOW)).toBeNull();
  });
});
