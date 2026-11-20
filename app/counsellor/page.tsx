import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Star,
  Users,
} from "lucide-react";
import { requireCounsellor } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { getCounsellorQueue, type QueueRow } from "@/lib/services/counsellor";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, Stat } from "@/components/ui/card";
import { Badge, humanStatus, statusTone } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate, relativeTime } from "@/lib/utils/format";
import { daysUntil, isOpenApplication } from "@/lib/applications/checklist";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Review queue" };
export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All learners" },
  { key: "awaiting_review", label: "Awaiting review" },
  { key: "in_progress", label: "In progress" },
  { key: "no_assessment", label: "No assessment" },
  { key: "released", label: "Released" },
];

const STAGE_LABEL: Record<QueueRow["stage"], string> = {
  awaiting_review: "Awaiting review",
  in_progress: "In progress",
  no_assessment: "No assessment",
  released: "Released",
};

export default async function CounsellorQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; scope?: string }>;
}) {
  const user = await requireCounsellor();
  const params = await searchParams;
  const active = FILTERS.some((filter) => filter.key === params.stage)
    ? params.stage!
    : "all";
  const scope = params.scope === "mine" ? "mine" : "all";

  const store = getStore();
  const [allQueue, stats] = await Promise.all([getCounsellorQueue(), store.stats()]);
  const queue =
    scope === "mine"
      ? allQueue.filter((row) => row.learner.counsellorId === user.id)
      : allQueue;
  const rows =
    active === "all" ? queue : queue.filter((row) => row.stage === active);
  const awaiting = queue.filter((row) => row.stage === "awaiting_review").length;

  return (
    <>
      <PageHeader
        eyebrow="Counsellor workspace"
        title="Review queue"
        description="Every learner, ordered by what needs a human next. Reports awaiting review come first; released learners stay visible for quarterly follow-up."
        actions={
          <Link href="/counsellor/catalogue" className={buttonClasses("secondary", "md")}>
            <ClipboardList className="h-4 w-4" /> Browse catalogue
          </Link>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Learners" value={stats.learners} hint="Across all stages" />
        <Stat
          label="Awaiting review"
          value={stats.reportsAwaitingReview}
          hint="Drafts and in-review reports"
        />
        <Stat
          label="Assessments complete"
          value={stats.assessmentsCompleted}
          hint="Scored batteries on file"
        />
        <Stat
          label="Satisfaction"
          value={stats.averageSatisfaction ? `${stats.averageSatisfaction}/5` : "—"}
          hint="Average learner rating"
        />
      </div>

      {awaiting > 0 && (
        <Alert tone="warning" title={`${awaiting} report${awaiting === 1 ? "" : "s"} waiting on a counsellor`} className="mb-5">
          A learner cannot see their report, plan or PDF until a counsellor
          reviews and releases it. Open the queue row to review the narrative and
          the shortlist together.
        </Alert>
      )}

      <div className="mb-2 flex flex-wrap gap-1.5">
        {[
          { key: "all", label: "Whole team", href: `/counsellor${active === "all" ? "" : `?stage=${active}`}` },
          {
            key: "mine",
            label: "My caseload",
            href: `/counsellor?scope=mine${active === "all" ? "" : `&stage=${active}`}`,
          },
        ].map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              scope === item.key
                ? "border-brand bg-brand text-brandContrast"
                : "border-line bg-panel text-muted hover:text-content"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter.key === "all"
              ? queue.length
              : queue.filter((row) => row.stage === filter.key).length;
          const query = [
            scope === "mine" ? "scope=mine" : "",
            filter.key === "all" ? "" : `stage=${filter.key}`,
          ]
            .filter(Boolean)
            .join("&");
          return (
            <Link
              key={filter.key}
              href={query ? `/counsellor?${query}` : "/counsellor"}
              className={cn(
                "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active === filter.key
                  ? "border-brand bg-brandSoft text-brand"
                  : "border-line bg-panel text-muted hover:text-content"
              )}
            >
              {filter.label}
              <span className="rounded-full bg-panel2 px-1.5 text-[0.62rem] tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <SectionCard
        eyebrow={`${rows.length} learner${rows.length === 1 ? "" : "s"}`}
        title="Work queue"
        bodyClassName="p-0 sm:p-0"
      >
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto h-5 w-5 text-faint" />
            <p className="mt-2 text-sm font-medium text-content">
              Nothing in this filter
            </p>
            <p className="mt-1 text-xs text-muted">
              Switch to “All learners” to see the full caseload.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const assessmentDate =
                row.assessment?.completedAt ?? row.assessment?.startedAt;
              const openApplications = row.applications.filter(isOpenApplication);
              const nextApplication = openApplications
                .filter((application) => application.deadline)
                .sort(
                  (a, b) =>
                    new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
                )[0];
              const overdueApplications = openApplications.filter((application) => {
                const days = daysUntil(application.deadline);
                return days !== null && days < 0;
              }).length;
              return (
                <li key={row.learner.id}>
                  <Link
                    href={`/counsellor/learner/${row.learner.id}`}
                    className="focus-ring group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-panel2/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-content">
                          {row.learner.fullName}
                        </p>
                        <Badge tone={statusTone(row.report?.status ?? "")} >
                          {STAGE_LABEL[row.stage]}
                        </Badge>
                        <Badge tone="outline">
                          {humanStatus(row.learner.stage)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {row.learner.currentEducation} · {row.learner.city} ·
                        target {row.learner.targetIntake}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-faint">
                        <span className="inline-flex items-center gap-1">
                          <ClipboardCheck className="h-3 w-3" />
                          {row.assessment?.status === "completed"
                            ? `Assessed ${formatDate(assessmentDate)}`
                            : row.assessment
                              ? "Assessment in progress"
                              : "No assessment"}
                        </span>
                        {row.nextReview && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarCheck className="h-3 w-3" />
                            Q{row.nextReview.quarter} review {formatDate(row.nextReview.scheduledFor)}
                          </span>
                        )}
                        {row.report && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Report {humanStatus(row.report.status)} · updated{" "}
                            {relativeTime(row.report.updatedAt)}
                          </span>
                        )}
                        {openApplications.length > 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              overdueApplications > 0 &&
                                "font-medium text-clay-600 dark:text-clay-300"
                            )}
                          >
                            <ClipboardList className="h-3 w-3" />
                            {openApplications.length} application
                            {openApplications.length === 1 ? "" : "s"}
                            {nextApplication
                              ? ` · next ${formatDate(nextApplication.deadline)}`
                              : ""}
                            {overdueApplications > 0
                              ? ` · ${overdueApplications} overdue`
                              : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted group-hover:text-content">
                      Open record
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <p className="mt-4 text-[0.68rem] leading-5 text-muted">
        Queue order is deterministic: reports awaiting review first, then
        assessments in progress, released learners, and learners without an
        assessment. Learner records are confidential; access is audited.
      </p>
    </>
  );
}
