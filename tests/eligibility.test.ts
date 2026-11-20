import { describe, expect, it } from "vitest";
import { evaluateEligibility } from "@/lib/catalogue/eligibility";
import { makeCourse, makeLearner } from "./fixtures";

describe("eligibility", () => {
  it("marks a profile that meets the published criteria as eligible", () => {
    const result = evaluateEligibility(makeLearner(), makeCourse());
    expect(result.status).toBe("eligible");
    expect(result.messages[0]).toMatch(/meet/i);
  });

  it("returns not_eligible when the percentage is below the minimum", () => {
    const result = evaluateEligibility(
      makeLearner({ percentage: 55 }),
      makeCourse({ eligibility: { minPercentage: 60, requiredSubjects: [] } })
    );
    expect(result.status).toBe("not_eligible");
    expect(result.reasons).toContain("percentage_below_minimum");
  });

  it("returns conditional when the percentage is missing rather than assuming a pass", () => {
    const result = evaluateEligibility(
      makeLearner({ percentage: undefined }),
      makeCourse({ eligibility: { minPercentage: 60, requiredSubjects: [] } })
    );
    expect(result.status).toBe("conditional");
    expect(result.reasons).toContain("percentage_missing");
    expect(result.actions.length).toBeGreaterThan(0);
  });

  it("flags missing required subjects as conditional with an action", () => {
    const result = evaluateEligibility(
      makeLearner(),
      makeCourse({
        eligibility: {
          minPercentage: 60,
          requiredSubjects: ["Physics"],
          englishRequirement: "IELTS 6.5",
        },
      })
    );
    expect(result.status).toBe("conditional");
    expect(result.reasons).toContain("subject_requirements");
    expect(result.actions.join(" ")).toMatch(/subject/i);
  });

  it("accepts subject aliases such as maths for mathematics", () => {
    const result = evaluateEligibility(
      makeLearner({ subjects: ["Maths", "English"] }),
      makeCourse({
        eligibility: {
          minPercentage: 60,
          requiredSubjects: ["Mathematics"],
          englishRequirement: "IELTS 6.5",
        },
      })
    );
    expect(result.status).toBe("eligible");
  });

  it("returns conditional when no English test is on file", () => {
    const result = evaluateEligibility(
      makeLearner({ englishTest: { type: "None" } }),
      makeCourse()
    );
    expect(result.status).toBe("conditional");
    expect(result.reasons).toContain("english_test_missing");
  });

  it("returns conditional when the English score is below the threshold", () => {
    const result = evaluateEligibility(
      makeLearner({ englishTest: { type: "IELTS", score: 6 } }),
      makeCourse()
    );
    expect(result.status).toBe("conditional");
    expect(result.reasons).toContain("english_test_below_requirement");
  });

  it("returns conditional when a different English test is recorded", () => {
    const result = evaluateEligibility(
      makeLearner({ englishTest: { type: "TOEFL", score: 100 } }),
      makeCourse()
    );
    expect(result.status).toBe("conditional");
    expect(result.reasons).toContain("english_test_type");
  });

  it("blocks a school learner from a programme that requires a degree", () => {
    const result = evaluateEligibility(
      makeLearner({ stage: "school", currentEducation: "Class XII" }),
      makeCourse({
        eligibility: {
          minPercentage: 60,
          requiredSubjects: [],
          degreeRequired: ["Bachelor's degree"],
        },
      })
    );
    expect(result.status).toBe("not_eligible");
    expect(result.reasons).toContain("degree_required");
  });

  it("blocks a profile that exceeds the backlog allowance", () => {
    const result = evaluateEligibility(
      makeLearner({ backlogs: 3 }),
      makeCourse({
        eligibility: {
          minPercentage: 60,
          requiredSubjects: [],
          backlogsAllowed: 1,
        },
      })
    );
    expect(result.status).toBe("not_eligible");
    expect(result.reasons).toContain("backlogs");
  });

  it("never claims admission is guaranteed", () => {
    const result = evaluateEligibility(makeLearner(), makeCourse());
    expect(result.messages.join(" ").toLowerCase()).not.toContain("guarantee");
    expect(result.actions.join(" ").toLowerCase()).toContain("not guaranteed");
  });
});
