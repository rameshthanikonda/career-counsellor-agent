"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ClipboardList,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type { ApplicationChecklistItem, ApplicationStatus, ApplicationView } from "@/lib/types";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  checklistProgress,
  daysUntil,
  isOpenApplication,
} from "@/lib/applications/checklist";
import { Badge, humanStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const STATUS_TONE: Record<ApplicationStatus, "neutral" | "brass" | "brand" | "success" | "clay"> = {
  planned: "neutral",
  preparing: "brass",
  submitted: "brand",
  interview: "brand",
  offer: "success",
  rejected: "clay",
  withdrawn: "neutral",
};

interface ShortlistOption {
  courseId: string;
  title: string;
  provider: string;
  level: string;
}

export function ApplicationsBoard({
  applications,
  shortlist,
  counsellorMode = false,
}: {
  applications: ApplicationView[];
  shortlist: ShortlistOption[];
  counsellorMode?: boolean;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tracked = new Set(
    applications
      .filter((application) => application.status !== "withdrawn" && application.status !== "rejected")
      .map((application) => application.courseId)
  );
  const options = shortlist.filter((course) => !tracked.has(course.courseId));

  async function add() {
    if (!courseId) {
      setError("Choose a shortlisted programme first.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, deadline: deadline || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not start tracking this application.");
        return;
      }
      setCourseId("");
      setDeadline("");
      setMessage("Application added with a document checklist.");
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="warning">{error}</Alert>}

      {!counsellorMode && (
        <div className="rounded-xl border border-line bg-panel2/30 p-4">
          <Field
            label="Track a new application"
            hint="Choose a programme from your shortlist. A document checklist is generated from its requirements."
          >
            <div className="mt-2 flex flex-col gap-2 lg:flex-row">
              <Select
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                aria-label="Shortlisted programme"
                className="lg:flex-1"
              >
                <option value="">Choose a shortlisted programme…</option>
                {options.map((course) => (
                  <option key={course.courseId} value={course.courseId}>
                    {course.title} · {course.provider} · {course.level}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                aria-label="Application deadline"
                className="lg:w-44"
              />
              <Button type="button" onClick={add} disabled={busy || !courseId}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Track
              </Button>
            </div>
          </Field>
          {options.length === 0 && (
            <p className="mt-2 text-[0.68rem] text-muted">
              Every shortlisted programme is already tracked. Approve or add a new
              programme in your shortlist first.
            </p>
          )}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="rounded-xl border border-line px-5 py-12 text-center">
          <ClipboardList className="mx-auto h-5 w-5 text-faint" />
          <p className="mt-2 text-sm font-semibold text-content">No applications tracked yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted">
            Shortlisting is not applying. Track each application here so deadlines,
            documents and outcomes stay in one place — and your counsellor can help.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              counsellorMode={counsellorMode}
            />
          ))}
        </div>
      )}

      <p className="text-[0.68rem] leading-5 text-faint">
        Deadlines are reminders, not institutional confirmations. Always check the
        programme portal. No application outcome is guaranteed.
      </p>
    </div>
  );
}

function ApplicationCard({
  application,
  counsellorMode,
}: {
  application: ApplicationView;
  counsellorMode: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [deadline, setDeadline] = useState(application.deadline?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(application.notes ?? "");
  const [checklist, setChecklist] = useState<ApplicationChecklistItem[]>(application.checklist);
  const [newItem, setNewItem] = useState("");
  const [newRequired, setNewRequired] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setChecklist(application.checklist);
    setStatus(application.status);
    setNotes(application.notes ?? "");
    setDeadline(application.deadline?.slice(0, 10) ?? "");
  }, [application]);

  const progress = checklistProgress(checklist);
  const days = daysUntil(deadline);
  const open = isOpenApplication({ ...application, status });

  async function patch(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update the application.");
        return false;
      }
      setMessage(success);
      router.refresh();
      return true;
    } catch {
      setError("The server could not be reached.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Remove the ${application.course.title} application from your tracker?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not remove the application.");
        return;
      }
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(itemId: string) {
    const next = checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setChecklist(next);
    void patch(
      { checklist: next },
      next.every((item) => item.done) ? "Checklist complete." : "Checklist updated."
    );
  }

  function addItem() {
    const label = newItem.trim();
    if (label.length < 2) return;
    const next = [
      ...checklist,
      {
        id: crypto.randomUUID(),
        label,
        required: newRequired,
        done: false,
      },
    ];
    setChecklist(next);
    setNewItem("");
    void patch({ checklist: next }, "Checklist item added.");
  }

  function removeItem(itemId: string) {
    const next = checklist.filter((item) => item.id !== itemId);
    setChecklist(next);
    void patch({ checklist: next }, "Checklist item removed.");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-content">{application.course.title}</p>
            <Badge tone={STATUS_TONE[status]} dot>
              {APPLICATION_STATUS_LABELS[status]}
            </Badge>
            {open && days !== null && days < 0 && (
              <Badge tone="clay">Overdue by {Math.abs(days)}d</Badge>
            )}
            {open && days !== null && days >= 0 && days <= 7 && (
              <Badge tone="brass">Due in {days}d</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {application.course.provider} · {application.course.level} ·{" "}
            {application.course.durationMonths} months
          </p>
        </div>
        {!counsellorMode && status === "planned" && (
          <Button type="button" size="sm" variant="ghost" onClick={remove} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        )}
        {!counsellorMode && status !== "planned" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setStatus("withdrawn");
              void patch({ status: "withdrawn" }, "Application withdrawn.");
            }}
            disabled={busy || status === "withdrawn"}
          >
            Withdraw
          </Button>
        )}
      </div>

      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-content">
                Documents & tasks
              </p>
              <span className="text-[0.65rem] text-muted">
                {progress.done}/{progress.total} · {progress.percent}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel2">
              <div
                className={cn(
                  "h-full rounded-full",
                  progress.percent === 100 ? "bg-brand" : "bg-brass-500"
                )}
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <ul className="mt-3 space-y-1.5">
              {checklist.map((item) => (
                <li key={item.id} className="group flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-pressed={item.done}
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      item.done
                        ? "border-brand bg-brand text-brandContrast"
                        : "border-lineStrong bg-canvas text-transparent hover:border-brand"
                    )}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-[0.72rem] leading-5",
                      item.done ? "text-faint line-through" : "text-muted"
                    )}
                  >
                    {item.label}
                    {item.required && (
                      <span className="ml-1 text-[0.6rem] uppercase tracking-[0.06em] text-clay-600 dark:text-clay-300">
                        required
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.label}`}
                    className="mt-0.5 text-faint opacity-0 transition-opacity hover:text-clay-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                placeholder="Add a document or task"
                aria-label="New checklist item"
                className="sm:flex-1"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addItem();
                  }
                }}
              />
              <label className="inline-flex items-center gap-1.5 text-[0.68rem] text-muted">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(event) => setNewRequired(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[rgb(var(--brand))]"
                />
                Required
              </label>
              <Button type="button" size="sm" variant="secondary" onClick={addItem} disabled={busy}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {progress.missingRequired.length > 0 && (
              <p className="mt-2 text-[0.65rem] leading-4 text-brass-600 dark:text-brass-300">
                {progress.missingRequired.length} required item
                {progress.missingRequired.length === 1 ? "" : "s"} still open.
              </p>
            )}
          </div>

          <Field label="Notes" hint="What did the institution ask for? What is blocking you?">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              maxLength={2000}
            />
          </Field>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void patch({ notes }, "Notes saved.")}
            disabled={busy}
          >
            <Save className="h-3.5 w-3.5" /> Save notes
          </Button>
        </div>

        <div className="space-y-3">
          <Field label="Status">
            <Select
              value={status}
              onChange={(event) => {
                const next = event.target.value as ApplicationStatus;
                setStatus(next);
                void patch({ status: next }, `Status set to ${APPLICATION_STATUS_LABELS[next]}.`);
              }}
            >
              {APPLICATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {APPLICATION_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Deadline">
            <div className="flex gap-2">
              <Input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void patch({ deadline: deadline || null }, "Deadline saved.")}
                disabled={busy}
                aria-label="Save deadline"
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Field>

          <div className="rounded-xl border border-line bg-panel2/40 p-3">
            <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-faint">
              <CalendarClock className="h-3 w-3" /> Timeline
            </p>
            <ul className="mt-2 space-y-1 text-[0.68rem] text-muted">
              <li>Tracked {formatDate(application.createdAt)}</li>
              {application.submittedAt && <li>Submitted {formatDate(application.submittedAt)}</li>}
              {application.decisionAt && <li>Decision {formatDate(application.decisionAt)}</li>}
              {application.deadline && <li>Deadline {formatDate(application.deadline)}</li>}
            </ul>
          </div>
        </div>
      </div>

      {message && (
        <div className="border-t border-line px-4 py-2 text-[0.68rem] text-brand sm:px-5">
          {message}
        </div>
      )}
      {error && (
        <div className="border-t border-line px-4 py-2 text-[0.68rem] text-clay-600 sm:px-5 dark:text-clay-300">
          {error}
        </div>
      )}
    </div>
  );
}
