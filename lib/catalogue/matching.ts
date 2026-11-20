import type {
  AssessmentScores,
  BigFive,
  CareerCluster,
  CareerPath,
  Course,
  CourseFilters,
  Learner,
  MatchFactor,
} from "@/lib/types";
import { CAREER_CLUSTERS } from "./clusters";
import { CAREER_PATHS } from "./career-paths";
import { evaluateEligibility, type EligibilityResult } from "./eligibility";
import { clamp } from "@/lib/utils/format";

export interface ClusterFit {
  cluster: CareerCluster;
  score: number;
  factors: {
    interest: number;
    aptitude: number;
    personality: number;
  };
  rationale: string;
}

export interface CourseMatch {
  course: Course;
  fitScore: number;
  factors: MatchFactor[];
  eligibility: EligibilityResult;
  rationale: string;
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / (values.length || 1);
}

/** Pearson correlation, used to compare the *shape* of an interest profile. */
export function pearson(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) return 0;
  const am = mean(a);
  const bm = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] - am;
    const y = b[i] - bm;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

const RIASEC_ORDER = ["R", "I", "A", "S", "E", "C"] as const;

export function computeClusterFits(scores: AssessmentScores): ClusterFit[] {
  const learnerInterest = RIASEC_ORDER.map((k) => scores.interest[k]);

  return CAREER_CLUSTERS.map((cluster) => {
    const ideal = RIASEC_ORDER.map((k) => cluster.riasecIdeal[k]);
    const r = pearson(learnerInterest, ideal);
    // Centre the correlation at 50 so a flat profile reads as neutral,
    // not as a poor fit.
    const interest = clamp(50 + r * 50, 0, 100);

    let aptitudeWeight = 0;
    let aptitudeSum = 0;
    for (const [dim, weight] of Object.entries(cluster.aptitudeWeights)) {
      aptitudeSum += scores.aptitude[dim as keyof typeof scores.aptitude] * weight;
      aptitudeWeight += weight;
    }
    const aptitude = aptitudeWeight ? clamp(aptitudeSum / aptitudeWeight, 0, 100) : 50;

    const prefs = Object.entries(cluster.personalityPreference) as [
      BigFive,
      { direction: 1 | -1; weight: number },
    ][];
    let personality = 50;
    if (prefs.length) {
      let sum = 0;
      let total = 0;
      for (const [trait, pref] of prefs) {
        const value = scores.personality[trait];
        const alignment = pref.direction === 1 ? value : 100 - value;
        sum += alignment * pref.weight;
        total += pref.weight;
      }
      personality = total ? clamp(50 + (sum / total - 50) * 0.8, 0, 100) : 50;
    }

    const score = Math.round(
      clamp(interest * 0.5 + aptitude * 0.3 + personality * 0.2, 0, 100)
    );

    const strongest = [...RIASEC_ORDER]
      .sort((a, b) => scores.interest[b] - scores.interest[a])
      .slice(0, 2)
      .join(" and ");

    const rationale = `Your ${strongest} interest themes are the strongest part of this match. Aptitude contributes ${Math.round(aptitude)}/100 and work-style alignment ${Math.round(personality)}/100.`;

    return {
      cluster,
      score,
      factors: {
        interest: Math.round(interest),
        aptitude: Math.round(aptitude),
        personality: Math.round(personality),
      },
      rationale,
    };
  }).sort((a, b) => b.score - a.score);
}

export function rankCareerPaths(
  scores: AssessmentScores,
  limit = 6
): { path: CareerPath; fit: ClusterFit }[] {
  const fits = new Map(computeClusterFits(scores).map((f) => [f.cluster.id, f]));
  return CAREER_PATHS.map((path) => {
    const fit = fits.get(path.clusterId);
    return { path, fit: fit! };
  })
    .filter((p) => Boolean(p.fit))
    .sort(
      (a, b) =>
        b.fit.score - a.fit.score ||
        b.path.demandIndex - a.path.demandIndex ||
        a.path.title.localeCompare(b.path.title)
    )
    .slice(0, limit);
}

