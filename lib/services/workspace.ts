import "server-only";
import type {
  ApplicationView,
  Assessment,
  CareerPath,
  Milestone,
  PlanWithMilestones,
  QuarterlyReview,
  Report,
  Satisfaction,
  ShortlistItemView,
} from "@/lib/types";
import { getStore } from "@/lib/store";
import { computeClusterFits, rankCareerPaths, type ClusterFit } from "@/lib/catalogue/matching";
import { evaluateEligibility } from "@/lib/catalogue/eligibility";
import { daysUntil, isOpenApplication } from "@/lib/applications/checklist";

export interface LearnerWorkspace {
  assessment: Assessment | null;
  report: Report | null;
  plan: PlanWithMilestones | null;
  shortlist: ShortlistItemView[];
  applications: ApplicationView[];
  reviews: QuarterlyReview[];
  satisfaction: Satisfaction | null;
  fits: ClusterFit[];
  paths: { path: CareerPath; fit: ClusterFit }[];
  progress: {
    milestonesDone: number;
    milestonesTotal: number;
    percent: number;
    nextMilestone: Milestone | null;
    overdue: Milestone[];
  };
  applicationSummary: {
    total: number;
    open: number;
    submitted: number;
    offers: number;
    overdue: number;
    nextDeadline: ApplicationView | null;
  };
}

export async function getLearnerWorkspace(
  learnerId: string
): Promise<LearnerWorkspace> {
  const store = getStore();
  const [
    assessment,
    report,
    planRow,
    shortlistRows,
    applicationRows,
    reviews,
    satisfaction,
    courses,
    learner,
  ] = await Promise.all([
    store.getAssessmentByLearner(learnerId),
    store.getReportByLearner(learnerId),
    store.getPlanByLearner(learnerId),
    store.listShortlist(learnerId),
    store.listApplications(learnerId),
    store.listReviews(learnerId),
    store.getSatisfactionByLearner(learnerId),
    store.listCourses(),
    store.getLearnerById(learnerId),
  ]);

  const milestones = planRow ? await store.listMilestones(planRow.id) : [];
  const plan: PlanWithMilestones | null = planRow
    ? { ...planRow, milestones }
    : null;

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const shortlist: ShortlistItemView[] = shortlistRows
    .filter((s) => s.status !== "removed")
    .map((item) => {
      const course = courseMap.get(item.courseId);
      if (!course || !learner) return null;
      const eligibility = evaluateEligibility(learner, course);
      return {
        ...item,
        course,
        eligibility: { status: eligibility.status, messages: eligibility.messages },
      };
    })
    .filter((item): item is ShortlistItemView => item !== null)
    .sort((a, b) => a.rank - b.rank);

  const applications: ApplicationView[] = applicationRows
    .map((application) => {
      const course = courseMap.get(application.courseId);
      return course ? { ...application, course } : null;
    })
    .filter((item): item is ApplicationView => item !== null)
    .sort((a, b) => {
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aDeadline - bDeadline;
    });

  const openApplications = applications.filter(isOpenApplication);
  const nextDeadline =
    openApplications
      .filter((application) => application.deadline)
      .sort(
        (a, b) =>
          new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
      )[0] ?? null;

  const done = milestones.filter((m) => m.status === "done").length;
  const now = Date.now();
  const nextMilestone =
    milestones
      .filter((m) => m.status !== "done")
      .sort((a, b) => a.order - b.order)[0] ?? null;
  const overdue = milestones.filter(
    (m) => m.status !== "done" && new Date(m.dueDate).getTime() < now
  );

  const fits = assessment?.scores ? computeClusterFits(assessment.scores) : [];
  const paths = assessment?.scores ? rankCareerPaths(assessment.scores, 6) : [];

  return {
    assessment,
    report,
    plan,
    shortlist,
    applications,
    reviews,
    satisfaction,
    fits,
    paths,
    progress: {
      milestonesDone: done,
      milestonesTotal: milestones.length,
      percent: milestones.length ? Math.round((done / milestones.length) * 100) : 0,
      nextMilestone,
      overdue,
    },
    applicationSummary: {
      total: applications.length,
      open: openApplications.length,
      submitted: applications.filter((application) => application.status === "submitted").length,
      offers: applications.filter((application) => application.status === "offer").length,
      overdue: openApplications.filter((application) => {
        const days = daysUntil(application.deadline);
        return days !== null && days < 0;
      }).length,
      nextDeadline,
    },
  };
}

export async function getAssignedCounsellors() {
  const store = getStore();
  const users = await store.listUsers();
  return users.filter((u) => u.role === "counsellor" || u.role === "admin");
}
