import type {
  Application,
  Assessment,
  BigFive,
  Database,
  Learner,
  QuarterlyReview,
  Report,
  Riasec,
  Satisfaction,
  ShortlistItem,
} from "@/lib/types";
import type { AptitudeDimension } from "@/lib/types";
import { buildDefaultChecklist } from "@/lib/applications/checklist";
import {
  APTITUDE_ITEMS,
  BIG_FIVE_LABELS,
  INTEREST_ITEMS,
  INSTRUMENT_VERSION,
  PERSONALITY_ITEMS,
} from "@/lib/assessment/instruments";
import { scoreAssessment } from "@/lib/assessment/scoring";
import { buildSuggestedShortlist, computeClusterFits, rankCareerPaths } from "@/lib/catalogue/matching";
import { buildNarrative } from "@/lib/reports/narrative";
import { generatePlan } from "@/lib/plans/generator";
import { hashPassword } from "@/lib/auth/password";
import { COURSES } from "@/lib/catalogue/courses";
import { CAREER_PATHS } from "@/lib/catalogue/career-paths";
import { CAREER_CLUSTERS } from "@/lib/catalogue/clusters";

const DEMO_PASSWORD = "Northstar#2026";
const CONSENT_VERSION = "2026-07";

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

function daysAhead(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

const JITTER = [0.25, -0.15, 0.1, 0, -0.25, 0.2];

function makeResponses(
  interest: Record<Riasec, number>,
  aptitudeCorrect: Record<AptitudeDimension, number>,
  personality: Record<BigFive, number>
) {
  const responses: Record<string, number> = {};

  INTEREST_ITEMS.forEach((item, index) => {
    const base = interest[item.dimension as Riasec] ?? 3;
    const value = Math.round(base + JITTER[index % JITTER.length]);
    responses[item.id] = Math.min(5, Math.max(1, value));
  });

  for (const dim of Object.keys(aptitudeCorrect) as AptitudeDimension[]) {
    const items = APTITUDE_ITEMS.filter((i) => i.dimension === dim);
    items.forEach((item, index) => {
      const correct = index < aptitudeCorrect[dim];
      responses[item.id] = correct
        ? item.answerIndex
        : (item.answerIndex + 1) % item.options.length;
    });
  }

  PERSONALITY_ITEMS.forEach((item, index) => {
    const base = personality[item.dimension as BigFive] ?? 3;
    const desired = Math.min(5, Math.max(1, Math.round(base + JITTER[index % 4])));
    responses[item.id] = item.reverse ? 6 - desired : desired;
  });

  return responses;
}

function completedAssessment(params: {
  id: string;
  learnerId: string;
  interest: Record<Riasec, number>;
  aptitude: Record<AptitudeDimension, number>;
  personality: Record<BigFive, number>;
  completedDaysAgo: number;
  durationSeconds: number;
}): Assessment {
  const responses = makeResponses(params.interest, params.aptitude, params.personality);
  const startedAt = daysAgo(params.completedDaysAgo);
  const completedAt = daysAgo(params.completedDaysAgo - 1);
  return {
    id: params.id,
    learnerId: params.learnerId,
    instrumentVersion: INSTRUMENT_VERSION,
    status: "completed",
    startedAt,
    completedAt,
    responses,
    sectionTimings: {
      interest: Math.round(params.durationSeconds * 0.3),
      aptitude: Math.round(params.durationSeconds * 0.45),
      personality: Math.round(params.durationSeconds * 0.25),
    },
    scores: scoreAssessment({
      responses,
      durationSeconds: params.durationSeconds,
    }),
    createdAt: startedAt,
    updatedAt: completedAt,
  };
}

export function createSeedDatabase(): Database {
  const passwordHash = hashPassword(DEMO_PASSWORD);

  const aarav: Learner = {
    id: "l-aarav",
    userId: "u-aarav",
    stage: "undergraduate",
    fullName: "Aarav Menon",
    email: "aarav@demo.northstar.in",
    phone: "+91 98450 11223",
    dateOfBirth: "2004-03-18",
    city: "Bengaluru",
    country: "India",
    currentEducation: "B.Com (Hons), University of Delhi",
    institution: "Shri Ram College of Commerce",
    percentage: 78,
    subjects: ["Accountancy", "Economics", "Mathematics", "English"],
    backlogs: 0,
    englishTest: { type: "IELTS", score: 7.5 },
    workExperienceMonths: 4,
    targetIntake: "August 2027",
    budgetMinINR: 300000,
    budgetMaxINR: 1500000,
    preferredCountries: ["India", "United Kingdom"],
    preferredModes: ["on_campus", "hybrid"],
    interestAreas: ["Finance", "Data", "Public policy"],
    careerGoal:
      "Move into a finance or data analytics role, and build the quantitative depth to work on policy-linked financing.",
    intendedClusterId: "finance",
    counsellorId: "u-meera",
    consent: {
      dataProcessing: true,
      counsellingDisclaimer: true,
      guardianConsent: false,
      version: CONSENT_VERSION,
      acceptedAt: daysAgo(92),
    },
    onboardingCompletedAt: daysAgo(90),
    createdAt: daysAgo(94),
    updatedAt: daysAgo(40),
  };

  const diya: Learner = {
    id: "l-diya",
    userId: "u-diya",
    stage: "school",
    fullName: "Diya Sharma",
    email: "diya@demo.northstar.in",
    phone: "+91 98200 44556",
    dateOfBirth: "2009-07-02",
    city: "Mumbai",
    country: "India",
    currentEducation: "Class XII (CBSE), PCM + Fine Arts",
    institution: "Dhirubhai Ambani International School",
    percentage: 88,
    subjects: ["Physics", "Chemistry", "Mathematics", "English", "Fine Arts"],
    backlogs: 0,
    englishTest: { type: "None" },
    workExperienceMonths: 0,
    targetIntake: "August 2027",
    budgetMinINR: 500000,
    budgetMaxINR: 1200000,
    preferredCountries: ["India", "United Kingdom"],
    preferredModes: ["on_campus"],
    interestAreas: ["Design", "Media", "Psychology"],
    careerGoal:
      "Study design and build a career in experience or communication design, with a strong portfolio.",
    intendedClusterId: "design",
    counsellorId: "u-meera",
    consent: {
      dataProcessing: true,
      counsellingDisclaimer: true,
      guardianConsent: true,
      version: CONSENT_VERSION,
      acceptedAt: daysAgo(24),
    },
    onboardingCompletedAt: daysAgo(23),
    createdAt: daysAgo(26),
    updatedAt: daysAgo(2),
  };

  const kabir: Learner = {
    id: "l-kabir",
    userId: "u-kabir",
    stage: "professional",
    fullName: "Kabir Rao",
    email: "kabir@demo.northstar.in",
    city: "Hyderabad",
    country: "India",
    currentEducation: "B.Tech Mechanical Engineering",
    institution: "NIT Warangal",
    percentage: 71,
    subjects: ["Physics", "Mathematics", "Engineering"],
    backlogs: 0,
    englishTest: { type: "None" },
    workExperienceMonths: 62,
    targetIntake: "January 2027",
    budgetMinINR: 200000,
    budgetMaxINR: 800000,
    preferredCountries: ["India"],
    preferredModes: ["online", "hybrid"],
    interestAreas: ["Operations", "Sustainability"],
    careerGoal:
      "Move from plant operations into sustainability and energy transition roles without pausing work.",
    consent: {
      dataProcessing: true,
      counsellingDisclaimer: true,
      guardianConsent: false,
      version: CONSENT_VERSION,
      acceptedAt: daysAgo(6),
    },
    onboardingCompletedAt: daysAgo(5),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(5),
  };

  const aaravAssessment = completedAssessment({
    id: "as-aarav",
    learnerId: aarav.id,
    interest: { R: 2.4, I: 4.7, A: 2.3, S: 3.6, E: 4.2, C: 4.5 },
    aptitude: { numerical: 5, verbal: 4, logical: 5, spatial: 3 },
    personality: {
      openness: 4.0,
      conscientiousness: 4.5,
      extraversion: 3.4,
      agreeableness: 3.6,
      emotional_stability: 4.2,
    },
    completedDaysAgo: 58,
    durationSeconds: 1620,
  });

  const diyaAssessment = completedAssessment({
    id: "as-diya",
    learnerId: diya.id,
    interest: { R: 2.5, I: 3.4, A: 4.8, S: 4.3, E: 4.0, C: 2.7 },
    aptitude: { numerical: 3, verbal: 5, logical: 4, spatial: 4 },
    personality: {
      openness: 4.7,
      conscientiousness: 3.2,
      extraversion: 3.8,
      agreeableness: 4.4,
      emotional_stability: 3.1,
    },
    completedDaysAgo: 9,
    durationSeconds: 1380,
  });

  const aaravScores = aaravAssessment.scores!;
  const diyaScores = diyaAssessment.scores!;

  const aaravFits = computeClusterFits(aaravScores);
  const diyaFits = computeClusterFits(diyaScores);
  const aaravPaths = rankCareerPaths(aaravScores, 6);
  const diyaPaths = rankCareerPaths(diyaScores, 6);

  const shortlist = (
    learner: Learner,
    scores: NonNullable<Assessment["scores"]>,
    status: ShortlistItem["status"],
    prefix: string
  ): ShortlistItem[] =>
    buildSuggestedShortlist(learner, scores, COURSES, 5).map((item, index) => ({
      id: `sl-${prefix}-${index + 1}`,
      learnerId: learner.id,
      courseId: item.courseId,
      rank: item.rank,
      fitScore: item.fitScore,
      rationale: item.rationale,
      factors: item.factors,
      status,
      addedBy: "system",
      createdAt: daysAgo(45),
      updatedAt: daysAgo(40),
    }));

  const aaravShortlist = shortlist(aarav, aaravScores, "approved", "aarav").map((item) => ({
    ...item,
    status: "approved" as const,
    addedBy: "counsellor" as const,
  }));
  const diyaShortlist = shortlist(diya, diyaScores, "proposed", "diya");

  const makeApplication = (params: {
    id: string;
    learner: Learner;
    courseId: string;
    status: Application["status"];
    deadlineDays: number;
    doneItems: number;
    submittedDaysAgo?: number;
  }): Application => {
    const course = COURSES.find((row) => row.id === params.courseId);
    if (!course) throw new Error(`Seed course ${params.courseId} not found`);
    const now = daysAgo(0);
    return {
      id: params.id,
      learnerId: params.learner.id,
      courseId: params.courseId,
      status: params.status,
      deadline: daysAhead(params.deadlineDays),
      submittedAt:
        params.submittedDaysAgo !== undefined ? daysAgo(params.submittedDaysAgo) : undefined,
      checklist: buildDefaultChecklist(course, params.learner).map((item, index) => ({
        ...item,
        done: index < params.doneItems,
      })),
      createdAt: daysAgo(20),
      updatedAt: params.submittedDaysAgo !== undefined ? daysAgo(params.submittedDaysAgo) : now,
    };
  };

  const applications: Application[] = [
    makeApplication({
      id: "app-aarav-1",
      learner: aarav,
      courseId: aaravShortlist[0].courseId,
      status: "submitted",
      deadlineDays: 16,
      doneItems: 99,
      submittedDaysAgo: 6,
    }),
    makeApplication({
      id: "app-aarav-2",
      learner: aarav,
      courseId: aaravShortlist[1].courseId,
      status: "preparing",
      deadlineDays: 32,
      doneItems: 3,
    }),
  ];

  const aaravNarrative = buildNarrative({
    learner: aarav,
    scores: aaravScores,
    fits: aaravFits,
    paths: aaravPaths,
  });
  const diyaNarrative = buildNarrative({
    learner: diya,
    scores: diyaScores,
    fits: diyaFits,
    paths: diyaPaths,
  });

  const aaravReport: Report = {
    id: "rep-aarav",
    learnerId: aarav.id,
    version: 1,
    status: "released",
    verificationCode: "NS-2026-7K4Q",
    narrative: aaravNarrative,
    topClusterIds: aaravFits.slice(0, 3).map((f) => f.cluster.id),
    suggestedPathIds: aaravPaths.slice(0, 3).map((p) => p.path.id),
    counsellorId: "u-meera",
    counsellorNotes:
      "Reviewed with Aarav on the 12th. Confirmed his preference for a quantitative route; we removed one UK option on cost grounds and agreed to revisit it only if funding is confirmed.",
    learnerFacingNote:
      "We reviewed this together. Your strongest next step is to confirm the English test requirement and submit two applications before the priority deadline.",
    createdAt: daysAgo(58),
    updatedAt: daysAgo(41),
    submittedAt: daysAgo(57),
    reviewedAt: daysAgo(43),
    approvedAt: daysAgo(43),
    releasedAt: daysAgo(41),
  };

  const diyaReport: Report = {
    id: "rep-diya",
    learnerId: diya.id,
    version: 1,
    status: "in_review",
    verificationCode: "NS-2026-3M8B",
    narrative: diyaNarrative,
    topClusterIds: diyaFits.slice(0, 3).map((f) => f.cluster.id),
    suggestedPathIds: diyaPaths.slice(0, 3).map((p) => p.path.id),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(2),
    submittedAt: daysAgo(2),
  };

  const planDraft = generatePlan(aarav, aaravPaths[0].path, {
    startDate: new Date(daysAgo(80)),
    shortlistCount: aaravShortlist.length,
  });

  const milestones = planDraft.milestones.map((m, index) => {
    const done = index < 2;
    const inProgress = index === 2;
    return {
      id: `ms-aarav-${index + 1}`,
      planId: "plan-aarav",
      quarter: m.quarter,
      order: m.order,
      title: m.title,
      description: m.description,
      dueDate: m.dueDate,
      status: done ? ("done" as const) : inProgress ? ("in_progress" as const) : ("pending" as const),
      evidence: done
        ? index === 0
          ? "Counselling session notes saved in the review workspace."
          : "Eligibility sheet updated with confirmed percentages and IELTS score."
        : undefined,
      completedAt: done ? daysAgo(60 - index * 12) : undefined,
    };
  });

  const aaravPlan = {
    id: "plan-aarav",
    learnerId: aarav.id,
    title: planDraft.title,
    status: "active" as const,
    startDate: planDraft.startDate,
    endDate: planDraft.endDate,
    objective: planDraft.objective,
    createdBy: "system" as const,
    approvedAt: daysAgo(42),
    createdAt: daysAgo(58),
    updatedAt: daysAgo(18),
  };

  // Diya's report is in review, so the submission flow would already have
  // created a draft plan. Keep the demo internally consistent.
  const diyaPlanDraft = generatePlan(diya, diyaPaths[0].path, {
    startDate: new Date(daysAgo(2)),
    shortlistCount: diyaShortlist.length,
  });
  const diyaMilestones = diyaPlanDraft.milestones.map((m, index) => ({
    id: `ms-diya-${index + 1}`,
    planId: "plan-diya",
    quarter: m.quarter,
    order: m.order,
    title: m.title,
    description: m.description,
    dueDate: m.dueDate,
    status: "pending" as const,
  }));
  const diyaPlan = {
    id: "plan-diya",
    learnerId: diya.id,
    title: diyaPlanDraft.title,
    status: "draft" as const,
    startDate: diyaPlanDraft.startDate,
    endDate: diyaPlanDraft.endDate,
    objective: diyaPlanDraft.objective,
    createdBy: "system" as const,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  };

  const aaravReviews: QuarterlyReview[] = [
    {
      id: "rev-aarav-1",
      learnerId: aarav.id,
      quarter: 3,
      year: new Date().getFullYear(),
      scheduledFor: daysAgo(20),
      completedAt: daysAgo(18),
      counsellorId: "u-meera",
      progressRating: 4,
      notes:
        "On track. Eligibility mostly confirmed; two applications drafted. Aarav is more confident about the analytics route than the policy route, so we will test that at the next review.",
      nextSteps:
        "Submit two priority applications and finish the SQL project before the next checkpoint.",
      learnerReflection:
        "The plan feels realistic now that the options are narrowed. I need to protect time for applications alongside finals.",
    },
    {
      id: "rev-aarav-2",
      learnerId: aarav.id,
      quarter: 4,
      year: new Date().getFullYear(),
      scheduledFor: daysAhead(70),
    },
  ];

  const diyaReviews: QuarterlyReview[] = [
    {
      id: "rev-diya-1",
      learnerId: diya.id,
      quarter: 4,
      year: new Date().getFullYear(),
      scheduledFor: daysAhead(10),
    },
  ];

  const aaravSatisfaction: Satisfaction = {
    id: "sat-aarav",
    learnerId: aarav.id,
    reportId: aaravReport.id,
    score: 4,
    comment:
      "Clear and honest. I appreciated that the counsellor flagged the cost of the UK option instead of pushing it.",
    createdAt: daysAgo(35),
  };

  const users = [
    {
      id: "u-aarav",
      email: aarav.email,
      passwordHash,
      role: "learner" as const,
      name: aarav.fullName,
      phone: aarav.phone,
      createdAt: aarav.createdAt,
      lastLoginAt: daysAgo(1),
    },
    {
      id: "u-diya",
      email: diya.email,
      passwordHash,
      role: "learner" as const,
      name: diya.fullName,
      phone: diya.phone,
      createdAt: diya.createdAt,
      lastLoginAt: daysAgo(2),
    },
    {
      id: "u-kabir",
      email: kabir.email,
      passwordHash,
      role: "learner" as const,
      name: kabir.fullName,
      createdAt: kabir.createdAt,
      lastLoginAt: daysAgo(5),
    },
    {
      id: "u-meera",
      email: "meera@demo.northstar.in",
      passwordHash,
      role: "counsellor" as const,
      name: "Meera Iyer",
      title: "Senior Career Counsellor",
      createdAt: daysAgo(400),
      lastLoginAt: daysAgo(0),
    },
    {
      id: "u-rohan",
      email: "admin@demo.northstar.in",
      passwordHash,
      role: "admin" as const,
      name: "Rohan Verma",
      title: "Operations Lead",
      createdAt: daysAgo(400),
      lastLoginAt: daysAgo(3),
    },
  ];

  return {
    users,
    learners: [aarav, diya, kabir],
    assessments: [aaravAssessment, diyaAssessment],
    courses: COURSES,
    careerPaths: CAREER_PATHS,
    shortlists: [...aaravShortlist, ...diyaShortlist],
    applications,
    plans: [aaravPlan, diyaPlan],
    milestones: [...milestones, ...diyaMilestones],
    reports: [aaravReport, diyaReport],
    reviews: [...aaravReviews, ...diyaReviews],
    satisfaction: [aaravSatisfaction],
    feedback: [
      {
        id: "fb-aarav-1",
        userId: "u-aarav",
        name: "Aarav Menon",
        email: "aarav@demo.northstar.in",
        role: "learner" as const,
        category: "idea" as const,
        message:
          "It would help to see the fee difference between my two shortlisted programmes side by side in the plan, not only in the shortlist tab.",
        rating: 4,
        page: "/learner/plan",
        status: "reviewing" as const,
        createdAt: daysAgo(12),
        updatedAt: daysAgo(10),
      },
      {
        id: "fb-meera-1",
        userId: "u-meera",
        name: "Meera Iyer",
        email: "meera@demo.northstar.in",
        role: "counsellor" as const,
        category: "bug" as const,
        message:
          "When a report is returned, the learner notification is useful, but I would like the reason to appear on the queue row as well.",
        page: "/counsellor",
        status: "open" as const,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
    ],
    licences: [
      {
        id: "lic-compass",
        instrumentName: "Northstar Career Compass Battery",
        provider: "Northstar / WAECS (in-house)",
        licenceRef: "IN-HOUSE-NC-1.2",
        validFrom: "2025-04-01",
        validTo: "2027-03-31",
        seats: 10000,
        seatsUsed: 412,
        status: "active",
        scope: "Interest, aptitude and work-style screening for counselling",
        notes:
          "Proprietary instrument built for guidance. Not a clinical or selection instrument. Reviewed annually by the counselling lead.",
        updatedAt: daysAgo(30),
      },
      {
        id: "lic-sii",
        instrumentName: "Strong Interest Inventory",
        provider: "The Myers-Briggs Company",
        licenceRef: "SII-IN-2024-1182",
        validFrom: "2024-04-01",
        validTo: "2026-03-31",
        seats: 500,
        seatsUsed: 500,
        status: "expired",
        scope: "Interest inventory — licensed administration only",
        notes:
          "Licence lapsed. The platform blocks administration until a renewed agreement is recorded.",
        updatedAt: daysAgo(220),
      },
      {
        id: "lic-16pf",
        instrumentName: "16PF Personality Questionnaire",
        provider: "Pearson",
        licenceRef: "16PF-IN-2025-0421",
        validFrom: "2025-06-01",
        validTo: "2027-05-31",
        seats: 300,
        seatsUsed: 41,
        status: "active",
        scope: "Personality — administered by qualified practitioners only",
        updatedAt: daysAgo(120),
      },
      {
        id: "lic-disc",
        instrumentName: "DISC Profile",
        provider: "Wiley",
        licenceRef: "DISC-PENDING-2026",
        validFrom: "2026-09-01",
        validTo: "2027-08-31",
        seats: 200,
        seatsUsed: 0,
        status: "pending",
        scope: "Team and work-style profiling",
        notes: "Awaiting countersigned agreement. Do not administer.",
        updatedAt: daysAgo(10),
      },
    ],
    audit: [
      {
        id: "aud-1",
        actorId: "u-meera",
        actorName: "Meera Iyer",
        actorRole: "counsellor",
        action: "report.released",
        entity: "report",
        entityId: "rep-aarav",
        metadata: { learner: "Aarav Menon", version: 1 },
        createdAt: daysAgo(41),
      },
      {
        id: "aud-2",
        actorId: "u-meera",
        actorName: "Meera Iyer",
        actorRole: "counsellor",
        action: "report.approved",
        entity: "report",
        entityId: "rep-aarav",
        metadata: { learner: "Aarav Menon" },
        createdAt: daysAgo(43),
      },
      {
        id: "aud-3",
        actorId: "u-diya",
        actorName: "Diya Sharma",
        actorRole: "learner",
        action: "report.submitted_for_review",
        entity: "report",
        entityId: "rep-diya",
        metadata: { learner: "Diya Sharma" },
        createdAt: daysAgo(2),
      },
      {
        id: "aud-4",
        actorId: "u-aarav",
        actorName: "Aarav Menon",
        actorRole: "learner",
        action: "assessment.completed",
        entity: "assessment",
        entityId: "as-aarav",
        metadata: { instrument: INSTRUMENT_VERSION },
        createdAt: daysAgo(58),
      },
      {
        id: "aud-5",
        actorId: "u-rohan",
        actorName: "Rohan Verma",
        actorRole: "admin",
        action: "licence.expired",
        entity: "licence",
        entityId: "lic-sii",
        metadata: { instrument: "Strong Interest Inventory" },
        createdAt: daysAgo(220),
      },
      {
        id: "aud-6",
        actorId: "u-meera",
        actorName: "Meera Iyer",
        actorRole: "counsellor",
        action: "review.completed",
        entity: "review",
        entityId: "rev-aarav-1",
        metadata: { learner: "Aarav Menon", rating: 4 },
        createdAt: daysAgo(18),
      },
    ],
    advisorMessages: [
      {
        id: "msg-aarav-1",
        learnerId: aarav.id,
        role: "assistant",
        content:
          "Your profile points towards quantitative, structured work: the Investigative and Conventional themes are strongest, and your numerical reasoning is a relative strength. I can compare the shortlisted programmes on fees and eligibility, or help you plan the next 90 days.\n\nOne caution before we go further: no course can guarantee a placement or a salary, and the catalogue's outcome bands are indicative until you verify them with each institution.",
        createdAt: daysAgo(40),
        model: "fallback-rules-v1",
      },
    ],
    notifications: [
      {
        id: "notif-meera-1",
        userId: "u-meera",
        title: "Report awaiting review",
        body: "Diya Sharma's counselling report has been submitted for review.",
        href: "/counsellor/learner/l-diya",
        read: false,
        createdAt: daysAgo(2),
      },
      {
        id: "notif-meera-2",
        userId: "u-meera",
        title: "Quarterly review due",
        body: "Diya Sharma's first quarterly review is due in 10 days.",
        href: "/counsellor",
        read: false,
        createdAt: daysAgo(3),
      },
      {
        id: "notif-aarav-1",
        userId: "u-aarav",
        title: "Your report is ready",
        body: "Meera Iyer released your counselling report. You can download the PDF.",
        href: "/learner/results",
        read: true,
        createdAt: daysAgo(41),
      },
      {
        id: "notif-aarav-2",
        userId: "u-aarav",
        title: "Milestone due soon",
        body: "Finalise the programme shortlist — this milestone is in progress.",
        href: "/learner/plan",
        read: false,
        createdAt: daysAgo(5),
      },
      {
        id: "notif-rohan-1",
        userId: "u-rohan",
        title: "Licence expired",
        body: "The Strong Interest Inventory licence lapsed. Administration is blocked.",
        href: "/admin",
        read: false,
        createdAt: daysAgo(220),
      },
    ],
  };
}

export const DEMO_ACCOUNTS = [
  {
    role: "learner" as const,
    name: "Aarav Menon",
    email: "aarav@demo.northstar.in",
    password: DEMO_PASSWORD,
    blurb: "Final-year B.Com learner with a released report and active plan.",
  },
  {
    role: "counsellor" as const,
    name: "Meera Iyer",
    email: "meera@demo.northstar.in",
    password: DEMO_PASSWORD,
    blurb: "Counsellor workspace with a report awaiting review.",
  },
  {
    role: "admin" as const,
    name: "Rohan Verma",
    email: "admin@demo.northstar.in",
    password: DEMO_PASSWORD,
    blurb: "Operations: catalogue, instrument licensing and audit trail.",
  },
];

export function seedMeta() {
  return {
    instrumentVersion: INSTRUMENT_VERSION,
    clusters: CAREER_CLUSTERS.length,
    courses: COURSES.length,
    paths: CAREER_PATHS.length,
    bigFiveLabels: BIG_FIVE_LABELS,
  };
}
