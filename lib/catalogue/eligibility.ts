import type { Course, Learner } from "@/lib/types";

export type EligibilityStatus = "eligible" | "conditional" | "not_eligible";

export interface EligibilityResult {
  status: EligibilityStatus;
  /** Machine-readable reason codes for analytics and filtering. */
  reasons: string[];
  /** Learner-facing explanation. */
  messages: string[];
  /** Concrete actions the learner can take to resolve a conditional status. */
  actions: string[];
}

const SUBJECT_ALIASES: Record<string, string[]> = {
  mathematics: ["maths", "math", "mathematics", "quantitative"],
  physics: ["physics"],
  chemistry: ["chemistry"],
  biology: ["biology", "botany", "zoology", "life sciences"],
  accountancy: ["accountancy", "accounting", "commerce"],
  economics: ["economics", "commerce"],
  psychology: ["psychology"],
  english: ["english"],
  "computer science": ["computer science", "computing", "information technology", "it"],
};

export function normaliseSubject(subject: string): string {
  return subject.trim().toLowerCase();
}

function hasSubject(learnerSubjects: string[], required: string): boolean {
  const wanted = normaliseSubject(required);
  const aliases = SUBJECT_ALIASES[wanted] ?? [wanted];
  return learnerSubjects.some((s) => {
    const value = normaliseSubject(s);
    return aliases.some((alias) => value.includes(alias) || alias.includes(value));
  });
}

function parseEnglishRequirement(requirement: string) {
  const match = requirement.match(/(IELTS|TOEFL|PTE|Duolingo)\s*([\d.]+)?/i);
  if (!match) return null;
  return {
    type: match[1].toUpperCase(),
    minimum: match[2] ? Number(match[2]) : undefined,
  };
}

/**
 * Deterministic eligibility check against the catalogue row.
 * It never asserts that a learner will be admitted — only whether the
 * stated criteria appear to be met, and what still needs confirming.
 */
