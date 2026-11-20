"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils/cn";

const CATEGORIES = [
  { value: "bug", label: "Something is broken" },
  { value: "idea", label: "Feature idea" },
  { value: "content", label: "Course or content data" },
  { value: "counselling", label: "Counselling experience" },
  { value: "other", label: "Other" },
] as const;

export function FeedbackForm() {
  const [category, setCategory] = useState<string>("idea");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (message.trim().length < 10) {
      setError("Please give us at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          page: page || undefined,
          rating: rating || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not send feedback.");
        return;
      }
      setSent(true);
      setMessage("");
      setPage("");
      setRating(0);
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-8 text-center sm:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brandSoft text-brand">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <h2 className="display mt-4 text-xl font-semibold text-content">
          Thank you — this reaches the team.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Product feedback is triaged by an administrator. For a counselling
          concern, message your counsellor or use the quarterly review — do not
          put anything urgent here.
        </p>
        <Button type="button" variant="secondary" className="mt-5" onClick={() => setSent(false)}>
          Send more feedback
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert tone="warning">{error}</Alert>}

      <Field label="What is this about?">
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Your feedback"
        hint="Be specific: what you expected, what happened, and where."
      >
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Example: On the shortlist page, the fee range is hard to compare across three programmes…"
          required
          minLength={10}
        />
      </Field>

      <Field label="Page or feature" hint="Optional, e.g. /learner/applications">
        <Input
          value={page}
          onChange={(event) => setPage(event.target.value)}
          maxLength={200}
          placeholder="/learner/results"
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-content">
          How would you rate this experience? <span className="font-normal text-faint">(optional)</span>
        </legend>
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} out of 5`}
              aria-pressed={rating === value}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(value === rating ? 0 : value)}
              className="focus-ring rounded p-1"
            >
              <Star
                className={cn(
                  "h-5 w-5",
                  (hover || rating) >= value
                    ? "fill-brass-500 text-brass-500"
                    : "text-lineStrong"
                )}
              />
            </button>
          ))}
          <span className="ml-2 text-xs text-muted">
            {rating ? `${rating}/5` : "No rating"}
          </span>
        </div>
      </fieldset>

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        Send feedback
      </Button>
      <p className="text-[0.66rem] leading-5 text-faint">
        Feedback is stored with your name, role and page so the team can
        reproduce issues. Do not include passwords or assessment answers.
      </p>
    </form>
  );
}
