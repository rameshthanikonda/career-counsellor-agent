"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { QuarterlyReview } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ReflectionForm({ review }: { review: QuarterlyReview }) {
  const [value, setValue] = useState(review.learnerReflection ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(Boolean(review.learnerReflection));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerReflection: value }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not save your reflection.");
        return;
      }
      setSaved(true);
    } catch {
      setError("The server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label htmlFor={`reflection-${review.id}`} className="text-sm font-medium text-content">
        Your reflection for this review
      </label>
      <p className="mt-0.5 text-xs leading-5 text-muted">
        What has changed, what is blocking you, and what do you want to decide in
        the session? Your counsellor reads this before the meeting.
      </p>
      <textarea
        id={`reflection-${review.id}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Two or three honest sentences are more useful than a polished paragraph."
        className="mt-2 w-full rounded-xl border border-lineStrong bg-panel px-3.5 py-2.5 text-sm leading-6 text-content placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      {error && <p className="mt-1.5 text-xs font-medium text-clay-600 dark:text-clay-300">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={save} disabled={busy} size="sm">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
          {saved ? "Update reflection" : "Save reflection"}
        </Button>
        {saved && !busy && (
          <span className="text-[0.68rem] text-brand">Saved for your counsellor</span>
        )}
      </div>
    </div>
  );
}
