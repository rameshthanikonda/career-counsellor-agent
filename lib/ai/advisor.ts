import "server-only";
import type {
  AdvisorMessage,
  ApplicationView,
  AssessmentScores,
  CareerPath,
  Course,
  Learner,
} from "@/lib/types";
import { getStore } from "@/lib/store";
import {
  computeClusterFits,
  matchCourses,
  rankCareerPaths,
  type ClusterFit,
} from "@/lib/catalogue/matching";
import { CAREER_CLUSTERS, CLUSTER_BY_ID } from "@/lib/catalogue/clusters";
import { formatFeeRange, formatINR } from "@/lib/utils/format";
import { BIG_FIVE_LABELS, RIASEC_LABELS } from "@/lib/assessment/instruments";
import { checklistProgress, daysUntil, isOpenApplication, APPLICATION_STATUS_LABELS } from "@/lib/applications/checklist";
import {
  geminiConfig,
  generateContent,
  type GeminiContent,
  type GeminiPart,
} from "./gemini";
import {
  applyGuardrails,
  crisisResponse,
  detectCrisis,
  GUARDRAIL_SYSTEM_RULES,
} from "./guardrails";
import {
  executeTool,
  TOOL_DECLARATIONS,
  type AdvisorContext,
  type ToolCallRecord,
} from "./tools";

export interface AdvisorReply {
  text: string;
  provider: "gemini" | "rules";
  model: string;
  toolCalls: ToolCallRecord[];
  guardrail: { redacted: boolean; reasons: string[] };
  fallbackReason?: string;
}

function syntheticFit(clusterId: string): ClusterFit {
  const cluster = CLUSTER_BY_ID[clusterId] ?? CAREER_CLUSTERS[0];
  return {
    cluster,
    score: 0,
    factors: { interest: 0, aptitude: 0, personality: 0 },
    rationale: "No assessment on file yet.",
  };
}

async function buildContext(learner: Learner): Promise<{
  ctx: AdvisorContext;
  scores: AssessmentScores | null;
  planSummary: string | null;
}> {
  const store = getStore();
  const [assessment, courses, paths, plan, applicationRows] = await Promise.all([
    store.getAssessmentByLearner(learner.id),
    store.listCourses(),
    store.listCareerPaths(),
    store.getPlanByLearner(learner.id),
    store.listApplications(learner.id),
  ]);
  const scores = assessment?.scores ?? null;
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const applications: ApplicationView[] = applicationRows
    .map((application) => {
      const course = courseMap.get(application.courseId);
      return course ? { ...application, course } : null;
    })
    .filter((application): application is ApplicationView => application !== null);

  let ranked: { path: CareerPath; fit: ClusterFit }[];
  if (scores) {
    ranked = rankCareerPaths(scores, 10);
  } else {
    ranked = paths
      .slice()
      .sort((a, b) => b.demandIndex - a.demandIndex)
      .slice(0, 8)
      .map((path) => ({ path, fit: syntheticFit(path.clusterId) }));
  }

  let planSummary: string | null = null;
  if (plan) {
    const milestones = await store.listMilestones(plan.id);
    const next = milestones
      .filter((m) => m.status !== "done")
      .sort((a, b) => a.order - b.order)[0];
    planSummary = next
      ? `${plan.title}. Next milestone: ${next.title} (Q${next.quarter}, due ${new Date(next.dueDate).toLocaleDateString("en-IN")}).`
      : `${plan.title}. All milestones complete.`;
  }

  return {
    scores,
    planSummary,
    ctx: {
      learner,
      scores,
      courses,
      clusters: CAREER_CLUSTERS.map((c) => ({
        id: c.id,
        name: c.name,
        summary: c.summary,
      })),
      paths: ranked,
      applications,
    },
  };
}

