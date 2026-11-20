import type {
  ApplicationView,
  Learner,
  Milestone,
  Plan,
  QuarterlyReview,
} from "@/lib/types";
import { checklistProgress, isOpenApplication } from "@/lib/applications/checklist";
import type { IcsEvent } from "./ics";

export interface LearnerCalendarInput {
  learner: Learner;
  plan: (Plan & { milestones: Milestone[] }) | null;
  reviews: QuarterlyReview[];
  applications: ApplicationView[];
}

/**
 * Calendar events for a learner: open milestones, scheduled reviews and
 * application deadlines. Guided by the same records the workspace shows, so
 * the exported calendar cannot drift from the plan.
 */
export function buildLearnerEvents(input: LearnerCalendarInput): IcsEvent[] {
  const events: IcsEvent[] = [];

  for (const milestone of input.plan?.milestones ?? []) {
    if (milestone.status === "done") continue;
    events.push({
      uid: `milestone-${milestone.id}@northstar`,
      start: milestone.dueDate,
      allDay: true,
      title: `Milestone: ${milestone.title}`,
      description: [
        `Quarter ${milestone.quarter} · ${milestone.status.replace(/_/g, " ")}`,
        milestone.description,
        "Indicative plan item. Confirm deadlines and requirements with the institution.",
      ].join("\n\n"),
      alarmDaysBefore: 3,
    });
  }

  for (const review of input.reviews) {
    if (review.completedAt) continue;
    events.push({
      uid: `review-${review.id}@northstar`,
      start: review.scheduledFor,
      allDay: true,
      title: `Quarterly review Q${review.quarter} ${review.year}`,
      description:
        "Bring evidence for completed milestones, any change in budget or destination, and one decision you want to leave with.",
      alarmDaysBefore: 2,
    });
  }

  for (const application of input.applications) {
    if (!application.deadline || !isOpenApplication(application)) continue;
    const progress = checklistProgress(application.checklist);
    events.push({
      uid: `application-${application.id}@northstar`,
      start: application.deadline,
      allDay: true,
      title: `Apply: ${application.course.title}`,
      description: [
        `${application.course.provider} · ${application.course.level}`,
        `Status: ${application.status}`,
        `Checklist: ${progress.done}/${progress.total} (${progress.percent}%)`,
        "Deadline is indicative. Verify it in the institution's portal.",
      ].join("\n"),
      alarmDaysBefore: 7,
    });
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
