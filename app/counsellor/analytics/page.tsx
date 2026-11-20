import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  Star,
  Users,
} from "lucide-react";
import { requireCounsellor } from "@/lib/auth/session";
import { getCounsellorAnalytics } from "@/lib/services/analytics";
import { APPLICATION_STATUS_LABELS } from "@/lib/applications/checklist";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, Stat } from "@/components/ui/card";
import { Badge, humanStatus } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApplicationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Caseload analytics" };
export const dynamic = "force-dynamic";

const STATUS_BAR: Record<ApplicationStatus, string> = {
  planned: "bg-lineStrong",
  preparing: "bg-brass-500",
  submitted: "bg-slateblue-500",
  interview: "bg-brand",
  offer: "bg-evergreen-500",
  rejected: "bg-clay-500",
  withdrawn: "bg-line",
};

const STATUS_TONE: Record<ApplicationStatus, "neutral" | "brass" | "brand" | "success" | "clay"> = {
  planned: "neutral",
  preparing: "brass",
  submitted: "brand",
  interview: "brand",
  offer: "success",
  rejected: "clay",
  withdrawn: "neutral",
};

export default async function AnalyticsPage() {
  await requireCounsellor();
  const data = await getCounsellorAnalytics();
  const maxFunnel = Math.max(1, ...data.applicationFunnel.map((row) => row.count));
  const maxStage = Math.max(1, ...Object.values(data.byStage));

  return (
    <>
      <PageHeader
        eyebrow="Counsellor operations"
        title="Caseload analytics"
        description="A live view of assessment completion, report throughput, application outcomes, deadline risk and learner satisfaction. Every number is computed from the store — nothing is sampled or estimated."
        actions={
          <>
            <Link href="/counsellor" className={buttonClasses("secondary", "md")}>
              <Users className="h-4 w-4" /> Review queue
            </Link>
            <Link href="/counsellor/catalogue" className={buttonClasses("secondary", "md")}>
              <ClipboardList className="h-4 w-4" /> Catalogue
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Learners" value={data.learners} hint={`${data.unassigned} unassigned`} />
        <Stat
          label="Assessment rate"
          value={`${data.assessmentRate}%`}
          hint={`${data.assessmentsCompleted}/${data.learners} complete`}
        />
        <Stat
          label="Open applications"
          value={data.applications.open}
          hint={`${data.applications.submitted} submitted`}
        />
        <Stat
          label="Offers"
          value={data.applications.offers}
          hint={`${data.applications.rejected} not selected`}
        />
        <Stat
          label="Satisfaction"
          value={data.satisfaction.average ? `${data.satisfaction.average}/5` : "—"}
          hint={`${data.satisfaction.count} ratings`}
        />
      </div>

      {(data.applications.overdue > 0 || data.applications.dueSoon > 0) && (
        <Alert
          tone={data.applications.overdue > 0 ? "warning" : "info"}
          title="Deadline risk"
          className="mb-5"
        >
          {data.applications.overdue} application
          {data.applications.overdue === 1 ? "" : "s"} overdue and{" "}
          {data.applications.dueSoon} due within 14 days. These rows are prioritised
          in the review queue.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <SectionCard
            eyebrow="Outcomes"
            title="Application funnel"
            description="Where the caseload sits between planning and a decision."
          >
            <ul className="space-y-3">
              {data.applicationFunnel.map((row) => (
                <li key={row.status}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-content">
                      <Badge tone={STATUS_TONE[row.status]}>
                        {APPLICATION_STATUS_LABELS[row.status]}
                      </Badge>
                    </span>
                    <span className="tabular-nums text-xs font-semibold text-content">
                      {row.count}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel2">
                    <div
                      className={cn("h-full rounded-full", STATUS_BAR[row.status])}
                      style={{ width: `${(row.count / maxFunnel) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-[0.68rem] text-muted">
              <span>
                Conversion to submitted:{" "}
                <strong className="text-content">
                  {data.applications.total
                    ? Math.round(
                        ((data.applications.submitted + data.applications.offers) /
                          data.applications.total) *
                          100
                      )
                    : 0}
                  %
                </strong>
              </span>
              <span>
                Offers: <strong className="text-content">{data.applications.offers}</strong>
              </span>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Risk"
            title="Upcoming deadlines"
            description="Open applications with a dated deadline, nearest first."
            bodyClassName="p-0 sm:p-0"
          >
            {data.deadlines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                No deadlines inside the 14-day window.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.deadlines.map(({ application, learner, days }) => (
                  <li
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-content">
                        {learner.fullName} · {application.course.title}
                      </p>
                      <p className="text-[0.65rem] text-muted">
                        {application.course.provider} ·{" "}
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </p>
                    </div>
                    <Badge tone={days < 0 ? "clay" : days <= 7 ? "brass" : "outline"}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Team"
            title="Caseload by counsellor"
            description="Assignment is a filter, not a hard access boundary; every record access is audited."
            bodyClassName="p-0 sm:p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-panel2/60">
                  <tr>
                    {["Counsellor", "Assigned", "Open apps", "Awaiting review"].map(
                      (label) => (
                        <th
                          key={label}
                          className="whitespace-nowrap px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-faint"
                        >
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.caseload.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-content">{row.name}</p>
                        <p className="text-[0.6rem] text-faint">{humanStatus(row.role)}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted">{row.assigned}</td>
                      <td className="px-4 py-2.5 text-xs text-muted">
                        {row.openApplications}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.awaitingReview > 0 ? (
                          <Badge tone="brass">{row.awaitingReview}</Badge>
                        ) : (
                          <span className="text-xs text-faint">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.unassigned > 0 && (
              <p className="border-t border-line px-4 py-2.5 text-[0.68rem] text-brass-600 dark:text-brass-300">
                {data.unassigned} learner{data.unassigned === 1 ? "" : "s"} unassigned —
                assign from the learner record.
              </p>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard eyebrow="Assessments" title="By stage">
            <ul className="space-y-3">
              {Object.entries(data.byStage)
                .sort((a, b) => b[1] - a[1])
                .map(([stage, count]) => (
                  <li key={stage}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-muted">{stage.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-content">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel2">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(count / maxStage) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-faint">
                Report pipeline
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(data.reportStatuses).map(([status, count]) => (
                  <Badge key={status} tone="outline">
                    {humanStatus(status)} · {count}
                  </Badge>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Follow-up" title="Reviews due">
            {data.reviewsDue.length === 0 ? (
              <p className="text-sm text-muted">No pending reviews.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.reviewsDue.map(({ review, learner, days }) => (
                  <li key={review.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-content">
                        {learner.fullName}
                      </p>
                      <p className="text-[0.62rem] text-faint">
                        Q{review.quarter} · {formatDate(review.scheduledFor)}
                      </p>
                    </div>
                    <Badge tone={days < 0 ? "clay" : days <= 14 ? "brass" : "outline"}>
                      {days < 0 ? `${Math.abs(days)}d late` : `${days}d`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard eyebrow="Feedback" title="Satisfaction">
            <div className="flex items-center gap-3">
              <span className="display text-3xl font-semibold text-brand">
                {data.satisfaction.average ?? "—"}
              </span>
              <div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={cn(
                        "h-3.5 w-3.5",
                        value <= Math.round(data.satisfaction.average ?? 0)
                          ? "fill-brass-500 text-brass-500"
                          : "text-lineStrong"
                      )}
                    />
                  ))}
                </div>
                <p className="text-[0.65rem] text-muted">
                  {data.satisfaction.count} rating{data.satisfaction.count === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {([5, 4, 3, 2, 1] as const).map((score) => {
                const count = data.satisfaction.distribution[score];
                const percent = data.satisfaction.count
                  ? Math.round((count / data.satisfaction.count) * 100)
                  : 0;
                return (
                  <li key={score} className="flex items-center gap-2">
                    <span className="w-3 text-[0.65rem] text-faint">{score}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
                      <div
                        className="h-full rounded-full bg-brass-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-[0.62rem] text-muted">{count}</span>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <div className="rounded-2xl border border-line bg-panel p-5">
            <BarChart3 className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">Read the funnel honestly</p>
            <p className="mt-1 text-[0.7rem] leading-5 text-muted">
              A low offer count is not a failure of the learner or the counsellor.
              Admission is competitive and outside anyone&apos;s guarantee. Use the
              funnel to spot stalled applications, not to rank people.
            </p>
            <p className="mt-2 text-[0.62rem] text-faint">
              Generated {formatDate(data.generatedAt, { hour: "numeric", minute: "2-digit" })} from live records.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
