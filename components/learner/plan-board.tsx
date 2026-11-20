"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Loader2,
  MessageSquareText,
  Play,
  RotateCcw,
  Save,
} from "lucide-react";
import type { Milestone, MilestoneStatus, PlanWithMilestones } from "@/lib/types";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { Badge, humanStatus } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const QUARTER_LABEL: Record<number, string> = {
  1: "Quarter 1 · Months 1–3",
  2: "Quarter 2 · Months 4–6",
  3: "Quarter 3 · Months 7–9",
  4: "Quarter 4 · Months 10–12",
};

export function PlanBoard({ plan }: { plan: PlanWithMilestones }) {
  const [milestones, setMilestones] = useState<Milestone[]>(plan.milestones);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const done = milestones.filter((m) => m.status === "done").length;
  const percent = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
  const now = Date.now();

  const grouped = useMemo(() => {
    return [1, 2, 3, 4].map((quarter) => ({
      quarter,
      items: milestones.filter((m) => m.quarter === quarter),
    }));
  }, [milestones]);

  async function update(milestone: Milestone, patch: Partial<Milestone>) {
    setBusy(milestone.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/plans/${plan.id}/milestones/${milestone.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: patch.status,
            evidence: patch.evidence,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not update the milestone.");
        return;
      }
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestone.id ? { ...m, ...data.milestone } : m))
      );
      setEditing(null);
      setEvidenceDraft("");
    } catch {
      setError("The server could not be reached. Your change was not saved.");
    } finally {
      setBusy(null);
    }
  }

  function nextStatus(status: MilestoneStatus): MilestoneStatus {
    if (status === "pending") return "in_progress";
    if (status === "in_progress") return "done";
    if (status === "at_risk") return "in_progress";
    return "in_progress";
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProgressRing value={percent} size={76} />
            <div>
              <p className="text-sm font-semibold text-content">
                {done} of {milestones.length} milestones complete
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge tone={plan.status === "active" ? "success" : "neutral"} dot>
                  {humanStatus(plan.status)}
                </Badge>
                {plan.approvedAt && (
                  <span className="text-[0.65rem] text-faint">
                    Approved {formatDate(plan.approvedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:text-right">
            {[1, 2, 3, 4].map((q) => {
              const items = milestones.filter((m) => m.quarter === q);
              const qDone = items.filter((m) => m.status === "done").length;
              return (
                <div key={q}>
                  <p className="text-[0.58rem] uppercase tracking-[0.1em] text-faint">Q{q}</p>
                  <p className="text-sm font-semibold tabular-nums text-content">
                    {qDone}/{items.length}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted">
          {plan.objective}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-clay-500/30 bg-clay-500/[0.07] px-4 py-3 text-xs text-clay-700 dark:text-clay-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {grouped.map(({ quarter, items }, groupIndex) => {
          const qDone = items.filter((m) => m.status === "done").length;
          return (
            <details
              key={quarter}
              open={groupIndex === 0 || qDone < items.length}
              className="group overflow-hidden rounded-2xl border border-line bg-panel"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-panel2/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-canvas text-[0.65rem] font-semibold text-muted">
                    Q{quarter}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-content">
                      {QUARTER_LABEL[quarter]}
                    </p>
                    <p className="text-[0.68rem] text-muted">
                      {qDone} of {items.length} complete
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={qDone} max={items.length || 1} className="hidden w-24 sm:block" />
                  <ChevronDown className="h-4 w-4 text-faint transition-transform group-open:rotate-180" />
                </div>
              </summary>

              <ul className="divide-y divide-line border-t border-line">
                {items.map((milestone) => {
                  const overdue =
                    milestone.status !== "done" &&
                    new Date(milestone.dueDate).getTime() < now;
                  const isBusy = busy === milestone.id;
                  return (
                    <li key={milestone.id} className="px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                              milestone.status === "done"
                                ? "border-brand bg-brand text-brandContrast"
                                : milestone.status === "in_progress"
                                  ? "border-brass-500 text-brass-600 dark:text-brass-300"
                                  : milestone.status === "at_risk"
                                    ? "border-clay-500 text-clay-600 dark:text-clay-300"
                                    : "border-lineStrong text-transparent"
                            )}
                          >
                            {milestone.status === "done" ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  milestone.status === "done"
                                    ? "text-muted line-through decoration-lineStrong"
                                    : "text-content"
                                )}
                              >
                                {milestone.title}
                              </p>
                              {milestone.status !== "pending" && (
                                <Badge
                                  tone={
                                    milestone.status === "done"
                                      ? "success"
                                      : milestone.status === "at_risk"
                                        ? "clay"
                                        : "brass"
                                  }
                                >
                                  {humanStatus(milestone.status)}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              {milestone.description}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem]">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1",
                                  overdue ? "font-medium text-clay-600 dark:text-clay-300" : "text-faint"
                                )}
                              >
                                <Clock className="h-3 w-3" />
                                Due {formatDate(milestone.dueDate)}
                                {overdue ? " · overdue" : ""}
                              </span>
                              {milestone.completedAt && (
                                <span className="text-faint">
                                  Completed {formatDate(milestone.completedAt)}
                                </span>
                              )}
                            </div>
                            {milestone.evidence && (
                              <div className="mt-2 rounded-lg border border-line bg-panel2/40 px-3 py-2">
                                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-faint">
                                  Evidence
                                </p>
                                <p className="mt-0.5 text-[0.7rem] leading-5 text-muted">
                                  {milestone.evidence}
                                </p>
                              </div>
                            )}
                            {overdue && milestone.status !== "at_risk" && (
                              <p className="mt-1.5 inline-flex items-center gap-1 text-[0.65rem] font-medium text-clay-600 dark:text-clay-300">
                                <CircleAlert className="h-3 w-3" /> Raise this at your next review.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              update(milestone, { status: nextStatus(milestone.status) })
                            }
                            className="focus-ring inline-flex h-8 items-center gap-1 rounded-lg border border-lineStrong bg-panel px-2.5 text-[0.68rem] font-medium text-content transition-colors hover:bg-panel2 disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : milestone.status === "done" ? (
                              <RotateCcw className="h-3 w-3" />
                            ) : milestone.status === "in_progress" ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            {milestone.status === "done"
                              ? "Reopen"
                              : milestone.status === "in_progress"
                                ? "Mark done"
                                : "Start"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(editing === milestone.id ? null : milestone.id);
                              setEvidenceDraft(milestone.evidence ?? "");
                            }}
                            className="focus-ring inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.68rem] font-medium text-muted hover:bg-panel2 hover:text-content"
                          >
                            <MessageSquareText className="h-3 w-3" />
                            Evidence
                          </button>
                        </div>
                      </div>

                      {editing === milestone.id && (
                        <div className="mt-3 rounded-xl border border-line bg-panel2/40 p-3">
                          <label
                            htmlFor={`evidence-${milestone.id}`}
                            className="text-[0.65rem] font-medium text-content"
                          >
                            What evidence shows this is done?
                          </label>
                          <textarea
                            id={`evidence-${milestone.id}`}
                            value={evidenceDraft}
                            onChange={(e) => setEvidenceDraft(e.target.value)}
                            rows={2}
                            placeholder="A link, a grade, an application reference, a completed project…"
                            className="mt-1.5 w-full rounded-lg border border-lineStrong bg-panel px-3 py-2 text-xs text-content placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          />
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                update(milestone, { evidence: evidenceDraft.trim() })
                              }
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-3 text-[0.68rem] font-medium text-brandContrast disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              Save evidence
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
