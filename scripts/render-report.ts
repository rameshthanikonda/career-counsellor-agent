/**
 * Renders a report PDF from the seeded demo database.
 *
 *   npm run report:sample
 *
 * Useful for design review and for regression-checking the renderer without
 * starting the web server. Output goes to ./reports (gitignored).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { createSeedDatabase } from "@/lib/store/seed";
import { evaluateEligibility } from "@/lib/catalogue/eligibility";
import { rankCareerPaths } from "@/lib/catalogue/matching";
import { renderReportPdf } from "@/lib/reports/pdf";
import type { ShortlistItemView } from "@/lib/types";

async function main() {
  const db = createSeedDatabase();
  const report =
    db.reports.find((candidate) => candidate.status === "released") ?? db.reports[0];
  if (!report) throw new Error("The seed database has no report to render.");

  const learner = db.learners.find((candidate) => candidate.id === report.learnerId);
  if (!learner) throw new Error("Report learner not found in seed data.");

  const assessment =
    db.assessments.find((candidate) => candidate.learnerId === learner.id) ?? null;

  const courseById = new Map(db.courses.map((course) => [course.id, course]));
  const shortlist: ShortlistItemView[] = db.shortlists
    .filter((item) => item.learnerId === learner.id && item.status !== "removed")
    .sort((a, b) => a.rank - b.rank)
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

  const paths = assessment?.scores ? rankCareerPaths(assessment.scores, 6) : [];
  const counsellor = report.counsellorId
    ? db.users.find((user) => user.id === report.counsellorId) ?? null
    : null;

  const buffer = await renderReportPdf({
    report,
    learner,
    assessment,
    shortlist,
    plan,
    paths,
    counsellorName: counsellor?.name ?? null,
    audience: "counsellor",
  });

  const outDir = path.join(process.cwd(), "reports");
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "sample-report.pdf");
  await fs.writeFile(outFile, buffer);

  console.log(
    `Rendered ${outFile} (${(buffer.byteLength / 1024).toFixed(0)} KB) for ${learner.fullName} · v${report.version} · ${report.status}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
