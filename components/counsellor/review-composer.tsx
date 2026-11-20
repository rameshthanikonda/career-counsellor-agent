"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Loader2, Star } from "lucide-react";
import type { QuarterlyReview } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const RATING_LABELS = [
  "Off track",
  "Behind",
  "On track",
  "Ahead",
  "Exceeding",
];

export function ReviewComposer({
  review,
  learnerName,
}: {
  review: QuarterlyReview;
  learnerName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(review.progressRating ?? 0);
  const [notes, setNotes] = useState(review.notes ?? "");
  const [nextSteps, setNextSteps] = useState(review.nextSteps ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (review.completedAt) {
    return (
      <div className="rounded-xl border border-line bg-panel px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-content">
            Q{review.quarter} · {review.year}
          </p>
          <div className="flex items-center gap-0.5" aria-label={`${review.progressRating ?? 0} out of 5`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={cn(
                  "h-3.5 w-3.5",
                  value <= (review.progressRating ?? 0)
                    ? "fill-brass-500 text-brass-500"
                    : "text-lineStrong"
                )}
              />
            ))}
          </div>
        </div>
        <p className="mt-1 text-[0.65rem] text-faint">
          Completed {formatDate(review.completedAt)}
        </p>
        {review.notes && (
          <p className="mt-2 text-xs leading-5 text-muted">{review.notes}</p>
        )}
        {review.nextSteps && (
          <div className="mt-2 rounded-lg bg-panel2/60 px-3 py-2">
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
              Learner reflection
            </p>
            <p className="mt-0.5 text-[0.7rem] leading-5 text-muted">
              {review.learnerReflection}
            </p>
          </div>
        )}
      </div>
    );
  }

  async function complete() {
    if (rating < 1) {
      setError("Choose a progress rating from 1 to 5.");
      return;
    }
    if (notes.trim().length < 10) {
      setError("Add review notes of at least 10 characters so the record is useful.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/counsellor/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complete: true,
          progressRating: rating,
          notes,
          nextSteps,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not complete the review.");
        return;
      }
      setMessage("Review completed. The learner has been notified and the next quarter is scheduled.");
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand/20 bg-brandSoft/40 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-content">
            Q{review.quarter} · {review.year} · due {formatDate(review.scheduledFor)}
          </p>
          <p className="text-[0.68rem] text-muted">
            Review {learnerName}&apos;s progress against evidence.
          </p>
        </div>
        <CalendarCheck className="h-4 w-4 text-brand" />
      </div>

      {review.learnerReflection && (
        <div className="mt-3 rounded-lg border border-line bg-panel px-3 py-2">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-faint">
            Learner reflection
          </p>
          <p className="mt-0.5 text-[0.72rem] leading-5 text-muted">
            {review.learnerReflection}
          </p>
        </div>
      )}

      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-content">Progress rating</legend>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-pressed={rating === value}
              className={cn(
                "focus-ring rounded-lg border px-2.5 py-1.5 text-[0.7rem] font-medium transition-colors",
                rating === value
                  ? "border-brand bg-brand text-brandContrast"
                  : "border-lineStrong bg-panel text-muted hover:text-content"
              )}
            >
              {value} · {RATING_LABELS[value - 1]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 grid gap-3">
        <Field label="Review notes" hint="What changed, and what the evidence shows.">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={2000}
          />
        </Field>
        <Field label="Agreed next steps" hint="Shared with the learner after completion.">
          <Textarea
            value={nextSteps}
            onChange={(event) => setNextSteps(event.target.value)}
            rows={2}
            maxLength={2000}
          />
        </Field>
      </div>

      {message && <Alert tone="success" className="mt-3">{message}</Alert>}
      {error && <Alert tone="warning" className="mt-3">{error}</Alert>}

      <Button type="button" className="mt-3" onClick={complete} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
        Complete review &amp; schedule next
      </Button>
    </div>
  );
}
