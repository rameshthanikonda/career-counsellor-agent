import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  Compass,
  FileText,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
  Target,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, statusTone, humanStatus } from "@/components/ui/badge";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { SectionCard, KeyValue } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate, formatFeeRange, relativeTime } from "@/lib/utils/format";
import { CLUSTER_BY_ID } from "@/lib/catalogue/clusters";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function LearnerDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) redirect("/onboarding");

  const workspace = await getLearnerWorkspace(learner.id);
  const {
    assessment,
    report,
    plan,
    progress,
    shortlist,
    applications,
    applicationSummary,
    reviews,
    satisfaction,
    fits,
  } = workspace;  const counsellor = learner.counsellorId
    ? await store.getUserById(learner.counsellorId)
    : report?.counsellorId
      ? await store.getUserById(report.counsellorId)
      : null;
  const counsellorName = counsellor?.name ?? "Not yet assigned";
  const counsellorInitials = counsellor
    ? counsellor.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
    : "WA";

  const firstName = learner.fullName.split(" ")[0];
  const nextReview = reviews
    .filter((r) => !r.completedAt)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];
  const leadingFit = fits[0];
  const reportReleased = report?.status === "released";

  const journey = [
    {
      label: "Profile & consent",
      state: "done" as const,
      detail: learner.city + " · " + learner.currentEducation,
      href: "/onboarding",
    },
    {
      label: "Assessment",
      state: assessment?.status === "completed" ? ("done" as const) : assessment?.status === "in_progress" ? ("active" as const) : ("todo" as const),
      detail:
        assessment?.status === "completed"
          ? `Completed ${formatDate(assessment.completedAt)}`
          : assessment?.status === "in_progress"
            ? "In progress — pick up where you left off"
            : "About 30 minutes across three sections",
      href: "/learner/assessment",
    },
    {
      label: "Counsellor review",
      state:
        report?.status === "released"
          ? ("done" as const)
          : report?.status === "in_review" || report?.status === "approved"
            ? ("active" as const)
            : ("todo" as const),
      detail:
        report?.status === "released"
          ? `Released ${formatDate(report.releasedAt)}`
          : report?.status === "in_review"
            ? "With your counsellor now"
            : "Opens after your assessment",
      href: "/learner/results",
    },
    {
      label: "12-month plan",
      state: plan ? ("active" as const) : ("todo" as const),
      detail: plan
        ? `${progress.milestonesDone} of ${progress.milestonesTotal} milestones complete`
        : "Created with your report",
      href: "/learner/plan",
    },
    {
      label: "Quarterly review",
      state: nextReview ? ("todo" as const) : ("done" as const),
      detail: nextReview
        ? `Scheduled ${formatDate(nextReview.scheduledFor)}`
        : "No review scheduled",
      href: "/learner/reviews",
    },
  ];

  const nextActions: { title: string; body: string; href: string; cta: string }[] = [];
  if (!assessment) {
    nextActions.push({
      title: "Start your assessment",
      body: "Three short sections on interests, reasoning and working style. You can pause and resume at any point.",
      href: "/learner/assessment",
      cta: "Begin assessment",
    });
  } else if (assessment.status === "in_progress") {
    nextActions.push({
      title: "Resume your assessment",
      body: "Your answers are saved as you go. Finish the remaining sections to unlock your review.",
      href: "/learner/assessment",
      cta: "Resume",
    });
  }
  if (report?.status === "in_review") {
    nextActions.push({
      title: "No action needed yet",
      body: `${report.counsellorId ? "Your counsellor" : "A counsellor"} is reviewing your report. You will be notified when it is released.`,
      href: "/learner/results",
      cta: "View status",
    });
  }
  if (progress.nextMilestone) {
    nextActions.push({
      title: `Next milestone: ${progress.nextMilestone.title}`,
      body: progress.nextMilestone.description,
      href: "/learner/plan",
      cta: "Open plan",
    });
  }
  if (reportReleased && !satisfaction) {
    nextActions.push({
      title: "Tell us how the report landed",
      body: "A one-question satisfaction check helps the counselling team improve. It is optional and confidential.",
      href: "/learner/reviews#satisfaction",
      cta: "Rate the report",
    });
  }
  if (nextReview) {
    nextActions.push({
      title: "Prepare for your quarterly review",
      body: `Bring evidence for the milestones you have completed. Review is scheduled for ${formatDate(nextReview.scheduledFor)}.`,
      href: "/learner/reviews",
      cta: "Review details",
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Learner workspace"
        title={`Welcome back, ${firstName}.`}
        description={
          reportReleased
            ? "Your report is released and your plan is active. Keep the milestones moving and bring evidence to your next review."
            : assessment?.status === "completed"
              ? "Your assessment is complete. A counsellor is reviewing the interpretation before it reaches you."
              : "Start with the assessment, then build a shortlist and a 12-month plan with your counsellor."
        }
        actions={
          <>
            <Badge tone="outline" dot>
              {learner.stage === "school"
                ? "School learner"
                : learner.stage === "professional"
                  ? "Working professional"
                  : learner.stage === "postgraduate"
                    ? "Postgraduate"
                    : "Undergraduate"}
            </Badge>
            <a href="/api/learner/export" className={buttonClasses("secondary", "sm")}>
              My data
            </a>
            {assessment && assessment.status !== "completed" && (
              <Link href="/learner/assessment" className={buttonClasses("primary", "md")}>
                Resume assessment
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          {/* Journey */}
          <SectionCard
            eyebrow="Your route"
            title="Where you are in the process"
            action={
              <span className="text-xs text-muted">
                Updated {relativeTime(learner.updatedAt)}
              </span>
            }
            bodyClassName="p-0 sm:p-0"
          >
            <ol className="divide-y divide-line">
              {journey.map((step, index) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="focus-ring flex items-center gap-4 px-5 py-4 transition-colors hover:bg-panel2/50 sm:px-6"
                  >
                    <span
                      className={
                        step.state === "done"
                          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandSoft text-brand"
                          : step.state === "active"
                            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-panel text-[0.7rem] font-semibold text-brand"
                            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-[0.7rem] font-semibold text-faint"
                      }
                    >
                      {step.state === "done" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-content">
                          {step.label}
                        </span>
                        {step.state === "active" && (
                          <Badge tone="brand" className="py-0 text-[0.6rem]">
                            In progress
                          </Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {step.detail}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                  </Link>
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* Next actions */}
          <SectionCard
            eyebrow="Next actions"
            title="What to do next"
            description="Small, concrete steps — not a wall of options."
          >
            {nextActions.length === 0 ? (
              <div className="rounded-xl border border-line bg-panel2/40 px-4 py-6 text-center">
                <p className="text-sm font-medium text-content">
                  You are up to date. Your counsellor will be in touch before the
                  next review.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {nextActions.slice(0, 3).map((action, index) => (
                  <li
                    key={action.title}
                    className="flex flex-col gap-3 rounded-xl border border-line bg-panel2/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brandSoft text-[0.65rem] font-semibold text-brand">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-content">{action.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">
                          {action.body}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={action.href}
                      className={buttonClasses("secondary", "sm", "shrink-0")}
                    >
                      {action.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Shortlist */}
          <SectionCard
            eyebrow="Shortlist"
            title="Programmes under consideration"
            description="Ranked on fit, eligibility, budget and preference. Open the report for the full reasoning."
            action={
              <Link href="/learner/results" className={buttonClasses("ghost", "sm")}>
                View results <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
            bodyClassName="p-0 sm:p-0"
          >
            {shortlist.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted sm:px-6">
                Your shortlist appears once the assessment is complete and reviewed.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {shortlist.slice(0, 3).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                    <span className="display w-6 shrink-0 text-sm font-semibold text-faint">
                      {String(item.rank).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-content">
                        {item.course.title}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {item.course.provider} · {item.course.level} ·{" "}
                        {formatFeeRange(item.course.feeMinINR, item.course.feeMaxINR)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="display text-lg font-semibold text-brand">
                        {item.fitScore}
                      </p>
                      <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">
                        fit
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {report && (
            <SectionCard eyebrow="Counselling report" title="Report status">
              <div className="flex items-center justify-between gap-3">
                <Badge tone={statusTone(report.status)} dot>
                  {humanStatus(report.status)}
                </Badge>
                <span className="text-[0.68rem] text-faint">v{report.version}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {report.status === "released"
                  ? `Reviewed and released by ${counsellorName} on ${formatDate(report.releasedAt)}.`
                  : report.status === "in_review"
                    ? "Submitted and waiting for your counsellor's review. Nothing is final yet."
                    : report.status === "approved"
                      ? "Approved by your counsellor and awaiting release."
                      : "A draft has been prepared from your assessment."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-panel2/60 p-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">
                    Top fit
                  </p>
                  <p className="mt-1 text-xs font-medium text-content">
                    {leadingFit?.cluster.shortName ?? "Pending"}
                  </p>
                </div>
                <div className="rounded-lg bg-panel2/60 p-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">
                    Interest code
                  </p>
                  <p className="mt-1 text-xs font-medium text-content">
                    {assessment?.scores?.topInterestCode ?? "—"}
                  </p>
                </div>
              </div>
              <Link
                href="/learner/results"
                className={buttonClasses("secondary", "md", "mt-4 w-full")}
              >
                {reportReleased ? (
                  <>
                    <FileText className="h-4 w-4" /> Open report
                  </>
                ) : (
                  "View status"
                )}
              </Link>
            </SectionCard>
          )}

          {plan && (
            <SectionCard eyebrow="12-month plan" title="Progress">
              <div className="flex items-center gap-4">
                <ProgressRing value={progress.percent} size={72} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-content">
                    {progress.milestonesDone} of {progress.milestonesTotal} milestones
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-muted">
                    Plan started {formatDate(plan.startDate)}. Ends{" "}
                    {formatDate(plan.endDate)}.
                  </p>
                </div>
              </div>
              {progress.nextMilestone && (
                <div className="mt-4 rounded-xl border border-line bg-panel2/40 p-3">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-faint">
                    Next up · Q{progress.nextMilestone.quarter}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-content">
                    {progress.nextMilestone.title}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] text-muted">
                    Due {formatDate(progress.nextMilestone.dueDate)}
                  </p>
                </div>
              )}
              {progress.overdue.length > 0 && (
                <p className="mt-3 text-[0.68rem] font-medium text-clay-600 dark:text-clay-300">
                  {progress.overdue.length} milestone
                  {progress.overdue.length > 1 ? "s" : ""} past due — raise this at
                  your next review.
                </p>
              )}
              <Link
                href="/learner/plan"
                className={buttonClasses("ghost", "sm", "mt-3 w-full")}
              >
                Open the plan <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </SectionCard>
          )}

          {reportReleased && (
            <SectionCard eyebrow="Applications" title="Deadlines & decisions">
              {applicationSummary.total === 0 ? (
                <>
                  <p className="text-sm leading-6 text-muted">
                    Your shortlist is approved. Track each application to keep
                    deadlines, documents and outcomes in one place.
                  </p>
                  <Link
                    href="/learner/applications"
                    className={buttonClasses("secondary", "md", "mt-4 w-full")}
                  >
                    <ListChecks className="h-4 w-4" /> Start tracking
                  </Link>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-panel2/60 p-3 text-center">
                      <p className="display text-xl font-semibold text-content">
                        {applicationSummary.open}
                      </p>
                      <p className="text-[0.6rem] uppercase tracking-[0.08em] text-faint">
                        open
                      </p>
                    </div>
                    <div className="rounded-lg bg-panel2/60 p-3 text-center">
                      <p className="display text-xl font-semibold text-content">
                        {applicationSummary.submitted}
                      </p>
                      <p className="text-[0.6rem] uppercase tracking-[0.08em] text-faint">
                        submitted
                      </p>
                    </div>
                    <div className="rounded-lg bg-panel2/60 p-3 text-center">
                      <p className="display text-xl font-semibold text-content">
                        {applicationSummary.offers}
                      </p>
                      <p className="text-[0.6rem] uppercase tracking-[0.08em] text-faint">
                        offers
                      </p>
                    </div>
                  </div>
                  {applicationSummary.nextDeadline && (
                    <div className="mt-3 rounded-xl border border-line bg-panel2/40 p-3">
                      <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-faint">
                        <CalendarClock className="h-3 w-3" /> Next deadline
                      </p>
                      <p className="mt-1 text-xs font-medium leading-5 text-content">
                        {applicationSummary.nextDeadline.course.title}
                      </p>
                      <p className="text-[0.68rem] text-muted">
                        {formatDate(applicationSummary.nextDeadline.deadline)}
                        {applicationSummary.overdue > 0
                          ? ` · ${applicationSummary.overdue} overdue`
                          : ""}
                      </p>
                    </div>
                  )}
                  <Link
                    href="/learner/applications"
                    className={buttonClasses("ghost", "sm", "mt-3 w-full")}
                  >
                    Open tracker <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </SectionCard>
          )}

          <SectionCard eyebrow="Counsellor" title="Your counselling team">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brandSoft text-sm font-semibold text-brand">
                {counsellorInitials}
              </span>
              <div>
                <p className="text-sm font-semibold text-content">{counsellorName}</p>
                <p className="text-xs text-muted">
                  {counsellor?.title ?? "Career counselling · WAECS"}
                </p>
              </div>
            </div>
            <dl className="mt-4 space-y-3">
              <KeyValue
                label="Next review"
                value={nextReview ? formatDate(nextReview.scheduledFor) : "To be scheduled"}
              />
              <KeyValue
                label="Target intake"
                value={learner.targetIntake || "Not set"}
              />
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-panel2/60 px-3 py-2">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted" />
              <p className="text-[0.68rem] leading-4 text-muted">
                Quarterly reviews keep the plan honest. Bring evidence, not just
                intentions.
              </p>
            </div>
          </SectionCard>

          <SectionCard eyebrow="AI advisor" title="Ask about your options" bodyClassName="pt-5">
            <p className="text-sm leading-6 text-muted">
              The advisor can search this catalogue, compare fees and build a route
              from your scores. It cannot promise outcomes, and every conversation
              stays inside your record.
            </p>
            <Link
              href="/learner/advisor"
              className={buttonClasses("quiet", "md", "mt-4 w-full")}
            >
              <Sparkles className="h-4 w-4" /> Open advisor
            </Link>
            <p className="mt-2 text-center text-[0.62rem] text-faint">
              Uses Gemini with tool calling when configured
            </p>
          </SectionCard>
        </div>
      </div>

      {reportReleased && shortlist.length > 0 && (
        <div className="mt-5">
          <Alert tone="guardrail" title="What this plan does not promise">
            Fees, eligibility and outcome bands are indicative and must be verified
            with each institution. Northstar does not guarantee admission,
            placement, salary or visa outcomes, and your counsellor&apos;s judgement
            remains the final word.
          </Alert>
        </div>
      )}
    </>
  );
}
