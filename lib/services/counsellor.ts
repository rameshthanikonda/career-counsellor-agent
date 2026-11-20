import "server-only";
import type {
  Application,
  Assessment,
  CareerPath,
  Course,
  Learner,
  QuarterlyReview,
  Report,
} from "@/lib/types";
import { getStore } from "@/lib/store";
import { daysUntil, isOpenApplication } from "@/lib/applications/checklist";

export interface QueueRow {
  learner: Learner;
  assessment: Assessment | null;
  report: Report | null;
  nextReview: QuarterlyReview | null;
  applications: Application[];
  priority: number;
  stage: "awaiting_review" | "no_assessment" | "in_progress" | "released";
}

export async function getCounsellorQueue(): Promise<QueueRow[]> {
  const store = getStore();
  const learners = await store.listLearners();
  const rows = await Promise.all(
    learners.map(async (learner) => {
      const [assessment, report, reviews, applications] = await Promise.all([
        store.getAssessmentByLearner(learner.id),
        store.getReportByLearner(learner.id),
        store.listReviews(learner.id),
        store.listApplications(learner.id),
      ]);
      const nextReview =
        reviews
          .filter((r) => !r.completedAt)
          .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0] ?? null;

      let stage: QueueRow["stage"] = "no_assessment";
      let priority = 30;
      if (report?.status === "in_review") {
        stage = "awaiting_review";
        priority = 0;
      } else if (report?.status === "released") {
        stage = "released";
        priority = 20;
      } else if (assessment?.status === "completed") {
        stage = "in_progress";
        priority = 10;
      } else if (assessment?.status === "in_progress") {
        stage = "in_progress";
        priority = 15;
      }

      // An open application past its deadline is an operational risk and
      // should surface above routine released / in-progress rows.
      const overdueApplications = applications.filter((application) => {
        if (!isOpenApplication(application)) return false;
        const days = daysUntil(application.deadline);
        return days !== null && days < 0;
      }).length;
      if (overdueApplications > 0 && priority > 5) priority = 5;

      return {
        learner,
        assessment,
        report,
        nextReview,
        applications,
        priority,
        stage,
      };
    })
  );

  return rows.sort(
    (a, b) =>
      a.priority - b.priority ||
      a.learner.fullName.localeCompare(b.learner.fullName)
  );
}

export interface CounsellorLearnerDetail {
  queueRow: QueueRow;
  reviews: QuarterlyReview[];
  courses: Course[];
  paths: CareerPath[];
  reports: Report[];
}

export async function getCounsellorLearnerDetail(
  learnerId: string
): Promise<CounsellorLearnerDetail | null> {
  const store = getStore();
  const learner = await store.getLearnerById(learnerId);
  if (!learner) return null;
  const [assessment, report, reviews, courses, paths, applications, allReports] =
    await Promise.all([
      store.getAssessmentByLearner(learnerId),
      store.getReportByLearner(learnerId),
      store.listReviews(learnerId),
      store.listCourses(),
      store.listCareerPaths(),
      store.listApplications(learnerId),
      store.listReports(),
    ]);
  const nextReview =
    reviews
      .filter((r) => !r.completedAt)
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0] ?? null;

  return {
    queueRow: {
      learner,
      assessment,
      report,
      nextReview,
      applications,
      priority: report?.status === "in_review" ? 0 : 20,
      stage:
        report?.status === "in_review"
          ? "awaiting_review"
          : report?.status === "released"
            ? "released"
            : assessment?.status === "completed"
              ? "in_progress"
              : "no_assessment",
    },
    reviews,
    courses,
    paths,
    reports: allReports
      .filter((candidate) => candidate.learnerId === learnerId)
      .sort((a, b) => b.version - a.version),
  };
}
