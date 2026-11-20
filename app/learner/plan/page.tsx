import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarPlus, Compass, Download, Lock, Target } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, KeyValue } from "@/components/ui/card";
import { Badge, humanStatus } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PlanBoard } from "@/components/learner/plan-board";
import { formatDate } from "@/lib/utils/format";
import { CAREER_PATHS } from "@/lib/catalogue/career-paths";

export const metadata: Metadata = { title: "12-month plan" };
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) redirect("/onboarding");

  const workspace = await getLearnerWorkspace(learner.id);
  const { plan, report, reviews, progress } = workspace;
  const nextReview = reviews
    .filter((r) => !r.completedAt)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];

  if (!plan || report?.status !== "released") {
    return (
      <>
        <PageHeader
          eyebrow="12-month plan"
          title="Your plan unlocks with the report."
          description="The plan is built from your assessment and shortlist, then approved by your counsellor alongside the report. It is not generated as an afterthought."
        />
        <div className="card p-8 text-center sm:p-12">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brandSoft text-brand">
            <Lock className="h-5 w-5" />
          </span>
          <h2 className="display mt-4 text-xl font-semibold text-content">
            {plan ? "Awaiting counsellor approval" : "Not created yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            {report
              ? `Your report is ${humanStatus(report.status).toLowerCase()}. The plan becomes active once it is released.`
              : "Complete the assessment to generate a draft plan for review."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/learner/results" className={buttonClasses("primary", "md")}>
              View report status
            </Link>
            <Link href="/learner/advisor" className={buttonClasses("secondary", "md")}>
              Talk it through first
            </Link>
          </div>
        </div>
      </>
    );
  }

  const path = CAREER_PATHS.find((p) =>
    plan.title.toLowerCase().includes(p.title.toLowerCase())
  ) ?? workspace.paths[0]?.path;

  return (
    <>
      <PageHeader
        eyebrow="12-month plan"
        title={plan.title}
        description="Four quarters, ten checkable milestones, one counsellor review cadence. Mark progress with evidence — not just status."
        actions={
          <>
            <Badge tone="success" dot>
              Active
            </Badge>
            <Link href="/learner/reviews" className={buttonClasses("secondary", "md")}>
              <CalendarCheck className="h-4 w-4" /> Reviews
            </Link>
            <Link href="/learner/calendar" className={buttonClasses("secondary", "md")}>
              <CalendarPlus className="h-4 w-4" /> Calendar
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <PlanBoard plan={plan} />

        <div className="space-y-5">
          <SectionCard eyebrow="Plan" title="At a glance">
            <dl className="space-y-3">
              <KeyValue label="Start" value={formatDate(plan.startDate)} />
              <KeyValue label="End" value={formatDate(plan.endDate)} />
              <KeyValue
                label="Progress"
                value={`${progress.milestonesDone} of ${progress.milestonesTotal} milestones`}
              />
              <KeyValue
                label="Next review"
                value={nextReview ? formatDate(nextReview.scheduledFor) : "To be scheduled"}
              />
              {path && <KeyValue label="Route" value={path.title} />}
            </dl>
            <div className="mt-4">
              <Link href="/learner/reviews" className={buttonClasses("quiet", "sm", "w-full")}>
                Prepare for the review
              </Link>
            </div>
          </SectionCard>

          {path && (
            <SectionCard eyebrow="Career route" title={path.title}>
              <p className="text-xs leading-6 text-muted">{path.summary}</p>
              <div className="mt-3 space-y-2">
                {path.progression.slice(0, 3).map((stage) => (
                  <div
                    key={stage.title}
                    className="flex items-center justify-between gap-2 rounded-lg bg-panel2/50 px-3 py-2"
                  >
                    <span className="text-[0.7rem] font-medium text-content">{stage.title}</span>
                    <span className="text-[0.62rem] text-faint">
                      {stage.yearsFrom}–{stage.yearsTo} yrs
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/learner/results"
                className={buttonClasses("ghost", "sm", "mt-3 w-full")}
              >
                Full career map
              </Link>
            </SectionCard>
          )}

          {report && (
            <SectionCard eyebrow="Report" title="Reference document">
              <p className="text-xs leading-6 text-muted">
                Your released report v{report.version} contains the assessment
                interpretation, shortlist reasoning and counsellor notes.
              </p>
              <a
                href={`/api/reports/${report.id}/pdf`}
                className={buttonClasses("secondary", "sm", "mt-3 w-full")}
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </a>
            </SectionCard>
          )}

          <div className="rounded-2xl border border-line bg-panel p-5">
            <Target className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">A plan, not a promise</p>
            <p className="mt-1 text-[0.7rem] leading-5 text-muted">
              Milestones are within your control: applications, evidence,
              skill-building and reviews. Admissions and hiring decisions are not.
            </p>
          </div>

          <Alert tone="info" title="Quarterly cadence">
            Progress is reviewed every quarter. If a milestone slips, mark it and raise
            it in the review — the plan should change when reality changes.
          </Alert>
        </div>
      </div>
    </>
  );
}
