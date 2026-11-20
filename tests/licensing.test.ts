import { describe, expect, it } from "vitest";
import type { Licence } from "@/lib/types";
import {
  describeLicence,
  effectiveLicenceStatus,
  seatsRemaining,
} from "@/lib/services/licensing";

function makeLicence(overrides: Partial<Licence> = {}): Licence {
  return {
    id: "lic-test",
    instrumentName: "Test Instrument",
    provider: "Test Provider",
    licenceRef: "REF-001",
    validFrom: "2025-01-01",
    validTo: "2027-12-31",
    seats: 100,
    seatsUsed: 10,
    status: "active",
    scope: "Guidance",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const NOW = new Date("2026-06-01T00:00:00.000Z");

describe("licence validity", () => {
  it("treats an in-date active licence as active", () => {
    expect(effectiveLicenceStatus(makeLicence(), NOW)).toBe("active");
  });

  it("treats a stale validTo as expired even if the stored flag says active", () => {
    expect(
      effectiveLicenceStatus(makeLicence({ validTo: "2025-12-31" }), NOW)
    ).toBe("expired");
  });

  it("treats a future validFrom as pending", () => {
    expect(
      effectiveLicenceStatus(makeLicence({ validFrom: "2027-01-01" }), NOW)
    ).toBe("pending");
  });

  it("respects an explicit suspension or pending flag", () => {
    expect(effectiveLicenceStatus(makeLicence({ status: "suspended" }), NOW)).toBe(
      "suspended"
    );
    expect(effectiveLicenceStatus(makeLicence({ status: "pending" }), NOW)).toBe(
      "pending"
    );
  });

  it("computes remaining seats without going negative", () => {
    expect(seatsRemaining(makeLicence())).toBe(90);
    expect(seatsRemaining(makeLicence({ seatsUsed: 100 }))).toBe(0);
  });

  it("marks a licence unusable when seats are exhausted", () => {
    const described = describeLicence(makeLicence({ seatsUsed: 100 }));
    expect(described.usable).toBe(false);
    expect(described.seatsRemaining).toBe(0);
  });

  it("marks an in-date licence with seats usable", () => {
    const described = describeLicence(makeLicence());
    expect(described.usable).toBe(true);
  });
});
