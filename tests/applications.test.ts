import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/types";
import {
  applicationUrgency,
  buildDefaultChecklist,
  checklistProgress,
  daysUntil,
  isOpenApplication,
} from "@/lib/applications/checklist";
import { makeCourse, makeLearner } from "./fixtures";

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "app-test",
    learnerId: "l-test",
    courseId: "course-test",
    status: "preparing",
    deadline: "2026-12-01T00:00:00.000Z",
    checklist: [],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("default application checklist", () => {
  it("adds English, portfolio and visa items for an international design PG", () => {
    const course = makeCourse({
      level: "PG",
      clusterIds: ["design"],
      countries: ["United Kingdom"],
      eligibility: {
        minPercentage: 60,
        requiredSubjects: ["Portfolio"],
        englishRequirement: "IELTS 6.5",
      },
    });
    const checklist = buildDefaultChecklist(course, makeLearner());
    const ids = checklist.map((item) => item.id);
    expect(ids).toContain("english");
    expect(ids).toContain("portfolio");
    expect(ids).toContain("passport");
    expect(ids).toContain("visa");
    expect(ids).toContain("cv");
    expect(checklist.every((item) => item.done === false)).toBe(true);
  });

  it("keeps a domestic UG checklist lean", () => {
    const course = makeCourse({
      level: "UG",
      clusterIds: ["finance"],
      countries: ["India"],
      eligibility: { minPercentage: 60, requiredSubjects: [] },
    });
    const ids = buildDefaultChecklist(course, makeLearner({ stage: "school" })).map(
      (item) => item.id
    );
    expect(ids).not.toContain("english");
    expect(ids).not.toContain("passport");
    expect(ids).not.toContain("cv");
    expect(ids).toContain("form");
  });
});

describe("checklist progress", () => {
  it("reports done, total, percent and missing required items", () => {
    const checklist = buildDefaultChecklist(makeCourse(), makeLearner());
    const first = checklist[0];
    const progress = checklistProgress([
      { ...first, done: true },
      ...checklist.slice(1),
    ]);
    expect(progress.total).toBe(checklist.length);
    expect(progress.done).toBe(1);
    expect(progress.percent).toBe(Math.round((1 / checklist.length) * 100));
    expect(progress.missingRequired.length).toBe(checklist.length - 1);
  });

  it("handles an empty checklist", () => {
    expect(checklistProgress([])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
      missingRequired: [],
    });
  });
});

describe("deadlines", () => {
  const now = new Date("2026-11-19T12:00:00.000Z");

  it("counts calendar days rather than raw milliseconds", () => {
    expect(daysUntil("2026-11-19T15:00:00.000Z", now)).toBe(0);
    expect(daysUntil("2026-11-26T01:00:00.000Z", now)).toBe(7);
    expect(daysUntil(undefined, now)).toBeNull();
  });

  it("classifies urgent, overdue and closed applications", () => {
    expect(applicationUrgency(makeApplication({ deadline: "2026-11-21T00:00:00.000Z" }), now)).toBe("soon");
    expect(applicationUrgency(makeApplication({ deadline: "2026-11-01T00:00:00.000Z" }), now)).toBe("overdue");
    expect(applicationUrgency(makeApplication({ deadline: undefined }), now)).toBe("no_deadline");
    expect(applicationUrgency(makeApplication({ status: "offer" }), now)).toBe("closed");
  });

  it("treats only live statuses as open", () => {
    expect(isOpenApplication(makeApplication({ status: "submitted" }))).toBe(true);
    expect(isOpenApplication(makeApplication({ status: "rejected" }))).toBe(false);
    expect(isOpenApplication(makeApplication({ status: "withdrawn" }))).toBe(false);
  });
});
