import type {
  Application,
  ApplicationChecklistItem,
  ApplicationStatus,
  Course,
  Learner,
} from "@/lib/types";

/**
 * Default application checklist for a programme.
 *
 * The list is generated from the catalogue row and the learner's profile, so
 * it reflects real requirements (English test, portfolio for design/media,
 * visa documents for an overseas destination) rather than a generic to-do
 * list. Learners can add, remove and annotate items afterwards.
 */
export function buildDefaultChecklist(
  course: Course,
  learner?: Learner | null
): ApplicationChecklistItem[] {
  const items: Omit<ApplicationChecklistItem, "done">[] = [
    {
      id: "form",
      label: "Application form completed",
      required: true,
    },
    {
      id: "transcripts",
      label: "Academic transcripts and marksheets",
      required: true,
    },
    {
      id: "statement",
      label: "Statement of purpose / essays",
      required: true,
    },
    {
      id: "recommendation",
      label: "Letters of recommendation",
      required: course.level === "PG" || course.level === "UG",
    },
    {
      id: "fee",
      label: "Application fee paid",
      required: true,
    },
  ];

  if (course.eligibility.englishRequirement) {
    items.push({
      id: "english",
      label: `English test report (${course.eligibility.englishRequirement})`,
      required: true,
    });
  }

  if (course.eligibility.requiredSubjects.length) {
    items.push({
      id: "subjects",
      label: `Subject evidence: ${course.eligibility.requiredSubjects.join(", ")}`,
      required: true,
    });
  }

  if (learner?.stage === "professional" || course.level === "PG") {
    items.push({ id: "cv", label: "CV / resume", required: true });
  }

  if (
    course.clusterIds.some((cluster) => cluster === "design" || cluster === "media")
  ) {
    items.push({ id: "portfolio", label: "Portfolio", required: true });
  }

  const international = course.countries.some((country) => country !== "India");
  if (international) {
    items.push(
      { id: "passport", label: "Passport (valid 6+ months)", required: true },
      { id: "finance", label: "Proof of funds / financial documents", required: true },
      { id: "visa", label: "Student visa application", required: true }
    );
  }

  return items.map((item) => ({ ...item, done: false }));
}

export interface ChecklistProgress {
  done: number;
  total: number;
  percent: number;
  missingRequired: ApplicationChecklistItem[];
}

export function checklistProgress(
  checklist: ApplicationChecklistItem[]
): ChecklistProgress {
  const done = checklist.filter((item) => item.done).length;
  const total = checklist.length;
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    missingRequired: checklist.filter((item) => item.required && !item.done),
  };
}

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "planned",
  "preparing",
  "submitted",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  planned: "Planned",
  preparing: "Preparing",
  submitted: "Submitted",
  interview: "Interview",
  offer: "Offer",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

/** Statuses that still need work from the learner or counsellor. */
export const OPEN_APPLICATION_STATUSES: ApplicationStatus[] = [
  "planned",
  "preparing",
  "submitted",
  "interview",
];

export function isOpenApplication(application: Application) {
  return OPEN_APPLICATION_STATUSES.includes(application.status);
}

export function daysUntil(value: string | undefined, now = new Date()) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function applicationUrgency(application: Application, now = new Date()) {
  if (!isOpenApplication(application)) return "closed" as const;
  const days = daysUntil(application.deadline, now);
  if (days === null) return "no_deadline" as const;
  if (days < 0) return "overdue" as const;
  if (days <= 7) return "soon" as const;
  if (days <= 30) return "upcoming" as const;
  return "later" as const;
}
