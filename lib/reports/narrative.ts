import type {
  AssessmentScores,
  CareerPath,
  Learner,
  ReportNarrative,
} from "@/lib/types";
import {
  APTITUDE_LABELS,
  BIG_FIVE_LABELS,
  RIASEC_LABELS,
} from "@/lib/assessment/instruments";
import type { ClusterFit } from "@/lib/catalogue/matching";

export const GUARDRAIL_NOTE =
  "This report is guidance, not a guarantee. It does not promise admission, placement, salary or visa outcomes, and it does not replace a licensed counsellor's judgement. Eligibility, fees and outcomes must be verified with each institution before you commit. Your data is confidential and processed only for counselling purposes.";

export interface NarrativeInput {
  learner: Learner;
  scores: AssessmentScores;
  fits: ClusterFit[];
  paths: { path: CareerPath; fit: ClusterFit }[];
}

export function buildNarrative(input: NarrativeInput): ReportNarrative {
  const { learner, scores, fits, paths } = input;
  const ordered = [...(Object.keys(scores.interest) as (keyof typeof scores.interest)[])].sort(
    (a, b) => scores.interest[b] - scores.interest[a]
  );
  const topTwo = ordered.slice(0, 2);
  const topThree = ordered.slice(0, 3);
  const bestCluster = fits[0];
  const secondCluster = fits[1];
  const pathTitles = paths.slice(0, 3).map((p) => p.path.title);

  const topAptitude = (
    Object.entries(scores.aptitude) as [string, number][]
  )
    .filter(([k]) => k !== "overall")
    .sort((a, b) => b[1] - a[1])[0];

  const strongestTrait = (
    Object.entries(scores.personality) as [keyof typeof scores.personality, number][]
  ).sort((a, b) => b[1] - a[1])[0];

  const summary = `${learner.fullName.split(" ")[0]} presents a ${scores.topInterestCode} interest profile, led by ${
    RIASEC_LABELS[topThree[0]].name
  } and ${RIASEC_LABELS[topThree[1]].name.toLowerCase()} themes. The strongest alignment is with ${bestCluster.cluster.name} (${bestCluster.score}/100), followed by ${secondCluster.cluster.name} (${secondCluster.score}/100). ${
    topAptitude ? `Aptitude screening was strongest in ${APTITUDE_LABELS[topAptitude[0] as keyof typeof APTITUDE_LABELS].toLowerCase()} (${topAptitude[1]}/100). ` : ""
  }${
    strongestTrait ? `On working style, the clearest signal is ${BIG_FIVE_LABELS[strongestTrait[0]].name.toLowerCase()} (${strongestTrait[1]}/100). ` : ""
  }These findings are a starting point for a counselling conversation, not a verdict.`;

  const strengths: string[] = [];
  if (topTwo.length) {
    strengths.push(
      `Clear interest signal in ${RIASEC_LABELS[topTwo[0]].name} (${scores.interest[topTwo[0]]}/100) and ${RIASEC_LABELS[topTwo[1]].name} (${scores.interest[topTwo[1]]}/100).`
    );
  }
  strengths.push(
    `Best-fit work environments currently point to ${bestCluster.cluster.name.toLowerCase()} and ${secondCluster.cluster.name.toLowerCase()}.`
  );
  if (topAptitude && topAptitude[1] >= 60) {
    strengths.push(
      `Above-mid aptitude in ${APTITUDE_LABELS[topAptitude[0] as keyof typeof APTITUDE_LABELS].toLowerCase()}, useful for the analytical demands of the shortlisted options.`
    );
  }
  if (scores.personality.conscientiousness >= 60) {
    strengths.push(
      "Self-reported conscientiousness is high, which supports sustained preparation over a 12-month cycle."
    );
  } else if (scores.personality.openness >= 60) {
    strengths.push("Openness to experience is a strong signal, supporting exploratory research.");
  } else {
    strengths.push(
      "A balanced working-style profile means fit will depend more on the role environment than on trait extremes."
    );
  }
  if (scores.personality.openness >= 60) {
    strengths.push("Openness to experience supports adapting to new academic and cultural contexts.");
  }

  const considerations: string[] = [];
  if (scores.quality.band !== "high") {
    considerations.push(
      `Response quality was ${scores.quality.band}. The profile should be read as provisional and revisited in the counselling session.`
    );
  }
  const lowerInterest = ordered.slice(-2);
  considerations.push(
    `Lower interest in ${lowerInterest.map((k) => RIASEC_LABELS[k].name).join(" and ")} suggests avoiding roles dominated by those tasks, or testing them before committing.`
  );
  if (learner.budgetMaxINR > 0) {
    considerations.push(
      `The shortlist is constrained by your stated programme budget of up to ₹${(learner.budgetMaxINR / 100000).toFixed(0)} lakh. Some strong-fit international options may fall outside it.`
    );
  }
  if (scores.quality.flags.length) {
    considerations.push(...scores.quality.flags.slice(0, 2));
  }
  considerations.push(
    "Catalogue fees, eligibility and outcome bands are indicative until verified against each institution's current prospectus."
  );

  const recommendations = [
    `Discuss the ${pathTitles[0]} route with your counsellor and confirm the two closest alternatives before finalising.`,
    "Close the eligibility gaps flagged on your shortlist — percentage, subjects and English test evidence.",
    "Complete one small, verifiable project or internship in the top cluster before the next intake deadline.",
    "Review progress at the quarterly checkpoint and update the 12-month plan with evidence.",
  ];

  return { summary, strengths, considerations, recommendations, guardrailNote: GUARDRAIL_NOTE };
}
