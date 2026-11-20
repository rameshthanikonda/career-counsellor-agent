import { describe, expect, it } from "vitest";
import {
  applyGuardrails,
  crisisResponse,
  detectCrisis,
  GUARDRAIL_SYSTEM_RULES,
} from "@/lib/ai/guardrails";

describe("outcome guardrails", () => {
  it("leaves ordinary advice untouched", () => {
    const text =
      "The programme is indicative and competitive. Verify the fee with the institution and discuss the choice with your counsellor.";
    const result = applyGuardrails(text);
    expect(result.text).toBe(text);
    expect(result.redacted).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("removes a sentence that promises a placement", () => {
    const result = applyGuardrails(
      "The course is rigorous and well regarded. It guarantees a placement with a top firm."
    );
    expect(result.redacted).toBe(true);
    expect(result.reasons).toContain("outcome_guarantee");
    expect(result.text).not.toMatch(/guarantees a placement/i);
    expect(result.text).toMatch(/can't promise/i);
    expect(result.text).toContain("The course is rigorous and well regarded.");
  });

  it("catches the reverse phrasing", () => {
    const result = applyGuardrails("Placement is guaranteed for every learner.");
    expect(result.redacted).toBe(true);
    expect(result.reasons).toContain("outcome_guarantee_reverse");
  });

  it("catches 100% claims tied to an outcome", () => {
    const result = applyGuardrails("We offer 100% placement support and admission.");
    expect(result.redacted).toBe(true);
  });

  it("falls back to a safe message when every sentence is removed", () => {
    const result = applyGuardrails("You are guaranteed a job and a visa.");
    expect(result.redacted).toBe(true);
    expect(result.text.length).toBeGreaterThan(20);
    expect(result.text).toMatch(/can't make outcome promises/i);
  });

  it("never returns an empty string", () => {
    const result = applyGuardrails("Guaranteed placement. Guaranteed salary.");
    expect(result.text.trim().length).toBeGreaterThan(0);
  });
});

describe("crisis handling", () => {
  it("detects common crisis phrasing", () => {
    expect(detectCrisis("I want to kill myself")).toBe(true);
    expect(detectCrisis("I have been thinking about self-harm")).toBe(true);
    expect(detectCrisis("I am worried about my exam results")).toBe(false);
  });

  it("replaces the answer with escalation and Indian helplines", () => {
    const result = applyGuardrails("I want to end my life.");
    expect(result.crisis).toBe(true);
    expect(result.redacted).toBe(true);
    expect(result.text).toContain("Tele-MANAS");
    expect(result.text).toContain("14416");
    expect(result.text).toContain("112");
  });

  it("exposes a stable crisis response for the API path", () => {
    const response = crisisResponse();
    expect(response).toContain("KIRAN");
    expect(response).toContain("1800-599-0019");
    expect(response).toMatch(/safety comes first/i);
  });
});

describe("system rules", () => {
  it("state the core prohibitions that the filter backstops", () => {
    expect(GUARDRAIL_SYSTEM_RULES).toMatch(/Never promise/i);
    expect(GUARDRAIL_SYSTEM_RULES).toMatch(/verify with the institution/i);
    expect(GUARDRAIL_SYSTEM_RULES).toMatch(/Never invent/i);
    expect(GUARDRAIL_SYSTEM_RULES).toMatch(/crisis/i);
  });
});
