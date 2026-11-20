import { describe, expect, it } from "vitest";
import type { ApplicationView } from "@/lib/types";
import {
  applicationFunnel,
  deadlineRisk,
  satisfactionSummary,
} from "@/lib/services/analytics";
import { makeCourse, makeLearner } from "./fixtures";

const NOW = new Date("2026-11-20T00:00:00.000Z");

function app(overrides: Partial<ApplicationView> = {}): ApplicationView {
  return {
    id: "app-1",
    learnerId: "l-1",
    courseId: "c-1",
    status: "preparing",
    deadline: "2026-11-25T00:00:00.000Z",
    checklist: [],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    course: makeCourse(),
    ...overrides,
  };
}

describe("application funnel", () => {
  it("returns a row for every status, including zero counts", () => {
    const rows = applicationFunnel([
      { status: "preparing" },
      { status: "preparing" },
      { status: "offer" },
    ]);
    expect(rows).toHaveLength(7);
    expect(rows.find((row) => row.status === "preparing")?.count).toBe(2);
    expect(rows.find((row) => row.status === "offer")?.count).toBe(1);
    expect(rows.find((row) => row.status === "withdrawn")?.count).toBe(0);
  });
});

describe("satisfaction summary", () => {
  it("computes average and distribution", () => {
    const summary = satisfactionSummary([{ score: 5 }, { score: 4 }, { score: 4 }]);
    expect(summary.count).toBe(3);
    expect(summary.average).toBe(4.3);
    expect(summary.distribution[4]).toBe(2);
    expect(summary.distribution[5]).toBe(1);
  });

  it("handles no ratings", () => {
    expect(satisfactionSummary([])).toEqual({
      count: 0,
      average: null,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });
});

describe("deadline risk", () => {
  it("separates overdue from due-soon and ignores closed applications", () => {
    const learner = makeLearner();
    const risk = deadlineRisk(
      [
        { application: app({ id: "overdue", deadline: "2026-11-15T00:00:00.000Z" }), learner },
        { application: app({ id: "soon", deadline: "2026-11-24T00:00:00.000Z" }), learner },
        { application: app({ id: "later", deadline: "2026-12-30T00:00:00.000Z" }), learner },
        { application: app({ id: "closed", status: "offer" }), learner },
        { application: app({ id: "nodate", deadline: undefined }), learner },
      ],
      NOW
    );
    expect(risk.overdue.map((row) => row.application.id)).toEqual(["overdue"]);
    expect(risk.dueSoon.map((row) => row.application.id)).toEqual(["soon"]);
  });
});
