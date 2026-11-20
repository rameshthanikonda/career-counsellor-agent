import "server-only";
import type {
  ApplicationStatus,
  ApplicationView,
  Assessment,
  Learner,
  QuarterlyReview,
  Satisfaction,
  User,
} from "@/lib/types";
import { getStore } from "@/lib/store";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  daysUntil,
  isOpenApplication,
} from "@/lib/applications/checklist";

export interface ApplicationFunnelRow {
  status: ApplicationStatus;
  label: string;
  count: number;
}

export function applicationFunnel(
  applications: { status: ApplicationStatus }[]
): ApplicationFunnelRow[] {
  return APPLICATION_STATUSES.map((status) => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
    count: applications.filter((application) => application.status === status).length,
  }));
}

export interface SatisfactionSummary {
  count: number;
  average: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function satisfactionSummary(items: { score: number }[]): SatisfactionSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const item of items) {
    const score = Math.min(5, Math.max(1, Math.round(item.score))) as 1 | 2 | 3 | 4 | 5;
    distribution[score] += 1;
  }
  return {
    count: items.length,
    average: items.length
      ? Math.round((items.reduce((sum, item) => sum + item.score, 0) / items.length) * 10) / 10
      : null,
    distribution,
  };
}

export interface DeadlineRow {
  application: ApplicationView;
  learner: Learner;
  days: number;
}

export function deadlineRisk(
  applications: { application: ApplicationView; learner: Learner }[],
  now: Date = new Date(),
  windowDays = 14
): { overdue: DeadlineRow[]; dueSoon: DeadlineRow[] } {
  const overdue: DeadlineRow[] = [];
  const dueSoon: DeadlineRow[] = [];
  for (const { application, learner } of applications) {
    if (!isOpenApplication(application) || !application.deadline) continue;
    const days = daysUntil(application.deadline, now);
    if (days === null) continue;
    if (days < 0) overdue.push({ application, learner, days });
    else if (days <= windowDays) dueSoon.push({ application, learner, days });
  }
  return {
    overdue: overdue.sort((a, b) => a.days - b.days),
    dueSoon: dueSoon.sort((a, b) => a.days - b.days),
  };
}

export interface CounsellorCaseload {
  id: string;
  name: string;
  role: User["role"];
  assigned: number;
  openApplications: number;
  awaitingReview: number;
}

export interface CounsellorAnalytics {
  generatedAt: string;
  learners: number;
  byStage: Record<string, number>;
  assessmentsCompleted: number;
  assessmentRate: number;
  reportStatuses: Record<string, number>;
  applicationFunnel: ApplicationFunnelRow[];
  applications: {
    total: number;
    open: number;
    submitted: number;
    offers: number;
    rejected: number;
    overdue: number;
    dueSoon: number;
  };
  deadlines: DeadlineRow[];
  reviewsDue: { review: QuarterlyReview; learner: Learner; days: number }[];
  satisfaction: SatisfactionSummary;
  caseload: CounsellorCaseload[];
  unassigned: number;
}

export async function getCounsellorAnalytics(
  now: Date = new Date()
): Promise<CounsellorAnalytics> {
  const store = getStore();
  const [learners, reports, applications, reviews, satisfaction, users, courses] =
    await Promise.all([
      store.listLearners(),
      store.listReports(),
      store.listApplications(),
      store.listReviews(),
      store.listSatisfaction(),
      store.listUsers(),
      store.listCourses(),
    ]);

  const assessments: (Assessment | null)[] = await Promise.all(
    learners.map((learner) => store.getAssessmentByLearner(learner.id))
  );
  const learnerMap = new Map(learners.map((learner) => [learner.id, learner]));
  const courseMap = new Map(courses.map((course) => [course.id, course]));

  const applicationViews: { application: ApplicationView; learner: Learner }[] =
    applications
      .map((application) => {
        const learner = learnerMap.get(application.learnerId);
        const course = courseMap.get(application.courseId);
        if (!learner || !course) return null;
        return {
          application: { ...application, course },
          learner,
        };
      })
      .filter(
        (row): row is { application: ApplicationView; learner: Learner } => row !== null
      );

  const risk = deadlineRisk(applicationViews, now);
  const open = applicationViews.filter(({ application }) => isOpenApplication(application));

  const byStage = learners.reduce<Record<string, number>>((acc, learner) => {
    acc[learner.stage] = (acc[learner.stage] ?? 0) + 1;
    return acc;
  }, {});

  const completed = assessments.filter(
    (assessment) => assessment?.status === "completed"
  ).length;

  const reportStatuses = reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.status] = (acc[report.status] ?? 0) + 1;
    return acc;
  }, {});

  const staff = users.filter(
    (user) => user.role === "counsellor" || user.role === "admin"
  );
  const caseload: CounsellorCaseload[] = staff
    .map((member) => {
      const assigned = learners.filter((learner) => learner.counsellorId === member.id);
      const assignedIds = new Set(assigned.map((learner) => learner.id));
      return {
        id: member.id,
        name: member.name,
        role: member.role,
        assigned: assigned.length,
        openApplications: open.filter(({ learner }) => assignedIds.has(learner.id)).length,
        awaitingReview: reports.filter(
          (report) =>
            report.status === "in_review" &&
            assignedIds.has(report.learnerId)
        ).length,
      };
    })
    .sort((a, b) => b.assigned - a.assigned || a.name.localeCompare(b.name));

  const reviewsDue = reviews
    .filter((review) => !review.completedAt)
    .map((review) => {
      const learner = learnerMap.get(review.learnerId);
      if (!learner) return null;
      return {
        review,
        learner,
        days: Math.round(
          (new Date(review.scheduledFor).getTime() - now.getTime()) / 86_400_000
        ),
      };
    })
    .filter(
      (row): row is { review: QuarterlyReview; learner: Learner; days: number } =>
        row !== null
    )
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);

  return {
    generatedAt: now.toISOString(),
    learners: learners.length,
    byStage,
    assessmentsCompleted: completed,
    assessmentRate: learners.length ? Math.round((completed / learners.length) * 100) : 0,
    reportStatuses,
    applicationFunnel: applicationFunnel(applications),
    applications: {
      total: applications.length,
      open: open.length,
      submitted: applications.filter((application) => application.status === "submitted").length,
      offers: applications.filter((application) => application.status === "offer").length,
      rejected: applications.filter((application) => application.status === "rejected").length,
      overdue: risk.overdue.length,
      dueSoon: risk.dueSoon.length,
    },
    deadlines: [...risk.overdue, ...risk.dueSoon].slice(0, 10),
    reviewsDue,
    satisfaction: satisfactionSummary(satisfaction as Satisfaction[]),
    caseload,
    unassigned: learners.filter((learner) => !learner.counsellorId).length,
  };
}
