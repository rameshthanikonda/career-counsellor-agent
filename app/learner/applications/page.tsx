import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarPlus,
  CalendarClock,
  CheckCircle2,
  Download,
  FileCheck2,
  Lock,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { daysUntil } from "@/lib/applications/checklist";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, Stat } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ApplicationsBoard } from "@/components/learner/applications-board";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) redirect("/onboarding");

  const workspace = await getLearnerWorkspace(learner.id);
  const { report, applications, shortlist, applicationSummary } = workspace;
  const released = report?.status === "released";

  if (!released) {
    return (
      <>
        <PageHeader
          eyebrow="Applications"
          title="Applications unlock with your report."
          description="Your shortlist becomes actionable only after a counsellor has reviewed and released the report. That checkpoint keeps a draft recommendation from turning into a real application."
          actions={
            <Badge tone="brass" dot>
              {report ? report.status.replace(/_/g, " ") : "No report"}
            </Badge>
          }
        />
        <div className="card p-8 text-center sm:p-12">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brandSoft text-brand">
            <Lock className="h-5 w-5" />
          </span>
          <h2 className="display mt-4 text-xl font-semibold text-content">
            Your shortlist is still being reviewed
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            Once the report is released you can track every application here:
            deadlines, documents, submission status and outcomes — with your
            counsellor able to see the same record.
          </p>
          <Link href="/learner/results" className={buttonClasses("primary", "md", "mt-5")}>
            <FileCheck2 className="h-4 w-4" /> View report status
          </Link>
        </div>
      </>
    );
  }

  const nextDays = applicationSummary.nextDeadline
    ? daysUntil(applicationSummary.nextDeadline.deadline)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Turn the shortlist into real applications."
        description="Track deadlines, documents and outcomes in one place. Your counsellor sees the same record, so the next review starts from evidence rather than memory."
        actions={
          <>
            <Link href="/learner/calendar" className={buttonClasses("secondary", "md")}>
              <CalendarPlus className="h-4 w-4" /> Calendar
            </Link>
            <a href="/api/applications/export" className={buttonClasses("secondary", "md")}>
              <Download className="h-4 w-4" /> Export CSV
            </a>
            <a href="/api/learner/export" className={buttonClasses("secondary", "md")}>
              <Download className="h-4 w-4" /> My data
            </a>
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tracked" value={applicationSummary.total} hint="Applications in the workspace" />
        <Stat label="Open" value={applicationSummary.open} hint="Planned, preparing or in progress" />
        <Stat
          label="Submitted"
          value={applicationSummary.submitted}
          hint="Awaiting a decision"
        />
        <Stat
          label="Offers"
          value={applicationSummary.offers}
          hint={applicationSummary.overdue > 0 ? `${applicationSummary.overdue} overdue deadline(s)` : "Decisions recorded"}
        />
      </div>

      {applicationSummary.nextDeadline && (
        <Alert tone={nextDays !== null && nextDays <= 7 ? "warning" : "info"} className="mb-5">
          <span className="font-medium text-content">Next deadline:</span>{" "}
          {applicationSummary.nextDeadline.course.title} on{" "}
          {formatDate(applicationSummary.nextDeadline.deadline)}
          {nextDays !== null
            ? nextDays < 0
              ? ` — ${Math.abs(nextDays)} day(s) overdue.`
              : ` — ${nextDays} day(s) away.`
            : ""}
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          eyebrow={`${applications.length} application${applications.length === 1 ? "" : "s"}`}
          title="Application tracker"
          description="Tick off documents as you file them. Status changes are audited and visible to your counsellor."
        >
          <ApplicationsBoard
            applications={applications}
            shortlist={shortlist.map((item) => ({
              courseId: item.courseId,
              title: item.course.title,
              provider: item.course.provider,
              level: item.course.level,
            }))}
          />
        </SectionCard>

        <div className="space-y-5">
          <SectionCard eyebrow="How it works" title="The application rhythm">
            <ol className="space-y-3">
              {[
                ["Planned", "You picked the programme and set the deadline."],
                ["Preparing", "Documents, tests and essays are in progress."],
                ["Submitted", "The institution has the application; keep the receipt."],
                ["Interview", "Prepare with your counsellor before the date."],
                ["Offer / not selected", "Record the decision; do not treat one outcome as the whole plan."],
              ].map(([label, detail], index) => (
                <li key={label} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brandSoft text-[0.58rem] font-semibold text-brand">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[0.72rem] font-semibold text-content">{label}</p>
                    <p className="text-[0.68rem] leading-5 text-muted">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard eyebrow="Keep in sync" title="Your plan and calendar">
            <p className="text-xs leading-5 text-muted">
              Milestones and quarterly reviews are already on your plan. Exporting
              adds application deadlines to the same calendar, with reminders 7 days
              before each deadline.
            </p>
            <div className="mt-3 grid gap-2">
              <a href="/api/calendar" className={buttonClasses("secondary", "sm", "w-full")}>
                <CalendarPlus className="h-3.5 w-3.5" /> Download calendar
              </a>
              <Link href="/learner/plan" className={buttonClasses("ghost", "sm", "w-full")}>
                <CalendarClock className="h-3.5 w-3.5" /> Open 12-month plan
              </Link>
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-line bg-panel p-5">
            <CheckCircle2 className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">
              Deadlines are not guarantees
            </p>
            <p className="mt-1 text-[0.7rem] leading-5 text-muted">
              Institutions change dates, criteria and fees. Verify every deadline
              in the official portal and keep the acknowledgement email.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
