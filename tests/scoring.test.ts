import { describe, expect, it } from "vitest";
import {
  APTITUDE_ITEMS,
  INTEREST_ITEMS,
  PERSONALITY_ITEMS,
} from "@/lib/assessment/instruments";
import {
  assessResponseQuality,
  scoreAptitude,
  scoreAssessment,
  scoreInterest,
  scorePersonality,
  topInterestCode,
} from "@/lib/assessment/scoring";

function allLikert(value: number) {
  const responses: Record<string, number> = {};
  for (const item of [...INTEREST_ITEMS, ...PERSONALITY_ITEMS]) {
    responses[item.id] = value;
  }
  return responses;
}

function correctAptitude() {
  const responses: Record<string, number> = {};
  for (const item of APTITUDE_ITEMS) responses[item.id] = item.answerIndex;
  return responses;
}

describe("interest scoring", () => {
  it("normalises a fully answered section to 0–100", () => {
    const high = scoreInterest(allLikert(5));
    expect(high.R).toBe(100);
    expect(high.I).toBe(100);

    const low = scoreInterest(allLikert(1));
    expect(low.R).toBe(0);
    expect(low.C).toBe(0);
  });

  it("normalises a partially answered theme against answered items only", () => {
    const first = INTEREST_ITEMS.find((item) => item.dimension === "R");
    expect(first).toBeDefined();
    const scores = scoreInterest({ [first!.id]: 3 });
    expect(scores.R).toBe(50);
    expect(scores.I).toBe(0);
  });

  it("produces a deterministic Holland code ordered by score", () => {
    const code = topInterestCode({ R: 10, I: 90, A: 80, S: 70, E: 60, C: 50 });
    expect(code).toBe("IAS");
    expect(code).toHaveLength(3);
  });
});

describe("aptitude scoring", () => {
  it("returns 100 for every dimension when all answers are correct", () => {
    const { scores, correct, attempted } = scoreAptitude(correctAptitude());
    expect(scores.numerical).toBe(100);
    expect(scores.verbal).toBe(100);
    expect(scores.logical).toBe(100);
    expect(scores.spatial).toBe(100);
    expect(scores.overall).toBe(100);
    expect(correct).toBe(APTITUDE_ITEMS.length);
    expect(attempted).toBe(APTITUDE_ITEMS.length);
  });

  it("returns zero when no item is attempted", () => {
    const { scores, attempted } = scoreAptitude({});
    expect(scores.overall).toBe(0);
    expect(attempted).toBe(0);
  });

  it("does not award marks for wrong options", () => {
    const responses: Record<string, number> = {};
    for (const item of APTITUDE_ITEMS) {
      responses[item.id] = (item.answerIndex + 1) % item.options.length;
    }
    const { scores, correct } = scoreAptitude(responses);
    expect(correct).toBe(0);
    expect(scores.overall).toBe(0);
  });
});

describe("personality scoring", () => {
  it("reverse-scores negatively keyed items", () => {
    const responses: Record<string, number> = {};
    for (const item of PERSONALITY_ITEMS) {
      responses[item.id] = item.reverse ? 1 : 5;
    }
    const scores = scorePersonality(responses);
    expect(scores.openness).toBe(100);
    expect(scores.conscientiousness).toBe(100);
    expect(scores.extraversion).toBe(100);
    expect(scores.agreeableness).toBe(100);
    expect(scores.emotional_stability).toBe(100);
  });

  it("treats an unanswered trait as zero, not neutral", () => {
    const scores = scorePersonality({});
    expect(scores.openness).toBe(0);
  });
});

describe("response quality", () => {
  it("flags fast completion and low variation", () => {
    const quality = assessResponseQuality(allLikert(3), { durationSeconds: 120 });
    expect(quality.flags.length).toBeGreaterThan(0);
    expect(quality.durationSeconds).toBe(120);
    expect(quality.band).not.toBe("high");
    expect(quality.flags.some((flag) => flag.includes("faster"))).toBe(true);
    expect(quality.flags.some((flag) => flag.includes("little variation"))).toBe(true);
  });

  it("flags unanswered items", () => {
    const partial = { ...allLikert(3) };
    for (const item of PERSONALITY_ITEMS.slice(0, 5)) delete partial[item.id];
    const quality = assessResponseQuality(partial, { durationSeconds: 1500 });
    expect(quality.flags.some((flag) => flag.includes("unanswered"))).toBe(true);
  });

  it("scores a varied, reasonably paced battery in the high band", () => {
    const responses: Record<string, number> = {};
    [...INTEREST_ITEMS, ...PERSONALITY_ITEMS].forEach((item, index) => {
      responses[item.id] = (index % 5) + 1;
    });
    const quality = assessResponseQuality(responses, { durationSeconds: 1600 });
    expect(quality.band).toBe("high");
    expect(quality.score).toBe(100);
  });
});

describe("full assessment", () => {
  it("returns a complete, versioned score object", () => {
    const responses = { ...allLikert(4), ...correctAptitude() };
    const scores = scoreAssessment({ responses, durationSeconds: 1700 });
    expect(scores.instrumentVersion).toMatch(/^northstar-cc-/);
    expect(scores.scoredAt).toBeTruthy();
    expect(scores.interest.I).toBeGreaterThan(0);
    expect(scores.aptitude.overall).toBe(100);
    expect(scores.topInterestCode).toHaveLength(3);
  });
});