function buildSystemPrompt(
  learner: Learner,
  scores: AssessmentScores | null,
  ctx: AdvisorContext
): string {
  const context = {
    today: new Date().toISOString().slice(0, 10),
    learner: {
      firstName: learner.fullName.split(" ")[0],
      stage: learner.stage,
      city: learner.city,
      currentEducation: learner.currentEducation,
      percentage: learner.percentage ?? null,
      targetIntake: learner.targetIntake,
      budgetINR: `${learner.budgetMinINR}–${learner.budgetMaxINR}`,
      preferredCountries: learner.preferredCountries,
      preferredModes: learner.preferredModes,
      careerGoal: learner.careerGoal,
      englishTest: learner.englishTest ?? null,
    },
    assessment: scores
      ? {
          interestCode: scores.topInterestCode,
          riasec: scores.interest,
          aptitude: scores.aptitude,
          personality: scores.personality,
          responseQuality: scores.quality,
        }
      : null,
    topClusters: ctx.paths.slice(0, 4).map((p) => ({
      cluster: p.fit.cluster.name,
      score: p.fit.score,
      examplePath: p.path.title,
    })),
    applications: ctx.applications.slice(0, 8).map((application) => {
      const progress = checklistProgress(application.checklist);
      return {
        programme: application.course.title,
        provider: application.course.provider,
        status: application.status,
        deadline: application.deadline ?? null,
        daysUntilDeadline: daysUntil(application.deadline),
        checklist: `${progress.done}/${progress.total}`,
        missingRequired: progress.missingRequired.map((item) => item.label),
      };
    }),
    catalogueSize: ctx.courses.length,
  };

  return [
    "You are Northstar, a career adviser for WAECS supporting students and working professionals in India and internationally.",
    "You help learners understand their assessment, search and compare programmes, and plan a realistic route. You are warm, direct and concise — no hype.",
    "Use the tools for any specific course, fee, eligibility, cluster or salary claim. Never invent catalogue data. If a tool returns nothing, say so.",
    "The learner's counsellor makes final decisions on significant choices; encourage that hand-off where appropriate.",
    GUARDRAIL_SYSTEM_RULES,
    "",
    "Signed-in learner context (JSON):",
    JSON.stringify(context),
  ].join("\n");
}

function historyToContents(history: AdvisorMessage[]): GeminiContent[] {
  return history
    .slice(-8)
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content.slice(0, 3500) }],
    }));
}

