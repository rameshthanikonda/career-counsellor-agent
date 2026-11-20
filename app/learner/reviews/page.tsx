import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarPlus, Check, Clock, Star } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, KeyValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ReflectionForm } from "@/components/learner/reflection-form";
import { SatisfactionForm } from "@/components/learner/satisfaction-form";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= value ? "fill-brass-500 text-brass-500" : "text-lineStrong"
          )}
        />
      ))}
    </span>
  );
}

export default async function ReviewsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) redirect("/onboarding");

  const workspace = await getLearnerWorkspace(learner.id);
  const { reviews, report, satisfaction } = workspace;
  const counsellor = learner.counsellorId
    ? await store.getUserById(learner.counsellorId)
    : report?.counsellorId
      ? await store.getUserById(report.counsellorId)
      : null;
  const upcoming = reviews
    .filter((r) => !r.completedAt)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const completed = reviews
    .filter((r) => r.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const next = upcoming[0];
  const daysUntil = next
    ? Math.ceil(
        (new Date(next.scheduledFor).getTime() - Date.now()) / (24 * 3600 * 1000)
      )
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Quarterly reviews"
        title="Reviews keep the plan honest."
        description="Every quarter, you and your counsellor check progress against evidence, adjust the plan and agree the next four moves. The learner's reflection is part of the record."
        actions={
          <>
            {next && (
              <Badge tone="brand" dot>
                Next {formatDate(next.scheduledFor)}
              </Badge>
            )}
            <Link href="/learner/calendar" className={buttonClasses("secondary", "md")}>
              <CalendarPlus className="h-4 w-4" /> Calendar
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {next ? (
            <SectionCard
              eyebrow={`Q${next.quarter} · ${next.year}`}
              title="Your next review"
              action={
                daysUntil !== null && daysUntil >= 0 ? (
                  <div className="text-right">
                    <p className="display text-2xl font-semibold text-brand">{daysUntil}</p>
                    <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">
                      days away
                    </p>
                  </div>
                ) : undefined
              }
            >
              <dl className="grid grid-cols-2 gap-4">
                <KeyValue label="Scheduled" value={formatDate(next.scheduledFor)} />
                <KeyValue label="Counsellor" value={counsellor?.name ?? "To be assigned"} />
                <KeyValue label="Duration" value="45 minutes" />
                <KeyValue label="Format" value="Video call · notes shared after" />
              </dl>

              <div className="mt-5 rounded-xl border border-line bg-panel2/40 p-4">
                <p className="text-xs font-semibold text-content">What to bring</p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    "Evidence for completed milestones (applications, results, projects)",
                    "Any change in budget, destination or timeline",
                    "One decision you want to leave the session with",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[0.7rem] leading-5 text-muted">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {report?.status === "released" ? (
                <div className="mt-5 border-t border-line pt-5">
                  <ReflectionForm review={next} />
                </div>
              ) : (
                <p className="mt-4 text-[0.7rem] text-muted">
                  Reflections open once your report is released.
                </p>
              )}
            </SectionCard>
          ) : (
            <SectionCard eyebrow="Reviews" title="No review scheduled">
              <p className="text-sm leading-6 text-muted">
                Your counsellor schedules the next quarterly review after your report is
                released. You can still add a reflection when it appears here.
              </p>
              <Link href="/learner/results" className={buttonClasses("secondary", "md", "mt-4")}>
                Open your report
              </Link>
            </SectionCard>
          )}

          <SectionCard
            eyebrow="Feedback"
            title="Report satisfaction"
            description="A single measure the counselling team tracks: was the report useful?"
          >
            {report?.status === "released" ? (
              <SatisfactionForm initial={satisfaction} />
            ) : (
              <p className="text-sm text-muted">
                Available after your report is released.
              </p>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard
            eyebrow="History"
            title="Completed reviews"
            bodyClassName="p-0 sm:p-0"
          >
            {completed.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                No completed reviews yet. Your first review will appear here with notes
                and agreed next steps.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {completed.map((review) => (
                  <li key={review.id} className="px-5 py-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-content">
                          Q{review.quarter} · {review.year}
                        </p>
                        <p className="text-[0.65rem] text-faint">
                          {formatDate(review.completedAt)}
                        </p>
                      </div>
                      {typeof review.progressRating === "number" && (
                        <Rating value={review.progressRating} />
                      )}
                    </div>
                    {review.notes && (
                      <p className="mt-2.5 text-xs leading-5 text-muted">{review.notes}</p>
                    )}
                    {review.nextSteps && (
                      <div className="mt-2.5 rounded-lg bg-panel2/60 px-3 py-2">
                        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-faint">
                          Agreed next steps
                        </p>
                        <p className="mt-0.5 text-[0.7rem] leading-5 text-content">
                          {review.nextSteps}
                        </p>
                      </div>
                    )}
                    {review.learnerReflection && (
                      <div className="mt-2 rounded-lg border border-line px-3 py-2">
                        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-faint">
                          Your reflection
                        </p>
                        <p className="mt-0.5 text-[0.7rem] leading-5 text-muted">
                          {review.learnerReflection}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard eyebrow="How it works" title="The quarterly rhythm">
            <ol className="space-y-3">
              {[
                "You add a reflection before the session.",
                "The counsellor reviews progress against evidence.",
                "Together you adjust milestones and budget.",
                "The agreed next steps are recorded and dated.",
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brandSoft text-[0.58rem] font-semibold text-brand">
                    {index + 1}
                  </span>
                  <span className="text-[0.72rem] leading-5 text-muted">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-panel2/60 px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-muted" />
              <p className="text-[0.65rem] text-muted">Reviews are 45 minutes, once a quarter.</p>
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-line bg-panel p-5">
            <CalendarCheck className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">
              A missed review is a signal
            </p>
            <p className="mt-1 text-[0.7rem] leading-5 text-muted">
              If a review is missed or a milestone stalls, the counsellor records it.
              Plans should be revised, not quietly abandoned.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
