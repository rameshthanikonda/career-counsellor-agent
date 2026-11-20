import { describe, expect, it } from "vitest";
import { generatePlan } from "@/lib/plans/generator";
import { makeLearner, makePath } from "./fixtures";

const START = new Date("2026-01-01T00:00:00.000Z");

describe("12-month plan generation", () => {
  it("builds ten dated milestones across four quarters", () => {
    const plan = generatePlan(makeLearner(), makePath(), {
      startDate: START,
      shortlistCount: 5,
    });
    expect(plan.milestones).toHaveLength(10);
    expect(new Set(plan.milestones.map((milestone) => milestone.quarter))).toEqual(
      new Set([1, 2, 3, 4])
    );
    expect(plan.milestones.every((milestone) => milestone.status === "pending")).toBe(true);
  });

  it("spans exactly twelve months from the start date", () => {
    const plan = generatePlan(makeLearner(), makePath(), { startDate: START });
    expect(new Date(plan.endDate).getUTCFullYear()).toBe(2027);
    expect(new Date(plan.endDate).getUTCMonth()).toBe(0);
    expect(new Date(plan.startDate).getUTCHours()).toBe(0);
  });

  it("orders due dates as the plan progresses", () => {
    const plan = generatePlan(makeLearner(), makePath(), { startDate: START });
    for (let index = 1; index < plan.milestones.length; index += 1) {
      expect(
        new Date(plan.milestones[index].dueDate).getTime()
      ).toBeGreaterThan(new Date(plan.milestones[index - 1].dueDate).getTime());
      expect(plan.milestones[index].order).toBe(index + 1);
    }
  });

  it("uses a study route for a school learner", () => {
    const plan = generatePlan(
      makeLearner({ stage: "school" }),
      makePath(),
      { startDate: START }
    );
    expect(plan.title).toMatch(/choose and enter/i);
    expect(plan.milestones[0].title).toMatch(/assessment report/i);
  });

  it("uses a career-transition route for a working professional", () => {
    const plan = generatePlan(
      makeLearner({ stage: "professional" }),
      makePath(),
      { startDate: START }
    );
    expect(plan.title).toMatch(/move into/i);
    expect(plan.milestones.map((milestone) => milestone.title).join(" ")).toMatch(
      /CV|portfolio|informational/i
    );
  });

  it("names the target path in the objective and uses the shortlist count", () => {
    const plan = generatePlan(makeLearner(), makePath({ title: "Data Analyst" }), {
      startDate: START,
      shortlistCount: 4,
    });
    expect(plan.objective).toContain("Data Analyst");
    expect(plan.milestones.map((milestone) => milestone.title).join(" ")).toContain("4 programmes");
  });
});
