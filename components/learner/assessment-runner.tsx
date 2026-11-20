"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { Assessment } from "@/lib/types";
import {
  APTITUDE_ITEMS,
  APTITUDE_LABELS,
  INTEREST_ITEMS,
  LIKERT_LABELS,
  PERSONALITY_ITEMS,
  SECTIONS,
  TOTAL_ITEMS,
} from "@/lib/assessment/instruments";
import { cn } from "@/lib/utils/cn";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

type View = "intro" | "section-intro" | "question" | "review";
type SaveState = "idle" | "saving" | "saved" | "error";

const LIKERT_KEYS = ["1", "2", "3", "4", "5"];

export function AssessmentRunner({
  assessment,
  firstName,
}: {
  assessment: Assessment | null;
  firstName: string;
}) {
  const router = useRouter();
  const [assessmentId, setAssessmentId] = useState(assessment?.id ?? null);
  const [startedAt, setStartedAt] = useState<string | null>(
    assessment?.startedAt ?? null
  );
  const [responses, setResponses] = useState<Record<string, number>>(
    assessment?.responses ?? {}
  );
  const [sectionIndex, setSectionIndex] = useState(assessment ? 0 : 0);
  const [itemIndex, setItemIndex] = useState(0);
  const [view, setView] = useState<View>(assessment ? "question" : "intro");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitAnyway, setShowSubmitAnyway] = useState(false);
  const sectionStartRef = useRef<number>(Date.now());
  const timingsRef = useRef<Record<string, number>>({});

  const section = SECTIONS[sectionIndex];
  const items = useMemo(() => {
    if (section.key === "interest") return INTEREST_ITEMS;
    if (section.key === "personality") return PERSONALITY_ITEMS;
    return APTITUDE_ITEMS;
  }, [section.key]);

  const answeredCount = useMemo(() => {
    const all = [...INTEREST_ITEMS, ...APTITUDE_ITEMS, ...PERSONALITY_ITEMS];
    return all.filter((item) => responses[item.id] !== undefined).length;
  }, [responses]);

  const unanswered = useMemo(() => {
    const all = [...INTEREST_ITEMS, ...APTITUDE_ITEMS, ...PERSONALITY_ITEMS];
    return all.filter((item) => responses[item.id] === undefined);
  }, [responses]);

  // Resume at the first unanswered question.
  useEffect(() => {
    if (!assessment) return;
    const answered = assessment.responses ?? {};
    for (let s = 0; s < SECTIONS.length; s += 1) {
      const list =
        SECTIONS[s].key === "interest"
          ? INTEREST_ITEMS
          : SECTIONS[s].key === "personality"
            ? PERSONALITY_ITEMS
            : APTITUDE_ITEMS;
      const missing = list.findIndex((item) => answered[item.id] === undefined);
      if (missing !== -1) {
        setSectionIndex(s);
        setItemIndex(missing);
        return;
      }
    }
    setView("review");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave
  useEffect(() => {
    if (!assessmentId || view === "review" || Object.keys(responses).length === 0) return;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/assessments/${assessmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responses,
            sectionTimings: timingsRef.current,
          }),
        });
        setSaveState(response.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [responses, assessmentId, view]);

  const currentItem = items[itemIndex];
  const answeredInSection = items.filter((i) => responses[i.id] !== undefined).length;
  const questionNumber = itemIndex + 1;

  async function startAssessment() {
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/assessments", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not start the assessment.");
        return;
      }
      setAssessmentId(data.assessmentId);
      setStartedAt(new Date().toISOString());
      setView("section-intro");
      setSectionIndex(0);
      setItemIndex(0);
    } catch {
      setError("The server could not be reached. Try again.");
    } finally {
      setStarting(false);
    }
  }

  function recordTiming() {
    const elapsed = Math.round((Date.now() - sectionStartRef.current) / 1000);
    const key = SECTIONS[sectionIndex].key;
    timingsRef.current[key] = (timingsRef.current[key] ?? 0) + elapsed;
    sectionStartRef.current = Date.now();
  }

  function answer(value: number, autoAdvance: boolean) {
    if (!currentItem) return;
    setResponses((prev) => ({ ...prev, [currentItem.id]: value }));
    if (autoAdvance) {
      window.setTimeout(() => advance(), 220);
    }
  }

  function advance() {
    if (itemIndex < items.length - 1) {
      setItemIndex((i) => i + 1);
      return;
    }
    if (sectionIndex < SECTIONS.length - 1) {
      recordTiming();
      setSectionIndex((s) => s + 1);
      setItemIndex(0);
      setView("section-intro");
      return;
    }
    recordTiming();
    setView("review");
  }

  function goBack() {
    setError(null);
    if (view === "review") {
      setView("question");
      setSectionIndex(SECTIONS.length - 1);
      setItemIndex(items.length - 1);
      return;
    }
    if (itemIndex > 0) {
      setItemIndex((i) => i - 1);
      return;
    }
    if (sectionIndex > 0) {
      const previous = SECTIONS[sectionIndex - 1].key;
      const list =
        previous === "interest"
          ? INTEREST_ITEMS
          : previous === "personality"
            ? PERSONALITY_ITEMS
            : APTITUDE_ITEMS;
      setSectionIndex((s) => s - 1);
      setItemIndex(list.length - 1);
      setView("question");
    }
  }

  function skip() {
    advance();
  }

  function jumpTo(target: { sectionKey: string; index: number }) {
    const s = SECTIONS.findIndex((item) => item.key === target.sectionKey);
    if (s === -1) return;
    setSectionIndex(s);
    setItemIndex(target.index);
    setView("question");
  }

  async function submit(force = false) {
    if (!assessmentId) return;
    if (!force && unanswered.length > 0) {
      setShowSubmitAnyway(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    const durationSeconds = startedAt
      ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
      : 0;
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, durationSeconds }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not submit the assessment.");
        return;
      }
      router.push(data.redirect ?? "/learner/results");
      router.refresh();
    } catch {
      setError("The server could not be reached. Your answers are saved locally in this tab.");
    } finally {
      setSubmitting(false);
    }
  }

  // Keyboard shortcuts on Likert questions.
  useEffect(() => {
    if (view !== "question" || section.key === "aptitude") return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const index = LIKERT_KEYS.indexOf(event.key);
      if (index === -1) return;
      event.preventDefault();
      answer(index + 1, true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, section.key, currentItem?.id]);

  if (view === "intro") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-panel2/40 px-6 py-7 sm:px-8">
            <p className="eyebrow">Career Compass battery · v1.2</p>
            <h1 className="display mt-2 text-[1.9rem] font-semibold leading-tight tracking-tight text-content sm:text-[2.3rem]">
              Hello {firstName}. Let&apos;s find the shape of your work.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              {TOTAL_ITEMS} questions across three sections, about 28 minutes in
              total. Your answers save as you go, so you can stop and return on any
              device.
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <ol className="space-y-3">
              {SECTIONS.map((item) => (
                <li
                  key={item.key}
                  className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandSoft text-[0.65rem] font-semibold text-brand">
                    {item.eyebrow.split(" ")[1]}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-content">{item.title}</p>
                      <span className="text-[0.65rem] text-faint">
                        {item.itemCount} questions · ~{item.minutes} min
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-5 text-muted">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-2 rounded-xl bg-panel2/60 px-4 py-3 text-xs leading-5 text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <p>
                  This is a guidance instrument, not a clinical or selection test.
                  Results are interpreted against a career map and reviewed by a
                  counsellor before release.
                </p>
              </div>
              {error && <Alert tone="warning">{error}</Alert>}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.7rem] leading-5 text-faint">
                By continuing you confirm the consent recorded in your profile.
              </p>
              <button
                type="button"
                onClick={startAssessment}
                disabled={starting}
                className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-medium text-brandContrast transition-colors hover:bg-brand/90 disabled:opacity-50"
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Begin section 1
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "section-intro") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card p-6 sm:p-8">
          <p className="eyebrow">{section.eyebrow}</p>
          <h1 className="display mt-2 text-[1.8rem] font-semibold tracking-tight text-content sm:text-[2.1rem]">
            {section.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">{section.description}</p>
          <div className="mt-5 rounded-xl border border-line bg-panel2/40 p-4">
            <p className="text-xs font-semibold text-content">Before you begin</p>
            <p className="mt-1 text-xs leading-5 text-muted">{section.instruction}</p>
            <p className="mt-2 text-[0.68rem] leading-5 text-faint">{section.scoredNote}</p>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-[0.7rem] text-faint">
              {section.itemCount} questions · about {section.minutes} minutes
            </span>
            <button
              type="button"
              onClick={() => {
                sectionStartRef.current = Date.now();
                setView("question");
              }}
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-medium text-brandContrast hover:bg-brand/90"
            >
              Start {section.title.toLowerCase()}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "review") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-panel2/40 px-6 py-6 sm:px-8">
            <p className="eyebrow">Review & submit</p>
            <h1 className="display mt-2 text-2xl font-semibold tracking-tight text-content">
              Almost there, {firstName}.
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              You answered {TOTAL_ITEMS - unanswered.length} of {TOTAL_ITEMS}{" "}
              questions. Submitting sends the results to a counsellor for review —
              they are not shown to you until the report is released.
            </p>
          </div>
          <div className="px-6 py-6 sm:px-8">
            <div className="grid gap-3 sm:grid-cols-3">
              {SECTIONS.map((item) => {
                const list =
                  item.key === "interest"
                    ? INTEREST_ITEMS
                    : item.key === "personality"
                      ? PERSONALITY_ITEMS
                      : APTITUDE_ITEMS;
                const done = list.filter((i) => responses[i.id] !== undefined).length;
                return (
                  <div key={item.key} className="rounded-xl border border-line bg-panel p-4">
                    <p className="text-xs font-semibold text-content">{item.title}</p>
                    <p className="mt-1 text-[0.7rem] text-muted">
                      {done}/{list.length} answered
                    </p>
                    <Progress
                      value={done}
                      max={list.length}
                      tone={done === list.length ? "brand" : "brass"}
                      className="mt-2"
                    />
                  </div>
                );
              })}
            </div>

            {unanswered.length > 0 && (
              <div className="mt-5 rounded-xl border border-brass-500/30 bg-brass-500/[0.07] p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-content">
                  <CircleAlert className="h-3.5 w-3.5 text-brass-600 dark:text-brass-300" />
                  {unanswered.length} unanswered question
                  {unanswered.length > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Unanswered questions score zero, which can distort the profile. You
                  can submit anyway, but the counsellor will see this.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unanswered.slice(0, 8).map((item) => {
                    const targetSection =
                      INTEREST_ITEMS.includes(item as never)
                        ? "interest"
                        : PERSONALITY_ITEMS.includes(item as never)
                          ? "personality"
                          : "aptitude";
                    const list =
                      targetSection === "interest"
                        ? INTEREST_ITEMS
                        : targetSection === "personality"
                          ? PERSONALITY_ITEMS
                          : APTITUDE_ITEMS;
                    const index = list.findIndex((i) => i.id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => jumpTo({ sectionKey: targetSection, index })}
                        className="rounded-md border border-line bg-panel px-2 py-1 text-[0.65rem] font-medium text-muted hover:text-content"
                      >
                        Q{index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4">
                <Alert tone="warning">{error}</Alert>
              </div>
            )}

            {showSubmitAnyway && unanswered.length > 0 && (
              <div className="mt-4">
                <Alert tone="warning" title="Submit with unanswered questions?">
                  Unanswered items are scored as zero and flagged in the response
                  quality signal. You can go back and answer them instead.
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const first = unanswered[0];
                        const targetSection = INTEREST_ITEMS.includes(first as never)
                          ? "interest"
                          : PERSONALITY_ITEMS.includes(first as never)
                            ? "personality"
                            : "aptitude";
                        const list =
                          targetSection === "interest"
                            ? INTEREST_ITEMS
                            : targetSection === "personality"
                              ? PERSONALITY_ITEMS
                              : APTITUDE_ITEMS;
                        jumpTo({
                          sectionKey: targetSection,
                          index: list.findIndex((i) => i.id === first.id),
                        });
                      }}
                      className="rounded-lg border border-lineStrong bg-panel px-3 py-1.5 text-xs font-medium text-content"
                    >
                      Answer remaining
                    </button>
                    <button
                      type="button"
                      onClick={() => submit(true)}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brandContrast"
                    >
                      Submit anyway
                    </button>
                  </div>
                </Alert>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setView("question")}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted hover:bg-panel2 hover:text-content"
              >
                <ArrowLeft className="h-4 w-4" /> Back to questions
              </button>
              <button
                type="button"
                onClick={() => submit(false)}
                disabled={submitting}
                className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-medium text-brandContrast hover:bg-brand/90 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Submit for counsellor review
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLikert = section.key !== "aptitude";
  const selected = currentItem ? responses[currentItem.id] : undefined;
  const questionText =
    currentItem && "prompt" in currentItem ? currentItem.prompt : currentItem?.text;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-medium text-content">{section.title}</span>
            <span className="text-faint">·</span>
            <span>
              Question {questionNumber} of {items.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[0.68rem]">
            <Clock className="h-3.5 w-3.5 text-faint" />
            {saveState === "saving" ? (
              <span className="text-muted">Saving…</span>
            ) : saveState === "saved" ? (
              <span className="inline-flex items-center gap-1 text-brand">
                <Save className="h-3 w-3" /> Saved
              </span>
            ) : saveState === "error" ? (
              <span className="text-clay-600 dark:text-clay-300">Not saved</span>
            ) : (
              <span className="text-faint">Autosave on</span>
            )}
          </div>
        </div>
        <Progress
          value={sectionIndex * 100 + (answeredInSection / items.length) * 100}
          max={SECTIONS.length * 100}
          label="Assessment progress"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-line bg-panel2/30 px-5 py-4 sm:px-8">
          <p className="eyebrow">
            {section.eyebrow} · {APTITUDE_LABELS[currentItem?.dimension as keyof typeof APTITUDE_LABELS] ?? section.title}
          </p>
        </div>
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {currentItem && "context" in currentItem && currentItem.context && (
            <p className="mb-3 rounded-lg bg-panel2/60 p-3 text-xs leading-5 text-muted">
              {currentItem.context}
            </p>
          )}
          <h2 className="display text-[1.3rem] font-medium leading-snug text-content sm:text-[1.55rem]">
            {questionText}
          </h2>

          {isLikert ? (
            <div
              role="group"
              aria-label="Choose the response that fits best"
              className="mt-6 space-y-2"
            >
              {LIKERT_LABELS.map((label, index) => {
                const value = index + 1;
                const active = selected === value;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => answer(value, true)}
                    className={cn(
                      "focus-ring flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all",
                      active
                        ? "border-brand bg-brandSoft"
                        : "border-line bg-panel hover:border-lineStrong hover:bg-panel2/60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        active ? "border-brand bg-brand" : "border-lineStrong"
                      )}
                    >
                      {active && <Check className="h-3 w-3 text-brandContrast" />}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        active ? "font-medium text-content" : "text-muted"
                      )}
                    >
                      {label}
                    </span>
                    <span className="hidden text-[0.65rem] tabular-nums text-faint sm:block">
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div role="group" aria-label="Choose the best answer" className="mt-6 space-y-2">
              {currentItem && "options" in currentItem &&
                currentItem.options.map((option, index) => {
                  const active = selected === index;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => answer(index, false)}
                      className={cn(
                        "focus-ring flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all",
                        active
                          ? "border-brand bg-brandSoft"
                          : "border-line bg-panel hover:border-lineStrong hover:bg-panel2/60"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.68rem] font-semibold",
                          active
                            ? "border-brand bg-brand text-brandContrast"
                            : "border-lineStrong text-muted"
                        )}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-sm leading-6",
                          active ? "font-medium text-content" : "text-muted"
                        )}
                      >
                        {option}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-panel2 hover:text-content"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-3">
              {!isLikert && (
                <button
                  type="button"
                  onClick={skip}
                  className="text-xs font-medium text-muted underline underline-offset-4 hover:text-content"
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                onClick={advance}
                disabled={!isLikert && selected === undefined}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-medium text-brandContrast transition-colors hover:bg-brand/90 disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[0.68rem] text-faint">
        {isLikert
          ? "Tip: press 1–5 on your keyboard to answer and move on."
          : "You can skip, but an unanswered question scores zero."}
      </p>
    </div>
  );
}
