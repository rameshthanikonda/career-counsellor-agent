import "server-only";
import type {
  ApplicationView,
  AssessmentScores,
  CareerPath,
  Course,
  Learner,
  Mode,
} from "@/lib/types";
import type { ClusterFit } from "@/lib/catalogue/matching";
import { matchCourse, searchCourses } from "@/lib/catalogue/matching";
import {
  APPLICATION_STATUS_LABELS,
  checklistProgress,
  daysUntil,
} from "@/lib/applications/checklist";
import type { FunctionDeclaration } from "./gemini";
import { formatFeeRange } from "@/lib/utils/format";

export interface AdvisorContext {
  learner: Learner;
  scores: AssessmentScores | null;
  courses: Course[];
  clusters: { id: string; name: string; summary: string }[];
  paths: { path: CareerPath; fit: ClusterFit }[];
  applications: ApplicationView[];
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  summary: string;
}

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_courses",
    description:
      "Search the Northstar course catalogue. Returns at most six programmes with indicative fees, eligibility status and fit score. Use this for any question about courses, fees, countries, levels or modes.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Free-text search term, e.g. 'data science' or 'design'." },
        level: {
          type: "STRING",
          description: "One of UG, PG, Diploma, Certificate.",
        },
        country: { type: "STRING", description: "Country name, e.g. India or United Kingdom." },
        mode: { type: "STRING", description: "One of on_campus, online, hybrid." },
        max_fee_inr: {
          type: "NUMBER",
          description: "Maximum total programme fee in Indian rupees.",
        },
      },
    },
  },
  {
    name: "compare_courses",
    description:
      "Compare two or three catalogue programmes side by side on fees, duration, eligibility, mode and outcome band. Use course IDs from search_courses.",
    parameters: {
      type: "OBJECT",
      properties: {
        course_ids: {
          type: "ARRAY",
          description: "Two or three course IDs.",
          items: { type: "STRING" },
        },
      },
      required: ["course_ids"],
    },
  },
  {
    name: "build_career_path",
    description:
      "Return the career map for a path: entry roles, progression stages, indicative salary bands and skills. Use this for career or progression questions.",
    parameters: {
      type: "OBJECT",
      properties: {
        path_id: { type: "STRING", description: "Career path ID if known." },
        cluster_id: { type: "STRING", description: "Career cluster ID to pick the best-fit path." },
      },
    },
  },
  {
    name: "get_learner_summary",
    description:
      "Return a summary of the current learner's assessment scores, top clusters and constraints. Only ever returns data for the signed-in learner.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "get_application_status",
    description:
      "Return the learner's tracked applications: programme, status, deadline, document checklist progress and notes. Use this for any question about deadlines, documents, submissions or application progress.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "list_clusters",
    description: "List the career clusters the matching engine understands, with short descriptions.",
    parameters: { type: "OBJECT", properties: {} },
  },
];

function level(value: unknown): Course["level"] | undefined {
  const allowed = ["UG", "PG", "Diploma", "Certificate"];
  return typeof value === "string" && allowed.includes(value)
    ? (value as Course["level"])
    : undefined;
}

function mode(value: unknown): Mode | undefined {
  const allowed = ["on_campus", "online", "hybrid"];
  return typeof value === "string" && allowed.includes(value)
    ? (value as Mode)
    : undefined;
}

