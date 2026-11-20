import type {
  AssessmentScores,
  AptitudeDimension,
  AptitudeScores,
  BigFive,
  PersonalityScores,
  ResponseQuality,
  Riasec,
  RiasecScores,
} from "@/lib/types";
import {
  APTITUDE_ITEMS,
  BIG_FIVE_LABELS,
  INTEREST_ITEMS,
  INSTRUMENT_VERSION,
  PERSONALITY_ITEMS,
} from "./instruments";

const RIASEC_KEYS: Riasec[] = ["R", "I", "A", "S", "E", "C"];
const APTITUDE_KEYS: AptitudeDimension[] = [
  "numerical",
  "verbal",
  "logical",
  "spatial",
];
const BIG_FIVE_KEYS: BigFive[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "emotional_stability",
];

function pct(value: number, min: number, max: number) {
  if (max === min) return 0;
  return Math.round(((value - min) / (max - min)) * 100);
}

function isLikert(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;
}

function isOption(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
}

export interface ScoreInput {
  responses: Record<string, number>;
  durationSeconds?: number;
  sectionTimings?: Partial<Record<"interest" | "aptitude" | "personality", number>>;
}

export function scoreInterest(responses: Record<string, number>): RiasecScores {
  const scores = {} as RiasecScores;
  for (const key of RIASEC_KEYS) {
    const items = INTEREST_ITEMS.filter((i) => i.dimension === key);
    const answered = items.filter((i) => isLikert(responses[i.id]));
    const raw = answered.reduce((sum, item) => sum + responses[item.id], 0);
    // Unanswered items are excluded; a partially-complete section is
    // normalised against the items actually answered.
    const max = answered.length * 5;
    const min = answered.length;
    scores[key] = answered.length ? pct(raw, min, max) : 0;
  }
  return scores;
}

export function scoreAptitude(
  responses: Record<string, number>
): { scores: AptitudeScores; correct: number; attempted: number } {
  const scores = {} as AptitudeScores;
  let correctTotal = 0;
  let attemptedTotal = 0;

  for (const key of APTITUDE_KEYS) {
    const items = APTITUDE_ITEMS.filter((i) => i.dimension === key);
    let correct = 0;
    for (const item of items) {
      const answer = responses[item.id];
      if (isOption(answer)) {
        attemptedTotal += 1;
        if (answer === item.answerIndex) correct += 1;
      }
    }
    correctTotal += correct;
    scores[key] = items.length ? Math.round((correct / items.length) * 100) : 0;
  }
  scores.overall = APTITUDE_ITEMS.length
    ? Math.round((correctTotal / APTITUDE_ITEMS.length) * 100)
    : 0;
  return { scores, correct: correctTotal, attempted: attemptedTotal };
}

export function scorePersonality(
  responses: Record<string, number>
): PersonalityScores {
  const scores = {} as PersonalityScores;
  for (const key of BIG_FIVE_KEYS) {
    const items = PERSONALITY_ITEMS.filter((i) => i.dimension === key);
    let sum = 0;
    let answered = 0;
    for (const item of items) {
      const value = responses[item.id];
      if (!isLikert(value)) continue;
      answered += 1;
      sum += item.reverse ? 6 - value : value;
    }
    scores[key] = answered ? pct(sum, answered, answered * 5) : 0;
  }
  return scores;
}

export function topInterestCode(scores: RiasecScores, length = 3): string {
  return [...RIASEC_KEYS]
    .sort((a, b) => scores[b] - scores[a] || a.localeCompare(b))
    .slice(0, length)
    .join("");
}

/**
 * A transparency-first quality signal. It is deliberately called a
 * "response quality indicator", not a validity scale: it flags rushed or
 * low-variation responding so a counsellor can follow up.
 */
export function assessResponseQuality(
  responses: Record<string, number>,
  input: Pick<ScoreInput, "durationSeconds" | "sectionTimings"> = {}
): ResponseQuality {
  const flags: string[] = [];
  let penalty = 0;

  const likert = [...INTEREST_ITEMS, ...PERSONALITY_ITEMS];
  const answeredLikert = likert.filter((i) => isLikert(responses[i.id]));
  const answeredTotal = likert.filter((i) => responses[i.id] !== undefined).length;
  const missing = likert.length - answeredTotal;

  if (missing > 0) {
    flags.push(
      `${missing} self-report ${missing === 1 ? "item was" : "items were"} left unanswered.`
    );
    penalty += Math.min(30, Math.round((missing / likert.length) * 60));
  }

  if (answeredLikert.length >= 12) {
    const counts = new Map<number, number>();
    for (const item of answeredLikert) {
      const v = responses[item.id];
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const modal = Math.max(...counts.values());
    const share = modal / answeredLikert.length;
    if (share >= 0.8) {
      flags.push(
        "Self-report answers showed very little variation, which can reduce how personalised the reading is."
      );
      penalty += 25;
    } else if (share >= 0.65) {
      flags.push("Self-report answers were fairly uniform across different statements.");
      penalty += 10;
    }
  }

  const duration = input.durationSeconds ?? 0;
  if (duration > 0 && duration < 360) {
    flags.push("The battery was completed faster than expected, so treat the profile as provisional.");
    penalty += 20;
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));
  const band: ResponseQuality["band"] =
    score >= 80 ? "high" : score >= 55 ? "moderate" : "low";

  return {
    score,
    band,
    flags,
    durationSeconds: Math.max(0, Math.round(duration)),
  };
}

export function scoreAssessment(input: ScoreInput): AssessmentScores {
  const interest = scoreInterest(input.responses);
  const { scores: aptitude } = scoreAptitude(input.responses);
  const personality = scorePersonality(input.responses);
  return {
    interest,
    aptitude,
    personality,
    topInterestCode: topInterestCode(interest),
    quality: assessResponseQuality(input.responses, input),
    scoredAt: new Date().toISOString(),
    instrumentVersion: INSTRUMENT_VERSION,
  };
}

export function traitLabel(bigFive: BigFive, value: number) {
  const meta = BIG_FIVE_LABELS[bigFive];
  if (value >= 65) return `High — ${meta.high.toLowerCase()}`;
  if (value <= 35) return `Lower — ${meta.low.toLowerCase()}`;
  return "Balanced — context-dependent";
}

export function describeRiasec(scores: RiasecScores) {
  return RIASEC_KEYS.map((key) => ({
    key,
    score: scores[key],
    dominant: scores[key] >= 65,
  })).sort((a, b) => b.score - a.score);
}

export const __testing = {
  RIASEC_KEYS,
  APTITUDE_KEYS,
  BIG_FIVE_KEYS,
  pct,
};