export function evaluateEligibility(
  learner: Learner,
  course: Course
): EligibilityResult {
  const reasons: string[] = [];
  const messages: string[] = [];
  const actions: string[] = [];
  let conditional = false;

  const rules = course.eligibility;

  if (rules.degreeRequired?.length) {
    const education = `${learner.currentEducation} ${learner.subjects.join(" ")}`.toLowerCase();
    const hasAnyDegree =
      learner.stage === "postgraduate" ||
      learner.stage === "professional" ||
      /(?:\bb\.?\s?(?:tech|e|sc|a|com|ba|ca|des|arch|hm)\b|\bbachelor\b|\bmaster\b|\bmba\b|\bm\.?\s?(?:tech|sc|a|com)\b)/i.test(
        education
      );
    if (!hasAnyDegree) {
      return {
        status: "not_eligible",
        reasons: ["degree_required"],
        messages: [
          `${course.title} requires a completed bachelor's degree; your current stage is ${learner.stage}.`,
        ],
        actions: ["Look at undergraduate options in the same cluster."],
      };
    }

    // Some programmes require a *specific* prior degree (e.g. B.Tech
    // for an M.Tech). Only enforce this when the requirement names a
    // discipline rather than a generic bachelor's degree.
    const specific = rules.degreeRequired.filter(
      (d) => !/^bachelor'?s? degree$/i.test(d.trim())
    );
    if (specific.length) {
      const matchesSpecific = specific.some((required) => {
        const wanted = required.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
        const tokens = wanted.split(/[^a-z]+/).filter((t) => t.length >= 2);
        return tokens.every(
          (token) =>
            education.includes(token) ||
            learner.subjects.some((s) => s.toLowerCase().includes(token))
        );
      });
      if (!matchesSpecific) {
        conditional = true;
        reasons.push("degree_discipline");
        messages.push(
          `The programme asks for ${specific.join(" / ")}. Your recorded qualification is ${learner.currentEducation}; confirm whether it is accepted.`
        );
        actions.push(
          "Check the institution's accepted prior-degree list before applying."
        );
      }
    }
  }

  if (rules.minPercentage !== undefined) {
    if (learner.percentage === undefined) {
      conditional = true;
      reasons.push("percentage_missing");
      messages.push(
        "Your latest qualifying percentage is not on file, so academic eligibility cannot be confirmed."
      );
      actions.push("Add your latest percentage or CGPA in your profile.");
    } else if (learner.percentage + 0.0001 < rules.minPercentage) {
      return {
        status: "not_eligible",
        reasons: ["percentage_below_minimum"],
        messages: [
          `The stated minimum is ${rules.minPercentage}%; your recorded score is ${learner.percentage}%.`,
        ],
        actions: [
          "Consider foundation or diploma routes that articulate into this programme.",
          "Discuss a condonement or bridge option with the counsellor.",
        ],
      };
    }
  }

  if (rules.requiredSubjects.length) {
    const missing = rules.requiredSubjects.filter(
      (subject) => !hasSubject(learner.subjects, subject)
    );
    if (missing.length) {
      conditional = true;
      reasons.push("subject_requirements");
      messages.push(
        `Required subject${missing.length > 1 ? "s" : ""} not confirmed on your profile: ${missing.join(", ")}.`
      );
      actions.push(
        "Confirm your class XII / degree subjects in your profile, or check eligibility with the institution."
      );
    }
  }

  if (
    rules.backlogsAllowed !== undefined &&
    learner.backlogs > rules.backlogsAllowed
  ) {
    return {
      status: "not_eligible",
      reasons: ["backlogs"],
      messages: [
        `This programme allows ${rules.backlogsAllowed} active backlog${rules.backlogsAllowed === 1 ? "" : "s"}; your profile lists ${learner.backlogs}.`,
      ],
      actions: ["Clear active backlogs before applying, or target programmes with a higher allowance."],
    };
  }

  if (rules.englishRequirement) {
    const parsed = parseEnglishRequirement(rules.englishRequirement);
    const test = learner.englishTest;
    if (parsed && parsed.type !== "NONE") {
      if (!test || test.type === "None" || test.score === undefined) {
        conditional = true;
        reasons.push("english_test_missing");
        messages.push(
          `This programme expects ${rules.englishRequirement}. No English test score is on file.`
        );
        actions.push(`Book ${parsed.type} and add your score to your profile.`);
      } else if (
        parsed.minimum !== undefined &&
        test.type === parsed.type &&
        test.score + 0.0001 < parsed.minimum
      ) {
        conditional = true;
        reasons.push("english_test_below_requirement");
        messages.push(
          `Your ${test.type} score of ${test.score} is below the stated ${parsed.minimum}.`
        );
        actions.push(`Retake ${parsed.type} or ask the institution about waivers.`);
      } else if (test.type !== parsed.type) {
        conditional = true;
        reasons.push("english_test_type");
        messages.push(
          `The programme states ${parsed.type}; your recorded test is ${test.type}. Confirm equivalence with the institution.`
        );
        actions.push("Check the institution's accepted English tests and equivalence table.");
      }
    }
  }

  if (rules.notes) {
    actions.push(`Verify: ${rules.notes}`);
  }

  if (conditional) {
    return {
      status: "conditional",
      reasons: [...new Set(reasons)],
      messages: [
        ...messages,
        "Eligibility is conditional — confirm the outstanding items before applying.",
      ],
      actions: [...new Set(actions)],
    };
  }

  return {
    status: "eligible",
    reasons: [],
    messages: ["Your profile appears to meet the published criteria for this programme."],
    actions: [
      ...new Set([
        ...actions,
        "Admission is competitive and not guaranteed; always verify the current prospectus.",
      ]),
    ],
  };
}

export function eligibilityLabel(status: EligibilityStatus) {
  if (status === "eligible") return "Criteria appear met";
  if (status === "conditional") return "Needs confirmation";
  return "Does not meet stated criteria";
}
