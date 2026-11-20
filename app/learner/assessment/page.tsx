import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, FileText, Lock } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentRunner } from "@/components/learner/assessment-runner";
import { Alert } from "@/components/ui/alert";
import { Badge, humanStatus, statusTone } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Assessment" };
export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) redirect("/onboarding");

  const assessment = await store.getAssessmentByLearner(learner.id);
  const report = await store.getReportByLearner(learner.id);
  const firstName = learner.fullName.split(" ")[0];

  if (assessment?.status === "completed") {
    const released = report?.status === "released";
    return (
      <>
        <PageHeader
          eyebrow="Assessment"
          title="Your assessment is complete."
          description="The battery is locked once submitted, so the result cannot be gamed or quietly edited. A reassessment can be arranged with your counsellor."
        />

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brandSoft text-brand">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <p className="eyebrow">Career Compass battery · v1.2</p>
                <h2 className="display mt-1 text-xl font-semibold text-content">
                  Submitted {formatDate(assessment.completedAt)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {released
                    ? "Your report has been reviewed and released. Open it to see your profile, shortlist and plan."
                    : "Your report is with a counsellor for review. You will be notified when it is released."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Items answered", value: Object.keys(assessment.responses).length },
                {
                  label: "Response quality",
                  value: assessment.scores?.quality.band
                    ? `${assessment.scores.quality.score}/100`
                    : "—",
                },
                {
                  label: "Time taken",
                  value: assessment.scores?.quality.durationSeconds
                    ? `${Math.round(assessment.scores.quality.durationSeconds / 60)} min`
                    : "—",
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-line bg-panel2/40 p-4">
                  <p className="text-[0.62rem] uppercase tracking-[0.1em] text-faint">
                    {stat.label}
                  </p>
                  <p className="display mt-1 text-lg font-semibold text-content">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/learner/results" className={buttonClasses("primary", "md")}>
                <FileText className="h-4 w-4" />
                {released ? "Open released report" : "View report status"}
              </Link>
              <Link href="/learner/advisor" className={buttonClasses("secondary", "md")}>
                Ask the advisor about your options
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <div className="card p-5">
              <p className="eyebrow">Report status</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone={statusTone(report?.status ?? "draft")} dot>
                  {humanStatus(report?.status ?? "draft")}
                </Badge>
                <span className="text-[0.68rem] text-faint">v{report?.version ?? 1}</span>
              </div>
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Submitted for review</span>
                  <span className="font-medium text-content">
                    {formatDate(report?.submittedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Counsellor approved</span>
                  <span className="font-medium text-content">
                    {formatDate(report?.approvedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Released to you</span>
                  <span className="font-medium text-content">
                    {formatDate(report?.releasedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <Lock className="h-4 w-4 text-brand" />
              <p className="mt-2 text-sm font-semibold text-content">Why it is locked</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                A completed assessment is a record, not a draft. If your circumstances
                change, your counsellor can authorise a reassessment and the new
                version will be tracked separately.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[0.68rem] text-faint">
                <Clock className="h-3.5 w-3.5" /> Instrument version 1.2.0
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Alert tone="guardrail" title="Scores are not a verdict">
            Psychometric results describe preferences and practice-level reasoning.
            They do not measure your worth, and they do not determine admission or
            hiring outcomes.
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Assessment"
        title={assessment ? "Pick up where you left off." : "Career Compass battery"}
        description={
          assessment
            ? "Your answers are saved. Complete the remaining sections to send your profile to a counsellor."
            : undefined
        }
        actions={
          assessment ? (
            <Badge tone="brass" dot>
              In progress
            </Badge>
          ) : undefined
        }
      />
      <AssessmentRunner assessment={assessment} firstName={firstName} />
    </>
  );
}