function budgetFit(learner: Learner, course: Course) {
  if (!learner.budgetMaxINR || learner.budgetMaxINR <= 0) {
    return { score: 60, note: "No programme budget set — confirm affordability." };
  }
  if (course.feeMinINR <= learner.budgetMaxINR) {
    const headroom = 1 - course.feeMinINR / learner.budgetMaxINR;
    return {
      score: clamp(85 + headroom * 15, 0, 100),
      note:
        course.feeMinINR <= learner.budgetMinINR
          ? "Within your stated minimum budget; a lower-cost option."
          : "Fits inside your stated programme budget.",
    };
  }
  const over = (course.feeMinINR - learner.budgetMaxINR) / learner.budgetMaxINR;
  return {
    score: clamp(70 - over * 120, 0, 100),
    note: `Indicative fees exceed your stated budget by about ${Math.round(over * 100)}%.`,
  };
}

function preferenceFit(learner: Learner, course: Course) {
  let score = 55;
  const notes: string[] = [];

  if (learner.preferredCountries.length) {
    const match = course.countries.some((c) =>
      learner.preferredCountries.includes(c)
    );
    if (match) {
      score += 25;
      notes.push("in a preferred destination");
    } else {
      score -= 20;
      notes.push("outside your preferred destinations");
    }
  }

  if (learner.preferredModes.length) {
    const modeMatch = course.modes.some((m) => learner.preferredModes.includes(m));
    if (modeMatch) {
      score += 20;
      notes.push("matches your study mode");
    } else {
      score -= 20;
      notes.push("a different study mode");
    }
  }

  if (learner.intendedClusterId && course.clusterIds.includes(learner.intendedClusterId)) {
    score += 5;
    notes.push("aligned with the direction you selected");
  }

  return {
    score: clamp(score, 0, 100),
    note: notes.length ? notes.join(", ") + "." : "No strong preference conflicts.",
  };
}

function outcomeFit(course: Course) {
  switch (course.outcomes.placementBand) {
    case "high":
      return { score: 90, note: "Catalogue outcome band: strong." };
    case "moderate":
      return { score: 72, note: "Catalogue outcome band: moderate." };
    case "emerging":
      return { score: 58, note: "Catalogue outcome band: emerging." };
    default:
      return { score: 45, note: "Outcomes not disclosed at programme level." };
  }
}

export function matchCourse(
  learner: Learner,
  scores: AssessmentScores,
  course: Course,
  fits?: ClusterFit[]
): CourseMatch {
  const clusterFits = fits ?? computeClusterFits(scores);
  const relevant = clusterFits.filter((f) => course.clusterIds.includes(f.cluster.id));
  const best = relevant.sort((a, b) => b.score - a.score)[0];
  const clusterScore = best?.score ?? 40;
  const eligibility = evaluateEligibility(learner, course);
  const budget = budgetFit(learner, course);
  const preference = preferenceFit(learner, course);
  const outcome = outcomeFit(course);

  const eligibilityScore =
    eligibility.status === "eligible"
      ? 100
      : eligibility.status === "conditional"
        ? 72
        : 0;

  const factors: MatchFactor[] = [
    {
      label: "Career fit",
      score: clusterScore,
      weight: 0.4,
      note: best
        ? `Interest and aptitude pattern aligns with ${best.cluster.name}.`
        : "No direct cluster alignment in the catalogue.",
    },
    {
      label: "Eligibility",
      score: eligibilityScore,
      weight: 0.2,
      note: eligibility.messages[0] ?? "Eligibility assessed against published criteria.",
    },
    { label: "Budget", score: Math.round(budget.score), weight: 0.15, note: budget.note },
    {
      label: "Preferences",
      score: Math.round(preference.score),
      weight: 0.15,
      note: preference.note,
    },
    { label: "Outcomes", score: outcome.score, weight: 0.1, note: outcome.note },
  ];

  const fitScore = Math.round(
    clamp(
      factors.reduce((sum, f) => sum + f.score * f.weight, 0),
      0,
      100
    )
  );

  return {
    course,
    fitScore,
    factors,
    eligibility,
    rationale: buildRationale(course, best, eligibility, budget.note),
  };
}

