import type { CareerPath, Learner, MilestoneStatus } from "@/lib/types";

export interface DraftMilestone {
  quarter: 1 | 2 | 3 | 4;
  order: number;
  title: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
}

export interface GeneratedPlan {
  title: string;
  objective: string;
  startDate: string;
  endDate: string;
  milestones: DraftMilestone[];
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function addMonths(base: Date, months: number) {
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

function quarterForDay(day: number): 1 | 2 | 3 | 4 {
  if (day < 91) return 1;
  if (day < 182) return 2;
  if (day < 273) return 3;
  return 4;
}

interface RawMilestone {
  day: number;
  title: string;
  description: string;
}

export function generatePlan(
  learner: Learner,
  path: CareerPath,
  options: { startDate?: Date; shortlistCount?: number } = {}
): GeneratedPlan {
  const start = options.startDate ?? new Date();
  start.setUTCHours(0, 0, 0, 0);
  const startIso = start.toISOString();
  const endIso = addMonths(start, 12);
  const shortlistCount = options.shortlistCount ?? 5;
  const skills = path.skills.slice(0, 3);
  const professional = learner.stage === "professional";

  const raw: RawMilestone[] = professional
    ? [
        {
          day: 14,
          title: "Review assessment findings with your counsellor",
          description:
            "Walk through the report, confirm which of the shortlisted paths genuinely fits your experience, and record any constraints (notice period, location, family).",
        },
        {
          day: 35,
          title: `Close the two most material skill gaps for ${path.title}`,
          description: `Pick two skills from ${skills.join(", ")} and choose a course, project or internal assignment that produces evidence.`,
        },
        {
          day: 60,
          title: `Finalise ${shortlistCount} programmes or roles to pursue`,
          description:
            "Confirm eligibility, fees, timelines and mode for each option with your counsellor. Record why each is on the list.",
        },
        {
          day: 90,
          title: "Ship a verifiable portfolio artefact",
          description:
            "Complete one project, case study or measurable work outcome that demonstrates the target skills to a hiring manager.",
        },
        {
          day: 130,
          title: "Refresh your CV, LinkedIn and narrative",
          description:
            "Rewrite your experience around the target path, with outcomes and evidence. Have the counsellor review it.",
        },
        {
          day: 170,
          title: "Run an informational interview or referral conversation",
          description:
            "Speak to two people already in the target role. Capture what they wish they had known and adjust the plan.",
        },
        {
          day: 210,
          title: "Apply to priority roles or programmes",
          description:
            "Submit applications to the top options, including at least one realistic backup. Track each application.",
        },
        {
          day: 250,
          title: "Prepare for interviews and assessments",
          description:
            "Practise role-specific cases, portfolio walkthroughs and compensation conversations.",
        },
        {
          day: 300,
          title: "Compare offers on total value, not salary alone",
          description:
            "Weigh learning, scope, stability and cost. Do not accept an offer you have not had reviewed.",
        },
        {
          day: 340,
          title: "Start strong and schedule the next quarterly review",
          description:
            "Agree a 90-day onboarding plan with your new manager or programme, and book the next review with your counsellor.",
        },
      ]
    : [
        {
          day: 14,
          title: "Review your assessment report with your counsellor",
          description:
            "Confirm the top two clusters, ask about anything that feels inaccurate, and agree the shortlist direction before committing.",
        },
        {
          day: 35,
          title: "Close eligibility gaps",
          description:
            "Confirm your percentage, subjects and English test evidence. Resolve every 'needs confirmation' flag on the shortlist.",
        },
        {
          day: 60,
          title: `Shortlist ${shortlistCount} programmes and check each prospectus`,
          description:
            "For every option, note the fee, intake, eligibility and application deadline. Remove anything that does not survive scrutiny.",
        },
        {
          day: 90,
          title: "Build the academic fundamentals",
          description: `Complete a foundational course or project in ${skills.join(", ")} and record the evidence in your plan.`,
        },
        {
          day: 125,
          title: "Register for entrance tests and English exams",
          description:
            "Book test dates with enough buffer for a retake. Add score targets to the plan.",
        },
        {
          day: 160,
          title: "Draft applications, essays and portfolio",
          description:
            "Write the first versions of statements and portfolio pieces. Get feedback from your counsellor before submitting.",
        },
        {
          day: 200,
          title: "Submit priority applications",
          description:
            "Apply to the top programmes, keeping at least one realistic backup. Track submission receipts and deadlines.",
        },
        {
          day: 240,
          title: "Prepare for interviews and portfolio reviews",
          description:
            "Rehearse your story, the 'why this course' answer and a walkthrough of your strongest project.",
        },
        {
          day: 280,
          title: "Compare offers and funding",
          description:
            "Lay out total cost, scholarship status, location and outcomes. Do not treat any outcome as guaranteed.",
        },
        {
          day: 330,
          title: "Complete enrolment, funding and relocation steps",
          description:
            "Accept the offer, arrange funds, visa or hostel, and complete registration. Confirm the next review date.",
        },
      ];

  const milestones: DraftMilestone[] = raw.map((m, index) => ({
    quarter: quarterForDay(m.day),
    order: index + 1,
    title: m.title,
    description: m.description,
    dueDate: addDays(start, m.day),
    status: "pending" as const,
  }));

  const title = professional
    ? `12-month plan: move into ${path.title}`
    : `12-month plan: ${
        learner.stage === "school" ? "choose and enter" : "progress into"
      } ${path.title}`;

  const objective = `Build a verified, evidence-backed route into ${path.title} by ${new Date(
    endIso
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })}, with each milestone producing something a counsellor or admissions panel can check.`;

  return { title, objective, startDate: startIso, endDate: endIso, milestones };
}