function shortCourse(ctx: AdvisorContext, course: Course) {
  const match = ctx.scores
    ? matchCourse(ctx.learner, ctx.scores, course)
    : null;
  return {
    courseId: course.id,
    title: course.title,
    provider: course.provider,
    level: course.level,
    countries: course.countries,
    modes: course.modes,
    durationMonths: course.durationMonths,
    feeRange: formatFeeRange(course.feeMinINR, course.feeMaxINR),
    feeMinINR: course.feeMinINR,
    eligibilityStatus: match?.eligibility.status ?? "unknown",
    eligibilityNote: match?.eligibility.messages[0] ?? course.eligibility.notes,
    fitScore: match?.fitScore ?? null,
    outcomeBand: course.outcomes.placementBand,
    outcomeNote: course.outcomes.outcomeNote,
    dataSource: course.dataSource,
  };
}

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AdvisorContext
): { result: unknown; summary: string } {
  switch (name) {
    case "search_courses": {
      const query = typeof args.query === "string" ? args.query : undefined;
      const country = typeof args.country === "string" ? args.country : undefined;
      const maxFee =
        typeof args.max_fee_inr === "number" ? args.max_fee_inr : undefined;
      const filtered = searchCourses(ctx.courses, {
        query,
        level: level(args.level),
        country,
        mode: mode(args.mode),
        maxFeeINR: maxFee,
      });
      const scored = filtered
        .map((course) => ({ course, match: ctx.scores ? matchCourse(ctx.learner, ctx.scores, course) : null }))
        .sort((a, b) => (b.match?.fitScore ?? 0) - (a.match?.fitScore ?? 0))
        .slice(0, 6)
        .map(({ course }) => shortCourse(ctx, course));

      const summary = `Searched ${filtered.length} programmes${
        query ? ` for "${query}"` : ""
      }, returned ${scored.length}.`;
      return {
        result: {
          count: scored.length,
          programmes: scored,
          note:
            "Fees and eligibility are indicative from the catalogue and must be verified with the institution. No placement or salary is guaranteed.",
        },
        summary,
      };
    }

    case "compare_courses": {
      const ids = Array.isArray(args.course_ids)
        ? args.course_ids.filter((id): id is string => typeof id === "string").slice(0, 3)
        : [];
      const chosen = ids
        .map((id) => ctx.courses.find((c) => c.id === id))
        .filter((c): c is Course => Boolean(c));
      const rows = chosen.map((course) => {
        const match = ctx.scores
          ? matchCourse(ctx.learner, ctx.scores, course)
          : null;
        return {
          courseId: course.id,
          title: course.title,
          provider: course.provider,
          level: course.level,
          durationMonths: course.durationMonths,
          feeRange: formatFeeRange(course.feeMinINR, course.feeMaxINR),
          countries: course.countries,
          modes: course.modes,
          accreditation: course.accreditation,
          eligibilityStatus: match?.eligibility.status ?? "unknown",
          eligibilityMessages: match?.eligibility.messages ?? [],
          outcomeBand: course.outcomes.placementBand,
          outcomeNote: course.outcomes.outcomeNote,
          fitScore: match?.fitScore ?? null,
        };
      });
      return {
        result: {
          programmes: rows,
          note:
            "Indicative catalogue data. Admission is competitive and not guaranteed; verify current fees and criteria with each institution.",
        },
        summary: `Compared ${rows.length} programmes.`,
      };
    }

    case "build_career_path": {
      const pathId = typeof args.path_id === "string" ? args.path_id : undefined;
      const clusterId =
        typeof args.cluster_id === "string" ? args.cluster_id : undefined;
      let entry = ctx.paths.find((p) => p.path.id === pathId);
      if (!entry && clusterId) {
        entry = ctx.paths.find((p) => p.path.clusterId === clusterId);
      }
      entry = entry ?? ctx.paths[0];
      if (!entry) {
        return {
          result: { error: "No career path available." },
          summary: "No career path found.",
        };
      }
      const { path, fit } = entry;
      return {
        result: {
          pathId: path.id,
          title: path.title,
          cluster: path.clusterId,
          fitScore: fit.score,
          summary: path.summary,
          entryRoles: path.entryRoles,
          skills: path.skills,
          educationRoutes: path.educationRoutes,
          progression: path.progression.map((stage) => ({
            title: stage.title,
            years: `${stage.yearsFrom}–${stage.yearsTo}`,
            indicativeSalaryINR: `${stage.indicativeSalaryMinINR}–${stage.indicativeSalaryMaxINR}`,
            skills: stage.skills,
          })),
          demandNote: path.demandNote,
          note:
            "Salary bands are broad indicative planning ranges, not offers or guarantees. Validate against current market data.",
        },
        summary: `Built the ${path.title} career map.`,
      };
    }

    case "get_learner_summary": {
      return {
        result: {
          name: ctx.learner.fullName.split(" ")[0],
          stage: ctx.learner.stage,
          city: ctx.learner.city,
          currentEducation: ctx.learner.currentEducation,
          percentage: ctx.learner.percentage ?? null,
          targetIntake: ctx.learner.targetIntake,
          budgetINR: {
            min: ctx.learner.budgetMinINR,
            max: ctx.learner.budgetMaxINR,
          },
          preferredCountries: ctx.learner.preferredCountries,
          preferredModes: ctx.learner.preferredModes,
          careerGoal: ctx.learner.careerGoal,
          assessment: ctx.scores
            ? {
                interestCode: ctx.scores.topInterestCode,
                riasec: ctx.scores.interest,
                aptitude: ctx.scores.aptitude,
                personality: ctx.scores.personality,
                responseQuality: ctx.scores.quality.band,
              }
            : null,
          topClusters: ctx.paths.slice(0, 3).map((p) => ({
            cluster: p.fit.cluster.name,
            fit: p.fit.score,
            path: p.path.title,
          })),
        },
        summary: "Retrieved the signed-in learner's summary.",
      };
    }

    case "list_clusters": {
      return {
        result: { clusters: ctx.clusters },
        summary: "Listed career clusters.",
      };
    }

    case "get_application_status": {
      const rows = ctx.applications.map((application) => {
        const progress = checklistProgress(application.checklist);
        return {
          applicationId: application.id,
          courseId: application.courseId,
          programme: application.course.title,
          provider: application.course.provider,
          status: application.status,
          statusLabel: APPLICATION_STATUS_LABELS[application.status],
          deadline: application.deadline ?? null,
          daysUntilDeadline: daysUntil(application.deadline),
          checklist: {
            done: progress.done,
            total: progress.total,
            percent: progress.percent,
            missingRequired: progress.missingRequired.map((item) => item.label),
          },
          notes: application.notes ?? null,
        };
      });
      return {
        result: {
          count: rows.length,
          applications: rows,
          note:
            "Deadlines are tracked reminders, not institutional confirmations. Always verify in the programme portal. No admission outcome is guaranteed.",
        },
        summary: `Retrieved ${rows.length} tracked application(s).`,
      };
    }

    default:
      return {
        result: { error: `Unknown tool: ${name}` },
        summary: `Unknown tool ${name}.`,
      };
  }
}