function buildRationale(
  course: Course,
  best: ClusterFit | undefined,
  eligibility: EligibilityResult,
  budgetNote: string
) {
  const bits: string[] = [];
  if (best) bits.push(`${best.score}% pattern match with ${best.cluster.shortName}`);
  bits.push(
    eligibility.status === "eligible"
      ? "published criteria appear met"
      : eligibility.status === "conditional"
        ? "some criteria need confirming"
        : "criteria not currently met"
  );
  bits.push(budgetNote.replace(/\.$/, ""));
  return `${course.title} at ${course.provider}: ${bits.join("; ")}.`;
}

/**
 * The level a learner can sensibly enter next. A school student is
 * looking at UG and below; everyone else is looking at PG, diplomas
 * and certificates. Without this filter a final-year B.Com student
 * would be shown undergraduate degrees.
 */
export function allowedLevels(learner: Learner): Course["level"][] {
  if (learner.stage === "school") return ["UG", "Diploma", "Certificate"];
  return ["PG", "Diploma", "Certificate"];
}

export function matchCourses(
  learner: Learner,
  scores: AssessmentScores,
  courses: Course[],
  options: {
    includeIneligible?: boolean;
    limit?: number;
    includeAllLevels?: boolean;
  } = {}
): CourseMatch[] {
  const fits = computeClusterFits(scores);
  const levels = allowedLevels(learner);
  const matches = courses
    .filter((c) => c.isActive)
    .filter((c) => options.includeAllLevels || levels.includes(c.level))
    .map((course) => matchCourse(learner, scores, course, fits))
    .filter((m) => options.includeIneligible || m.eligibility.status !== "not_eligible")
    .sort((a, b) => b.fitScore - a.fitScore || a.course.feeMinINR - b.course.feeMinINR);
  return options.limit ? matches.slice(0, options.limit) : matches;
}

export interface SuggestedShortlistItem {
  courseId: string;
  rank: number;
  fitScore: number;
  rationale: string;
  factors: MatchFactor[];
}

export function buildSuggestedShortlist(
  learner: Learner,
  scores: AssessmentScores,
  courses: Course[],
  limit = 5
): SuggestedShortlistItem[] {
  // Prefer a spread of clusters so the shortlist is useful for a
  // counselling conversation rather than five near-identical rows.
  const matches = matchCourses(learner, scores, courses, { limit: 40 });
  const chosen: CourseMatch[] = [];
  const seenClusters = new Map<string, number>();
  for (const match of matches) {
    const clusterId = match.course.clusterIds[0] ?? "other";
    const count = seenClusters.get(clusterId) ?? 0;
    if (count >= 2) continue;
    chosen.push(match);
    seenClusters.set(clusterId, count + 1);
    if (chosen.length >= limit) break;
  }
  // Backfill if the catalogue was too narrow.
  for (const match of matches) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(match)) chosen.push(match);
  }
  return chosen.map((m, index) => ({
    courseId: m.course.id,
    rank: index + 1,
    fitScore: m.fitScore,
    rationale: m.rationale,
    factors: m.factors,
  }));
}

export function searchCourses(courses: Course[], filters: CourseFilters): Course[] {
  const q = filters.query?.trim().toLowerCase();
  return courses.filter((course) => {
    if (!course.isActive) return false;
    if (filters.level && course.level !== filters.level) return false;
    if (filters.discipline && course.discipline !== filters.discipline) return false;
    if (filters.country && !course.countries.includes(filters.country)) return false;
    if (filters.mode && !course.modes.includes(filters.mode)) return false;
    if (filters.maxFeeINR && course.feeMinINR > filters.maxFeeINR) return false;
    if (filters.clusterId && !course.clusterIds.includes(filters.clusterId)) return false;
    if (filters.providerType && course.providerType !== filters.providerType) return false;
    if (q) {
      const haystack = [
        course.title,
        course.provider,
        course.discipline,
        course.summary,
        ...course.skills,
        ...course.locations,
        ...course.countries,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