async function callGemini(
  learner: Learner,
  message: string,
  history: AdvisorMessage[],
  scores: AssessmentScores | null,
  ctx: AdvisorContext,
  planSummary: string | null
): Promise<{ text: string; toolCalls: ToolCallRecord[]; model: string }> {
  const { model } = geminiConfig();
  const system = `${buildSystemPrompt(learner, scores, ctx)}${
    planSummary ? `\n\nCurrent 12-month plan: ${planSummary}` : ""
  }`;

  const contents: GeminiContent[] = [
    ...historyToContents(history),
    { role: "user", parts: [{ text: message }] },
  ];
  const toolCalls: ToolCallRecord[] = [];

  for (let round = 0; round < 4; round += 1) {
    const response = await generateContent({
      system,
      contents,
      tools: TOOL_DECLARATIONS,
    });

    if (response.functionCalls.length === 0) {
      return { text: response.text, toolCalls, model };
    }

    const modelParts: GeminiPart[] = [];
    if (response.text) modelParts.push({ text: response.text });
    for (const call of response.functionCalls) {
      modelParts.push({ functionCall: { name: call.name, args: call.args } });
    }
    contents.push({ role: "model", parts: modelParts });

    const responseParts: GeminiPart[] = [];
    for (const call of response.functionCalls) {
      const { result, summary } = executeTool(call.name, call.args, ctx);
      toolCalls.push({ name: call.name, args: call.args, summary });
      responseParts.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  // The model kept calling tools; force a plain-language close-out.
  const final = await generateContent({
    system,
    contents: [
      ...contents,
      {
        role: "user",
        parts: [
          {
            text: "Stop using tools now. Answer the learner's original question using only what the tool results already established. Be concise.",
          },
        ],
      },
    ],
    maxOutputTokens: 900,
  });
  return { text: final.text, toolCalls, model };
}

// ─────────────────────────────────────────────────────────────
// Deterministic fallback — the product must work without an API key.
// ─────────────────────────────────────────────────────────────

function topMatches(ctx: AdvisorContext, limit = 5) {
  if (!ctx.scores) return [];
  return matchCourses(ctx.learner, ctx.scores, ctx.courses, { limit });
}

function feeLine(course: Course) {
  return formatFeeRange(course.feeMinINR, course.feeMaxINR);
}

function buildFallback(
  message: string,
  learner: Learner,
  scores: AssessmentScores | null,
  ctx: AdvisorContext,
  planSummary: string | null
): string {
  const text = message.toLowerCase();
  const matches = topMatches(ctx, 5);
  const topCluster = ctx.paths[0];
  const budget = formatINR(learner.budgetMaxINR, { compact: true });

  if (/^(hi|hello|hey|good (morning|evening|afternoon))\b/.test(text) || text.length < 4) {
    return [
      `Hello ${learner.fullName.split(" ")[0]}. I can help you read your profile, search the catalogue, compare programmes, or work out the next step in your plan.`,
      "",
      scores
        ? `Your strongest signal is **${topCluster?.fit.cluster.name}** (${topCluster?.fit.score}/100), with a **${scores.topInterestCode}** interest code.`
        : "You have not completed the assessment yet, so I can only work from your profile — stage, budget, destinations and goal.",
      "",
      "Try asking:",
      "• Which programmes fit my profile and budget?",
      "• Compare my top three options on fees and eligibility",
      "• What should I do in the next 90 days?",
    ].join("\n");
  }

  if (/(score|result|riasec|interest|aptitude|personality|profile|assessment)/.test(text)) {
    if (!scores) {
      return [
        "I do not have an assessment on file for you yet, so I cannot interpret scores.",
        "",
        "The Career Compass battery takes about 28 minutes and covers interests, reasoning and working style. Once it is complete, a counsellor reviews the report before it is released to you.",
        "",
        "In the meantime, I can search the catalogue against your stated budget, destinations and goal. Ask me for programmes in a subject or country.",
      ].join("\n");
    }
    const riasec = (Object.keys(scores.interest) as (keyof typeof scores.interest)[])
      .sort((a, b) => scores.interest[b] - scores.interest[a]);
    const trait = (Object.keys(scores.personality) as (keyof typeof scores.personality)[])
      .sort((a, b) => scores.personality[b] - scores.personality[a])[0];
    return [
      `Your profile is a **${scores.topInterestCode}** interest pattern.`,
      "",
      `• **${RIASEC_LABELS[riasec[0]].name}** is your strongest theme (${scores.interest[riasec[0]]}/100), followed by **${RIASEC_LABELS[riasec[1]].name}** (${scores.interest[riasec[1]]}/100) and **${RIASEC_LABELS[riasec[2]].name}** (${scores.interest[riasec[2]]}/100).`,
      `• Aptitude screening was strongest in **${Object.entries(scores.aptitude)
        .filter(([k]) => k !== "overall")
        .sort((a, b) => b[1] - a[1])[0][0]}** reasoning.`,
      `• Working style leans towards **${BIG_FIVE_LABELS[trait].high.toLowerCase()}**.`,
      "",
      `The closest work environments are **${ctx.paths[0]?.fit.cluster.name}** (${ctx.paths[0]?.fit.score}), **${ctx.paths[1]?.fit.cluster.name}** (${ctx.paths[1]?.fit.score}) and **${ctx.paths[2]?.fit.cluster.name}** (${ctx.paths[2]?.fit.score}).`,
      "",
      "Scores describe preference and practice-level reasoning — not your worth, and not an admission or hiring decision. Your counsellor has reviewed the full report.",
    ].join("\n");
  }

  if (/(compare|versus|\bvs\b|difference|better)/.test(text)) {
    if (matches.length < 2) {
      return "I need at least two shortlisted programmes to compare. Complete the assessment, or tell me two programme names and I will line them up.";
    }
    const chosen = matches.slice(0, 3);
    return [
      "Here is a like-for-like comparison of your closest catalogue matches:",
      "",
      ...chosen.flatMap((match) => [
        `**${match.course.title}** — ${match.course.provider}`,
        `• ${match.course.level} · ${match.course.durationMonths} months · ${feeLine(match.course)} · ${match.course.countries.join(", ")}`,
        `• Eligibility: ${match.eligibility.status.replace("_", " ")} — ${match.eligibility.messages[0]}`,
        `• Outcome band: ${match.course.outcomes.placementBand.replace("_", " ")} (${match.course.outcomes.outcomeNote.slice(0, 140)}…)`,
        "",
      ]),
      "Fees and eligibility are indicative and must be verified with each institution. Admission is competitive and not guaranteed. Your counsellor can help you weigh these trade-offs before you commit.",
    ].join("\n");
  }

  if (/(fee|cost|afford|cheap|budget|money|loan|scholarship)/.test(text)) {
    const affordable = matches
      .filter((m) => m.eligibility.status !== "not_eligible")
      .sort((a, b) => a.course.feeMinINR - b.course.feeMinINR)
      .slice(0, 3);
    if (affordable.length === 0) {
      return `I could not find a catalogue option inside your stated budget of ${budget}. That usually means the shortlist needs to widen on country, mode or level. Ask your counsellor about funding routes, and do not treat any loan or scholarship as guaranteed.`;
    }
    return [
      `Your stated programme budget is up to **${budget}**. The lowest-cost programmes that still fit your profile are:`,
      "",
      ...affordable.map(
        (m) =>
          `• **${m.course.title}** (${m.course.provider}) — ${feeLine(m.course)} total, ${m.course.durationMonths} months, ${m.course.modes.join(", ")}. Eligibility: ${m.eligibility.status.replace("_", " ")}.`
      ),
      "",
      "A lower fee is not automatically better value: check accreditation, outcome data and total living cost. Fees shown are indicative, not quotes.",
    ].join("\n");
  }

  if (/(abroad|overseas|international|uk|united kingdom|canada|australia|usa|united states|germany|singapore)/.test(text)) {
    const overseas = matches.filter((m) => !m.course.countries.includes("India")).slice(0, 3);
    if (overseas.length === 0) {
      return [
        "Your current shortlist is India-focused. Widening to an international option changes cost, visa requirements and timelines — and the catalogue's international fees are well above your stated budget in several cases.",
        "",
        "Tell me a destination and I will check what the catalogue holds, or ask your counsellor to model the total cost including living expenses and visa conditions. No visa or placement outcome can be promised.",
      ].join("\n");
    }
    return [
      "International options currently closest to your profile:",
      "",
      ...overseas.map(
        (m) =>
          `• **${m.course.title}** — ${m.course.provider} · ${m.course.countries.join(", ")} · ${m.course.durationMonths} months · ${feeLine(m.course)}. Eligibility: ${m.eligibility.status.replace("_", " ")}.`
      ),
      "",
      "International fees typically exclude living costs, insurance and visa fees. Verify English-test thresholds, post-study work rules and total cost with the institution and an immigration professional. No visa outcome is guaranteed.",
    ].join("\n");
  }

  if (/(online|part.?time|working|job while|distance)/.test(text)) {
    const online = matches.filter((m) =>
      m.course.modes.some((mode) => mode === "online" || mode === "hybrid")
    );
    return [
      online.length
        ? "These options can be studied while working:"
        : "I could not find an online or hybrid match inside your current shortlist.",
      "",
      ...online.slice(0, 3).map(
        (m) =>
          `• **${m.course.title}** — ${m.course.provider} · ${m.course.modes.join(", ")} · ${m.course.durationMonths} months · ${feeLine(m.course)}.`
      ),
      "",
      "Part-time study still demands protected hours. Check contact-hour requirements and whether the qualification is recognised for the roles you want before enrolling.",
    ].join("\n");
  }

  if (/(deadline|application|apply|applied|document|checklist|submit|submitted|offer|interview)/.test(text)) {
    const applications = ctx.applications;
    if (applications.length === 0) {
      return [
        "You are not tracking any applications yet.",
        "",
        "Applications unlock after your report is released. Once it is, open the Applications tab and track a shortlisted programme — a document checklist and deadline reminder are created with it.",
        "",
        "Your counsellor can help you decide which offers are worth the application fee. No admission outcome is guaranteed.",
      ].join("\n");
    }
    const open = applications.filter(isOpenApplication);
    const next = open
      .filter((application) => application.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
    return [
      `You are tracking **${applications.length} application${applications.length === 1 ? "" : "s"}**.`,
      "",
      ...applications.slice(0, 4).map((application) => {
        const progress = checklistProgress(application.checklist);
        const days = daysUntil(application.deadline);
        const deadline =
          days === null
            ? "no deadline set"
            : days < 0
              ? `${Math.abs(days)} day(s) overdue`
              : `${days} day(s) left`;
        return `• **${application.course.title}** — ${APPLICATION_STATUS_LABELS[application.status]}, ${deadline}, checklist ${progress.done}/${progress.total}${
          progress.missingRequired.length
            ? `. Still missing: ${progress.missingRequired.slice(0, 2).map((item) => item.label).join(", ")}`
            : ""
        }.`;
      }),
      "",
      next
        ? `The nearest deadline is **${next.course.title}** on ${new Date(next.deadline!).toLocaleDateString("en-IN")}. Confirm it in the institution's portal before you rely on it.`
        : "No dated deadlines are set. Add them so reminders are useful.",
      "",
      "Track every application in the Applications tab. Your counsellor sees the same record, and no outcome is promised.",
    ].join("\n");
  }

  if (/(plan|next step|milestone|90 day|timeline|what should i do)/.test(text)) {
    if (planSummary) {
      return [
        "From your 12-month plan:",
        "",
        `**${planSummary}**`,
        "",
        "The plan works quarter by quarter. For the next 90 days, focus on:",
        "• Closing any eligibility gaps (documents, test scores, subject evidence).",
        "• Producing one verifiable artefact — a project, application draft or score report.",
        "• Booking the next step with your counsellor, not waiting for the deadline.",
        "",
        "If a milestone has slipped, mark it as at-risk and raise it in your next review. Plans should be revised, not abandoned.",
      ].join("\n");
    }
    return [
      "You do not have an active 12-month plan yet — it is created with your report and activated when your counsellor releases it.",
      "",
      "A sensible 90-day start:",
      "• Complete the assessment if you have not already.",
      "• Confirm your eligibility evidence: percentage, subjects, English test.",
      "• Narrow to five programmes and check each prospectus directly.",
      "",
      "Ask me about specific programmes and I will pull them from the catalogue.",
    ].join("\n");
  }

  if (/(eligib|percentage|subject|backlog|ielts|toefl|admission requirement)/.test(text)) {
    const conditional = matches.filter((m) => m.eligibility.status === "conditional");
    return [
      "Eligibility is assessed before a programme can enter your shortlist. Here is where you stand:",
      "",
      ...(conditional.length
        ? conditional.slice(0, 3).map(
            (m) =>
              `• **${m.course.title}** — ${m.eligibility.messages[0]} ${m.eligibility.actions?.[0] ?? ""}`
          )
        : [
            "• Your profile appears to meet the published criteria for the shortlisted programmes.",
          ]),
      "",
      `Your recorded percentage is ${learner.percentage ?? "not provided"} and your English test is ${
        learner.englishTest?.type && learner.englishTest.type !== "None"
          ? `${learner.englishTest.type} ${learner.englishTest.score ?? ""}`
          : "not recorded"
      }.`,
      "",
      "The catalogue criteria are indicative. Institutions can and do change them, and meeting criteria does not guarantee a seat.",
    ].join("\n");
  }

  if (/(career|job|role|salary|grow|progression|future)/.test(text)) {
    const path = ctx.paths[0];
    if (!path) {
      return "I do not have a career map for this profile yet. Complete the assessment first, then I can show progression routes and indicative salary bands.";
    }
    return [
      `The closest career route is **${path.path.title}** (${path.path.clusterId.replace(/_/g, " ")} cluster, fit ${path.fit.score}/100).`,
      "",
      `**${path.path.summary}**`,
      "",
      "Indicative progression:",
      ...path.path.progression.map(
        (stage) =>
          `• ${stage.title} — ${stage.yearsFrom}–${stage.yearsTo} years, ${formatINR(stage.indicativeSalaryMinINR, { compact: true })}–${formatINR(stage.indicativeSalaryMaxINR, { compact: true })}`
      ),
      "",
      `Skills that matter: ${path.path.skills.join(", ")}.`,
      "",
      "Salary bands are broad planning ranges, not promises or offers. Demand varies by city, employer and economic cycle.",
    ].join("\n");
  }

  if (!scores) {
    return [
      `I can work from your profile even before the assessment. You are at the **${learner.stage.replace("_", " ")}** stage, targeting **${learner.targetIntake}**, with a budget up to **${budget}**.`,
      "",
      matches.length
        ? "A few catalogue options that fit those constraints:"
        : "Tell me a subject or destination and I will search the catalogue.",
      "",
      ...matches
        .slice(0, 3)
        .map(
          (m) =>
            `• **${m.course.title}** — ${m.course.provider} · ${m.course.level} · ${feeLine(m.course)}`
        ),
      "",
      "For a personalised shortlist, complete the assessment so your interests, reasoning and working style can be matched properly.",
    ].join("\n");
  }

  return [
    `Based on a **${scores.topInterestCode}** interest profile and a fit score of ${topCluster?.fit.score}/100, **${topCluster?.fit.cluster.name}** is the clearest direction.`,
    "",
    "Closest catalogue matches:",
    ...matches.slice(0, 3).map(
      (m) =>
        `• **${m.course.title}** — ${m.course.provider} · ${m.course.level} · ${feeLine(m.course)} · fit ${m.fitScore} · eligibility ${m.eligibility.status.replace("_", " ")}.`
    ),
    "",
    "You can ask me to compare these, filter by country or mode, or map the next 90 days. Fees and outcomes are indicative; your counsellor makes the final call, and nothing here guarantees admission or placement.",
  ].join("\n");
}

export async function runAdvisor(input: {
  learner: Learner;
  message: string;
  history: AdvisorMessage[];
}): Promise<AdvisorReply> {
  if (detectCrisis(input.message)) {
    return {
      text: crisisResponse(),
      provider: "rules",
      model: "safety-escalation",
      toolCalls: [],
      guardrail: { redacted: true, reasons: ["crisis_escalation"] },
    };
  }

  const { ctx, scores, planSummary } = await buildContext(input.learner);
  const config = geminiConfig();

  let reply: AdvisorReply | null = null;
  if (config.configured) {
    try {
      const result = await callGemini(
        input.learner,
        input.message,
        input.history,
        scores,
        ctx,
        planSummary
      );
      if (result.text.trim()) {
        reply = {
          text: result.text,
          provider: "gemini",
          model: result.model,
          toolCalls: result.toolCalls,
          guardrail: { redacted: false, reasons: [] },
        };
      }
    } catch (error) {
      const status = (error as { status?: number }).status;
      reply = {
        text: buildFallback(
          input.message,
          input.learner,
          scores,
          ctx,
          planSummary
        ),
        provider: "rules",
        model: "northstar-rules-v1",
        toolCalls: [],
        guardrail: { redacted: false, reasons: [] },
        fallbackReason:
          status === 429
            ? "The AI service is rate-limited right now."
            : "The AI service was unavailable.",
      };
    }
  }

  if (!reply) {
    reply = {
      text: buildFallback(input.message, input.learner, scores, ctx, planSummary),
      provider: "rules",
      model: "northstar-rules-v1",
      toolCalls: [],
      guardrail: { redacted: false, reasons: [] },
    };
  }

  const guarded = applyGuardrails(reply.text);
  return {
    ...reply,
    text: guarded.text,
    guardrail: { redacted: guarded.redacted, reasons: guarded.reasons },
  };
}
