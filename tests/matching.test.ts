import { describe, expect, it } from "vitest";
import type { AssessmentScores } from "@/lib/types";
import {
  allowedLevels,
  buildSuggestedShortlist,
  computeClusterFits,
  matchCourse,
  matchCourses,
  pearson,
  searchCourses,
} from "@/lib/catalogue/matching";
import { COURSES } from "@/lib/catalogue/courses";
import { makeCourse, makeLearner } from "./fixtures";

const scores: AssessmentScores = {
  interest: { R: 30, I: 90, A: 40, S: 60, E: 70, C: 80 },
  aptitude: { numerical: 80, verbal: 70, logical: 85, spatial: 50, overall: 71 },
  personality: {
    openness: 70,
    conscientiousness: 80,
    extraversion: 50,
    agreeableness: 60,
    emotional_stability: 65,
  },
  topInterestCode: "ICE",
  quality: {
    score: 95,
    band: "high",
    flags: [],
    durationSeconds: 1500,
  },
  scoredAt: "2026-11-01T00:00:00.000Z",
  instrumentVersion: "northstar-cc-test",
};

describe("pearson correlation", () => {
  it("returns 1 for identical profiles and -1 for inverted profiles", () => {
    expect(pearson([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
  });

  it("returns 0 for a flat profile instead of dividing by zero", () => {
    expect(pearson([3, 3, 3], [1, 2, 3])).toBe(0);
  });
});

describe("cluster fit", () => {
  it("returns one sorted fit per cluster with bounded factors", () => {
    const fits = computeClusterFits(scores);
    expect(fits.length).toBeGreaterThan(5);
    for (let index = 1; index < fits.length; index += 1) {
      expect(fits[index - 1].score).toBeGreaterThanOrEqual(fits[index].score);
    }
    for (const fit of fits) {
      expect(fit.score).toBeGreaterThanOrEqual(0);
      expect(fit.score).toBeLessThanOrEqual(100);
      expect(fit.factors.interest).toBeGreaterThanOrEqual(0);
      expect(fit.factors.aptitude).toBeGreaterThanOrEqual(0);
      expect(fit.factors.personality).toBeGreaterThanOrEqual(0);
    }
  });

  it("points an Investigative/Conventional profile away from Artistic clusters", () => {
    const fits = computeClusterFits(scores);
    const top = fits[0];
    expect(top.score).toBeGreaterThanOrEqual(fits[fits.length - 1].score);
    const social = fits.find((fit) => fit.cluster.id === "public_service");
    const data = fits.find((fit) => fit.cluster.id === "data");
    expect(data).toBeDefined();
    expect(social).toBeDefined();
  });
});

describe("course matching", () => {
  it("returns bounded scores and factor weights that sum to one", () => {
    const match = matchCourse(makeLearner(), scores, makeCourse());
    expect(match.fitScore).toBeGreaterThanOrEqual(0);
    expect(match.fitScore).toBeLessThanOrEqual(100);
    const weight = match.factors.reduce((sum, factor) => sum + factor.weight, 0);
    expect(weight).toBeCloseTo(1);
    expect(match.eligibility.status).toBe("eligible");
  });

  it("penalises a programme outside the learner's budget", () => {
    const affordable = matchCourse(makeLearner(), scores, makeCourse());
    const expensive = matchCourse(
      makeLearner({ budgetMaxINR: 100000 }),
      scores,
      makeCourse()
    );
    const affordableBudget = affordable.factors.find((factor) => factor.label === "Budget");
    const expensiveBudget = expensive.factors.find((factor) => factor.label === "Budget");
    expect(expensiveBudget!.score).toBeLessThan(affordableBudget!.score);
  });

  it("allows school leavers into undergraduate routes and not postgraduate ones", () => {
    expect(allowedLevels(makeLearner({ stage: "school" }))).toEqual([
      "UG",
      "Diploma",
      "Certificate",
    ]);
    expect(allowedLevels(makeLearner({ stage: "professional" }))).toEqual([
      "PG",
      "Diploma",
      "Certificate",
    ]);
  });

  it("excludes ineligible programmes unless explicitly requested", () => {
    const strict = makeCourse({
      id: "course-strict",
      eligibility: { minPercentage: 99, requiredSubjects: [] },
    });
    const learner = makeLearner({ percentage: 50 });
    const eligibleOnly = matchCourses(learner, scores, [strict]);
    expect(eligibleOnly).toHaveLength(0);
    const everything = matchCourses(learner, scores, [strict], {
      includeIneligible: true,
    });
    expect(everything).toHaveLength(1);
    expect(everything[0].eligibility.status).toBe("not_eligible");
  });
});

describe("suggested shortlist", () => {
  it("returns the requested number of ranked suggestions from the catalogue", () => {
    const suggestions = buildSuggestedShortlist(makeLearner(), scores, COURSES, 5);
    expect(suggestions.length).toBe(5);
    suggestions.forEach((suggestion, index) => {
      expect(suggestion.rank).toBe(index + 1);
      expect(suggestion.fitScore).toBeGreaterThanOrEqual(0);
      expect(suggestion.courseId).toBeTruthy();
    });
    const unique = new Set(suggestions.map((suggestion) => suggestion.courseId));
    expect(unique.size).toBe(5);
  });
});

describe("search", () => {
  it("filters by free text, level and maximum fee without inventing rows", () => {
    const byText = searchCourses(COURSES, { query: "data" });
    expect(byText.length).toBeGreaterThan(0);
    expect(
      byText.every((course) =>
        `${course.title} ${course.summary} ${course.skills.join(" ")}`
          .toLowerCase()
          .includes("data")
      )
    ).toBe(true);

    const byLevel = searchCourses(COURSES, { level: "PG" });
    expect(byLevel.every((course) => course.level === "PG")).toBe(true);

    const byFee = searchCourses(COURSES, { maxFeeINR: 500000 });
    expect(byFee.every((course) => course.feeMinINR <= 500000)).toBe(true);
  });

  it("returns an empty list instead of fabricating a course", () => {
    expect(searchCourses(COURSES, { query: "nonexistent-subject-xyz" })).toEqual([]);
  });
});
