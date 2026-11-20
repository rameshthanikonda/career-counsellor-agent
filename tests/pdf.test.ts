import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "@/lib/store/seed";
import { evaluateEligibility } from "@/lib/catalogue/eligibility";
import { rankCareerPaths } from "@/lib/catalogue/matching";
import { renderReportPdf } from "@/lib/reports/pdf";
import type { ShortlistItemView } from "@/lib/types";

function buildInput() {
  const db = createSeedDatabase();
  const report = db.reports.find((candidate) => candidate.status === "released")!;
  const learner = db.learners.find((candidate) => candidate.id === report.learnerId)!;
  const assessment =
    db.assessments.find((candidate) => candidate.learnerId === learner.id) ?? null;
  const courseById = new Map(db.courses.map((course) => [course.id, course]));

  const shortlist: ShortlistItemView[] = db.shortlists
    .filter((item) => item.learnerId === learner.id && item.status !== "removed")
    .map((item) => {
      const course = courseById.get(item.courseId);
      if (!course) return null;
      const eligibility = evaluateEligibility(learner, course);
      return {
        ...item,
        course,
        eligibility: { status: eligibility.status, messages: eligibility.messages },
      };
    })
    .filter((item): item is ShortlistItemView => item !== null);

  const planRow = db.plans.find((candidate) => candidate.learnerId === learner.id) ?? null;
  const plan = planRow
    ? {
        ...planRow,
        milestones: db.milestones
          .filter((milestone) => milestone.planId === planRow.id)
          .sort((a, b) => a.order - b.order),
      }
    : null;

  return {
    report,
    learner,
    assessment,
    shortlist,
    plan,
    paths: assessment?.scores ? rankCareerPaths(assessment.scores, 6) : [],
    counsellorName: "Meera Iyer",
    audience: "counsellor" as const,
  };
}

describe("report PDF", () => {
  it("renders a valid PDF from the seeded released report", async () => {
    const buffer = await renderReportPdf(buildInput());
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.byteLength).toBeGreaterThan(8_000);
  });

  it("renders a draft without inventing data when the plan and shortlist are missing", async () => {
    const input = buildInput();
    const buffer = await renderReportPdf({
      ...input,
      report: { ...input.report, status: "in_review" },
      shortlist: [],
      plan: null,
      counsellorName: null,
    });
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.byteLength).toBeGreaterThan(5_000);
  });
});
