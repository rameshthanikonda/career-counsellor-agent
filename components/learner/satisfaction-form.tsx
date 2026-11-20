"use client";

import { useState } from "react";
import { Check, Loader2, Star } from "lucide-react";
import type { Satisfaction } from "@/lib/types";
import { Button } from "@/components/ui/button";

const LABELS = [
  "Not useful",
  "Slightly useful",
  "Moderately useful",
  "Very useful",
  "Exceptionally useful",
];

export function SatisfactionForm({ initial }: { initial?: Satisfaction | null }) {
  const [score, setScore] = useState(initial?.score ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(Boolean(initial));
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (score < 1) {
      setError("Choose a rating from 1 to 5 first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/satisfaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not save your feedback.");
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
    <div id="satisfaction" className="scroll-mt-24">
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand/20 bg-brandSoft px-3 py-2 text-xs font-medium text-brand">
          <Check className="h-3.5 w-3.5" />
          Thank you — your rating is recorded. You can update it below.
        </div>
      )}
      <fieldset>
        <legend className="text-sm font-medium text-content">
          How useful was your counselling report?
        </legend>
        <div className="mt-2 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = (hover || score) >= value;
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} out of 5 — ${LABELS[value - 1]}`}
                aria-pressed={score === value}
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(0)}
                onFocus={() => setHover(value)}
                onClick={() => setScore(value)}
                className="focus-ring rounded-md p-1"
              >
                <Star
                  className={
                    active
                      ? "h-7 w-7 fill-brass-500 text-brass-500"
                      : "h-7 w-7 text-lineStrong"
                  }
                />
              </button>
            );
          })}
          <span className="ml-2 text-xs font-medium text-muted">
            {score ? LABELS[score - 1] : "Select a rating"}
          </span>
        </div>
      </fieldset>

      <label htmlFor="satisfaction-comment" className="mt-4 block text-xs font-medium text-content">
        Anything the counselling team should know? <span className="font-normal text-faint">(optional)</span>
      </label>
      <textarea
        id="satisfaction-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="What was useful, and what was missing?"
        className="mt-1.5 w-full rounded-xl border border-lineStrong bg-panel px-3.5 py-2.5 text-sm text-content placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />

      {error && <p className="mt-2 text-xs font-medium text-clay-600 dark:text-clay-300">{error}</p>}

      <Button onClick={submit} disabled={busy} size="md" className="mt-3">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saved ? "Update feedback" : "Submit feedback"}
      </Button>
      <p className="mt-2 text-[0.65rem] leading-5 text-faint">
        Feedback is visible to the counselling team. It is not shared with
        institutions or used for advertising.
      </p>
    </div>
  );
}
