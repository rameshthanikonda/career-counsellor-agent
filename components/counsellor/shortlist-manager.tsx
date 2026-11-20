"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import type { ShortlistItemView } from "@/lib/types";
import { Badge, humanStatus, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { formatFeeRange } from "@/lib/utils/format";

interface CourseOption {
  id: string;
  title: string;
  provider: string;
  level: string;
}

export function ShortlistManager({
  learnerId,
  items,
  courses,
}: {
  learnerId: string;
  items: ShortlistItemView[];
  courses: CourseOption[];
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const options = useMemo(() => {
    const active = new Set(items.filter((item) => item.status !== "removed").map((item) => item.courseId));
    return courses
      .filter((course) => !active.has(course.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [courses, items]);

  async function add() {
    if (!courseId) {
      setError("Choose a programme first.");
      return;
    }
    setBusy("add");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/counsellor/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId, courseId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not add the programme.");
        return;
      }
      setCourseId("");
      setMessage("Programme added to the shortlist.");
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(itemId: string, status: "approved" | "removed" | "proposed") {
    setBusy(itemId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/counsellor/shortlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId, itemId, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update the shortlist.");
        return;
      }
      setMessage(
        status === "approved"
          ? "Programme approved on the shortlist."
          : status === "removed"
            ? "Programme removed from the shortlist."
            : "Programme returned to proposed."
      );
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="warning">{error}</Alert>}

      <div className="rounded-xl border border-line bg-panel2/30 p-4">
        <Field
          label="Add a programme"
          hint="Counsellor-added programmes are marked as approved. Only programmes whose assessment is complete can be added."
        >
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              aria-label="Programme"
              className="sm:flex-1"
            >
              <option value="">Choose a programme…</option>
              {options.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} · {course.provider} · {course.level}
                </option>
              ))}
            </Select>
            <Button type="button" onClick={add} disabled={busy === "add" || !courseId}>
              {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </Field>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-line px-4 py-8 text-center text-sm text-muted">
          No programmes on the shortlist yet.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {items.map((item) => (
            <li key={item.id} className="bg-panel px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-faint">#{item.rank}</span>
                    <p className="text-sm font-semibold text-content">{item.course.title}</p>
                    <Badge tone={statusTone(item.status)}>{humanStatus(item.status)}</Badge>
                    <Badge tone="outline">{item.fitScore} fit</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.course.provider} · {item.course.level} ·{" "}
                    {formatFeeRange(item.course.feeMinINR, item.course.feeMaxINR)} ·{" "}
                    {item.course.modes.map((mode) => humanStatus(mode)).join(", ")}
                  </p>
                  <p className="mt-2 text-[0.7rem] leading-5 text-muted">
                    {item.rationale}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        item.eligibility.status === "eligible"
                          ? "success"
                          : item.eligibility.status === "conditional"
                            ? "brass"
                            : "clay"
                      }
                    >
                      {humanStatus(item.eligibility.status)}
                    </Badge>
                    <span className="text-[0.68rem] leading-4 text-muted">
                      {item.eligibility.messages[0]}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {item.status !== "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setStatus(item.id, "approved")}
                      disabled={busy === item.id}
                    >
                      {busy === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus(item.id, "removed")}
                    disabled={busy === item.id}
                    aria-label={`Remove ${item.course.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[0.68rem] leading-5 text-muted">
        Fees, eligibility and outcome bands are indicative catalogue data and must
        be verified with the institution. Removing a programme keeps an audit
        record; it is not a hard delete.
      </p>
    </div>
  );
}
