"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import type { Learner } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, CheckboxRow } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils/cn";

const STAGE_OPTIONS = [
  { value: "school", label: "At school (Class XI–XII)" },
  { value: "undergraduate", label: "Undergraduate (in progress or completed)" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "professional", label: "Working professional" },
] as const;

const COUNTRIES = [
  "India",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Germany",
  "Singapore",
  "United Arab Emirates",
  "Switzerland",
  "Ireland",
];

const INTEREST_AREAS = [
  "Engineering",
  "Data & AI",
  "Health",
  "Business",
  "Finance",
  "Law & policy",
  "Design",
  "Media",
  "Education",
  "Sustainability",
  "Hospitality",
  "Public service",
];

const MODES = [
  { value: "on_campus", label: "On campus" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
] as const;

const STEPS = [
  { title: "About you", blurb: "Who you are and where you are studying." },
  { title: "Qualifications", blurb: "What you have completed, and evidence." },
  { title: "Direction", blurb: "Where you want to go, and the budget you have." },
  { title: "Consent", blurb: "How your data is used, and what this service is not." },
];

interface FormState {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  city: string;
  country: string;
  stage: Learner["stage"];
  currentEducation: string;
  institution: string;
  percentage: string;
  subjects: string;
  backlogs: string;
  englishTestType: "IELTS" | "TOEFL" | "PTE" | "Duolingo" | "None";
  englishTestScore: string;
  workExperienceMonths: string;
  targetIntake: string;
  budgetMinLakh: string;
  budgetMaxLakh: string;
  preferredCountries: string[];
  preferredModes: Learner["preferredModes"];
  interestAreas: string[];
  careerGoal: string;
  intendedClusterId: string;
  consentDataProcessing: boolean;
  consentDisclaimer: boolean;
  guardianConsent: boolean;
}

function buildInitial(learner?: Learner | null): FormState {
  return {
    fullName: learner?.fullName ?? "",
    phone: learner?.phone ?? "",
    dateOfBirth: learner?.dateOfBirth ?? "",
    city: learner?.city ?? "",
    country: learner?.country ?? "India",
    stage: learner?.stage ?? "undergraduate",
    currentEducation: learner?.currentEducation ?? "",
    institution: learner?.institution ?? "",
    percentage: learner?.percentage !== undefined ? String(learner.percentage) : "",
    subjects: learner?.subjects.join(", ") ?? "",
    backlogs: String(learner?.backlogs ?? 0),
    englishTestType: learner?.englishTest?.type ?? "None",
    englishTestScore:
      learner?.englishTest?.score !== undefined ? String(learner.englishTest.score) : "",
    workExperienceMonths: String(learner?.workExperienceMonths ?? 0),
    targetIntake: learner?.targetIntake ?? "August 2027",
    budgetMinLakh: learner ? String(Math.round(learner.budgetMinINR / 100000)) : "2",
    budgetMaxLakh: learner ? String(Math.round(learner.budgetMaxINR / 100000)) : "10",
    preferredCountries: learner?.preferredCountries ?? ["India"],
    preferredModes: learner?.preferredModes ?? ["on_campus"],
    interestAreas: learner?.interestAreas ?? [],
    careerGoal: learner?.careerGoal ?? "",
    intendedClusterId: learner?.intendedClusterId ?? "",
    consentDataProcessing: Boolean(learner?.consent.dataProcessing),
    consentDisclaimer: Boolean(learner?.consent.counsellingDisclaimer),
    guardianConsent: Boolean(learner?.consent.guardianConsent),
  };
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand bg-brandSoft text-brand"
          : "border-line bg-panel text-muted hover:border-lineStrong hover:text-content"
      )}
    >
      {children}
    </button>
  );
}

export function OnboardingForm({ learner }: { learner?: Learner | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => buildInitial(learner));
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const isMinor = useMemo(() => {
    if (!form.dateOfBirth) return false;
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return false;
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age < 18;
  }, [form.dateOfBirth]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIssues((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function toggleArray(key: "preferredCountries" | "interestAreas", value: string) {
    setForm((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }

  function toggleMode(value: Learner["preferredModes"][number]) {
    setForm((prev) => {
      const active = prev.preferredModes.includes(value);
      if (active && prev.preferredModes.length === 1) return prev;
      return {
        ...prev,
        preferredModes: active
          ? prev.preferredModes.filter((m) => m !== value)
          : [...prev.preferredModes, value],
      };
    });
  }

  function validateStep(index: number) {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (form.fullName.trim().length < 2) next.fullName = "Enter your full name.";
      if (!form.city.trim()) next.city = "City is required.";
      if (!form.dateOfBirth) next.dateOfBirth = "Date of birth helps us apply guardian consent rules.";
    }
    if (index === 1) {
      if (form.currentEducation.trim().length < 2)
        next.currentEducation = "Tell us your current qualification.";
      if (form.subjects.trim().length === 0)
        next.subjects = "Add at least one subject, separated by commas.";
      if (form.percentage) {
        const value = Number(form.percentage);
        if (!Number.isFinite(value) || value < 0 || value > 100)
          next.percentage = "Percentage must be between 0 and 100.";
      }
      if (form.englishTestType !== "None" && !form.englishTestScore)
        next.englishTestScore = "Add your test score, or set the test to None.";
    }
    if (index === 2) {
      if (form.careerGoal.trim().length < 10)
        next.careerGoal = "Write at least a sentence about your goal.";
      const min = Number(form.budgetMinLakh);
      const max = Number(form.budgetMaxLakh);
      if (!Number.isFinite(min) || min < 0) next.budgetMinLakh = "Enter a valid minimum.";
      if (!Number.isFinite(max) || max <= 0) next.budgetMaxLakh = "Enter a valid maximum.";
      if (Number.isFinite(min) && Number.isFinite(max) && max < min)
        next.budgetMaxLakh = "Maximum must be at least the minimum.";
      if (form.preferredCountries.length === 0)
        next.preferredCountries = "Pick at least one destination.";
    }
    if (index === 3) {
      if (!form.consentDataProcessing)
        next.consentDataProcessing = "Data processing consent is required.";
      if (!form.consentDisclaimer)
        next.consentDisclaimer = "Please acknowledge the counselling disclaimer.";
      if (isMinor && !form.guardianConsent)
        next.guardianConsent = "Guardian consent is required for learners under 18.";
    }
    setIssues(next);
    return Object.keys(next).length === 0;
  }

  function nextStep() {
    setError(null);
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setError(null);
    for (let i = 0; i < STEPS.length; i += 1) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }
    setBusy(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        city: form.city.trim(),
        country: form.country,
        stage: form.stage,
        currentEducation: form.currentEducation.trim(),
        institution: form.institution.trim(),
        percentage: form.percentage ? Number(form.percentage) : null,
        subjects: form.subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        backlogs: Number(form.backlogs) || 0,
        englishTestType: form.englishTestType,
        englishTestScore: form.englishTestScore ? Number(form.englishTestScore) : null,
        workExperienceMonths: Number(form.workExperienceMonths) || 0,
        targetIntake: form.targetIntake,
        budgetMinINR: Math.round(Number(form.budgetMinLakh) * 100000),
        budgetMaxINR: Math.round(Number(form.budgetMaxLakh) * 100000),
        preferredCountries: form.preferredCountries,
        preferredModes: form.preferredModes,
        interestAreas: form.interestAreas,
        careerGoal: form.careerGoal.trim(),
        intendedClusterId: form.intendedClusterId,
        consentDataProcessing: true,
        consentDisclaimer: true,
        guardianConsent: form.guardianConsent,
      };

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.issues?.length) {
          const map: Record<string, string> = {};
          for (const issue of data.issues as { path: string; message: string }[]) {
            map[issue.path] = issue.message;
          }
          setIssues(map);
          setError(data.error ?? "Some details need attention.");
        } else {
          setError(data.error ?? "We could not save your profile.");
        }
        return;
      }
      router.push(data.redirect ?? "/learner");
      router.refresh();
    } catch {
      setError("The server could not be reached. Your details were not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-10">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <ol className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {STEPS.map((item, index) => {
            const complete = index < step;
            const active = index === step;
            return (
              <li key={item.title} className="shrink-0 lg:w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (index < step + 1) setStep(index);
                  }}
                  className={cn(
                    "focus-ring flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors lg:px-3",
                    active
                      ? "bg-brandSoft text-brand"
                      : complete
                        ? "text-content hover:bg-panel2"
                        : "text-faint"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.62rem] font-semibold",
                      active
                        ? "border-brand bg-panel text-brand"
                        : complete
                          ? "border-brand bg-brand text-brandContrast"
                          : "border-line text-faint"
                    )}
                  >
                    {complete ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="text-xs font-medium">{item.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 hidden rounded-xl border border-line bg-panel p-4 lg:block">
          <Lock className="h-4 w-4 text-brand" />
          <p className="mt-2 text-xs font-semibold text-content">Private by default</p>
          <p className="mt-1 text-[0.7rem] leading-5 text-muted">
            Only your counsellor can see this profile. It is never used to train
            models, and you can request a copy or deletion.
          </p>
        </div>
      </aside>

      <div>
        <div className="mb-5">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="text-[0.68rem] text-muted">{STEPS[step].blurb}</p>
          </div>
          <h2 className="display mt-2 text-2xl font-semibold tracking-tight text-content">
            {STEPS[step].title}
          </h2>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-panel2">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <Alert tone="warning" title="Could not save">
              {error}
            </Alert>
          </div>
        )}

        <div className="card p-5 sm:p-7">
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" htmlFor="fullName" error={issues.fullName} className="sm:col-span-2">
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  autoComplete="name"
                  placeholder="As it appears on your documents"
                />
              </Field>
              <Field label="Phone" htmlFor="phone" hint="Optional — used only for counselling contact.">
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  autoComplete="tel"
                  placeholder="+91"
                />
              </Field>
              <Field label="Date of birth" htmlFor="dob" error={issues.dateOfBirth}>
                <Input
                  id="dob"
                  type="date"
                  value={form.dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
              </Field>
              <Field label="City" htmlFor="city" error={issues.city}>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Bengaluru"
                />
              </Field>
              <Field label="Country" htmlFor="country">
                <Select
                  id="country"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Current stage"
                htmlFor="stage"
                hint="This decides which programme levels we can shortlist."
                className="sm:col-span-2"
              >
                <Select
                  id="stage"
                  value={form.stage}
                  onChange={(e) => set("stage", e.target.value as Learner["stage"])}
                >
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Current qualification"
                htmlFor="currentEducation"
                error={issues.currentEducation}
                hint="For example: B.Com (Hons), University of Delhi"
                className="sm:col-span-2"
              >
                <Input
                  id="currentEducation"
                  value={form.currentEducation}
                  onChange={(e) => set("currentEducation", e.target.value)}
                  placeholder="Class XII (CBSE) · PCM, or B.Tech Mechanical"
                />
              </Field>
              <Field label="Institution" htmlFor="institution" hint="Optional.">
                <Input
                  id="institution"
                  value={form.institution}
                  onChange={(e) => set("institution", e.target.value)}
                />
              </Field>
              <Field
                label="Latest percentage / CGPA"
                htmlFor="percentage"
                error={issues.percentage}
                hint="As a percentage. Used only for eligibility checks."
              >
                <Input
                  id="percentage"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.percentage}
                  onChange={(e) => set("percentage", e.target.value)}
                  placeholder="78"
                />
              </Field>
              <Field
                label="Subjects"
                htmlFor="subjects"
                error={issues.subjects}
                hint="Comma separated — e.g. Accountancy, Economics, Mathematics, English"
                className="sm:col-span-2"
              >
                <Input
                  id="subjects"
                  value={form.subjects}
                  onChange={(e) => set("subjects", e.target.value)}
                />
              </Field>
              <Field label="Active backlogs" htmlFor="backlogs" hint="Enter 0 if none.">
                <Input
                  id="backlogs"
                  type="number"
                  min={0}
                  max={50}
                  value={form.backlogs}
                  onChange={(e) => set("backlogs", e.target.value)}
                />
              </Field>
              <Field label="Work experience (months)" htmlFor="workExp">
                <Input
                  id="workExp"
                  type="number"
                  min={0}
                  max={720}
                  value={form.workExperienceMonths}
                  onChange={(e) => set("workExperienceMonths", e.target.value)}
                />
              </Field>
              <Field label="English test" htmlFor="englishType">
                <Select
                  id="englishType"
                  value={form.englishTestType}
                  onChange={(e) =>
                    set("englishTestType", e.target.value as FormState["englishTestType"])
                  }
                >
                  <option value="None">Not taken</option>
                  <option value="IELTS">IELTS</option>
                  <option value="TOEFL">TOEFL</option>
                  <option value="PTE">PTE</option>
                  <option value="Duolingo">Duolingo</option>
                </Select>
              </Field>
              <Field
                label="Score"
                htmlFor="englishScore"
                error={issues.englishTestScore}
                hint="Optional unless the test is selected."
              >
                <Input
                  id="englishScore"
                  type="number"
                  min={0}
                  max={200}
                  step="0.5"
                  value={form.englishTestScore}
                  onChange={(e) => set("englishTestScore", e.target.value)}
                  disabled={form.englishTestType === "None"}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Target intake" htmlFor="intake">
                  <Select
                    id="intake"
                    value={form.targetIntake}
                    onChange={(e) => set("targetIntake", e.target.value)}
                  >
                    {["January 2027", "August 2027", "January 2028", "August 2028"].map(
                      (intake) => (
                        <option key={intake} value={intake}>
                          {intake}
                        </option>
                      )
                    )}
                  </Select>
                </Field>
                <Field
                  label="Career direction (optional)"
                  htmlFor="cluster"
                  hint="You can change this after the assessment."
                >
                  <Select
                    id="cluster"
                    value={form.intendedClusterId}
                    onChange={(e) => set("intendedClusterId", e.target.value)}
                  >
                    <option value="">Not sure yet</option>
                    <option value="engineering">Engineering & built environment</option>
                    <option value="data">Data, computing & AI</option>
                    <option value="health">Health & life sciences</option>
                    <option value="business">Business & management</option>
                    <option value="finance">Finance & accounting</option>
                    <option value="law">Law, policy & public administration</option>
                    <option value="design">Design & creative practice</option>
                    <option value="education">Education & social impact</option>
                    <option value="media">Media & communication</option>
                    <option value="environment">Environment & sustainability</option>
                    <option value="hospitality">Hospitality, travel & services</option>
                    <option value="public_service">Public service, defence & aviation</option>
                  </Select>
                </Field>
              </div>

              <Field
                label="What are you trying to achieve?"
                htmlFor="goal"
                error={issues.careerGoal}
                hint="One or two sentences is enough. This helps your counsellor, not an algorithm."
              >
                <Textarea
                  id="goal"
                  value={form.careerGoal}
                  onChange={(e) => set("careerGoal", e.target.value)}
                  placeholder="I want to move into a finance analytics role, and eventually work on policy-linked financing."
                  rows={3}
                />
              </Field>

              <div>
                <p className="text-sm font-medium text-content">Destinations</p>
                <p className="mb-2.5 mt-0.5 text-xs text-muted">
                  Where would you realistically study? Pick all that apply.
                </p>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.map((country) => (
                    <Chip
                      key={country}
                      active={form.preferredCountries.includes(country)}
                      onClick={() => toggleArray("preferredCountries", country)}
                    >
                      {country}
                    </Chip>
                  ))}
                </div>
                {issues.preferredCountries && (
                  <p className="mt-1.5 text-xs font-medium text-clay-600 dark:text-clay-300">
                    {issues.preferredCountries}
                  </p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-content">Study mode</p>
                  <p className="mb-2.5 mt-0.5 text-xs text-muted">At least one.</p>
                  <div className="flex flex-wrap gap-2">
                    {MODES.map((mode) => (
                      <Chip
                        key={mode.value}
                        active={form.preferredModes.includes(mode.value)}
                        onClick={() => toggleMode(mode.value)}
                      >
                        {mode.label}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-content">Interest areas</p>
                  <p className="mb-2.5 mt-0.5 text-xs text-muted">Optional.</p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_AREAS.map((area) => (
                      <Chip
                        key={area}
                        active={form.interestAreas.includes(area)}
                        onClick={() => toggleArray("interestAreas", area)}
                      >
                        {area}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-panel2/40 p-4">
                <p className="text-sm font-medium text-content">
                  Programme budget (total, not per year)
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted">
                  Used to flag options you cannot realistically fund. Fees are
                  indicative and must be verified.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="From (₹ lakh)" htmlFor="budgetMin" error={issues.budgetMinLakh}>
                    <Input
                      id="budgetMin"
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.budgetMinLakh}
                      onChange={(e) => set("budgetMinLakh", e.target.value)}
                    />
                  </Field>
                  <Field label="Up to (₹ lakh)" htmlFor="budgetMax" error={issues.budgetMaxLakh}>
                    <Input
                      id="budgetMax"
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.budgetMaxLakh}
                      onChange={(e) => set("budgetMaxLakh", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-line bg-panel2/40 p-4">
                <p className="eyebrow mb-2">Please review</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-faint">Name</dt>
                    <dd className="mt-0.5 font-medium text-content">{form.fullName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">Stage</dt>
                    <dd className="mt-0.5 font-medium text-content">
                      {STAGE_OPTIONS.find((s) => s.value === form.stage)?.label ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">Qualification</dt>
                    <dd className="mt-0.5 font-medium text-content">
                      {form.currentEducation || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">Target intake</dt>
                    <dd className="mt-0.5 font-medium text-content">{form.targetIntake}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">Budget</dt>
                    <dd className="mt-0.5 font-medium text-content">
                      ₹{form.budgetMinLakh}–{form.budgetMaxLakh} lakh
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">Destinations</dt>
                    <dd className="mt-0.5 font-medium text-content">
                      {form.preferredCountries.join(", ") || "—"}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="mt-3 text-xs font-medium text-brand underline underline-offset-4"
                >
                  Edit details
                </button>
              </div>

              <div className="space-y-3">
                <CheckboxRow
                  id="consent-data"
                  checked={form.consentDataProcessing}
                  onChange={(v) => set("consentDataProcessing", v)}
                >
                  I consent to Northstar processing my profile and assessment
                  responses to deliver career counselling, as described in the{" "}
                  <Link href="/privacy" className="font-medium text-content underline">
                    privacy notice
                  </Link>
                  . My data is not sold and is not used to train models.
                </CheckboxRow>
                {issues.consentDataProcessing && (
                  <p className="text-xs font-medium text-clay-600 dark:text-clay-300">
                    {issues.consentDataProcessing}
                  </p>
                )}

                <CheckboxRow
                  id="consent-disclaimer"
                  checked={form.consentDisclaimer}
                  onChange={(v) => set("consentDisclaimer", v)}
                >
                  I understand that Northstar provides guidance only. It does not
                  guarantee admission, placement, salary or visa outcomes, and it
                  does not replace a licensed counsellor or clinician.
                </CheckboxRow>
                {issues.consentDisclaimer && (
                  <p className="text-xs font-medium text-clay-600 dark:text-clay-300">
                    {issues.consentDisclaimer}
                  </p>
                )}

                {isMinor && (
                  <div className="rounded-xl border border-brass-500/30 bg-brass-500/[0.07] p-4">
                    <CheckboxRow
                      id="consent-guardian"
                      checked={form.guardianConsent}
                      onChange={(v) => set("guardianConsent", v)}
                    >
                      A parent or legal guardian consents to this learner using
                      Northstar. Guardian consent is required for learners under 18.
                    </CheckboxRow>
                    {issues.guardianConsent && (
                      <p className="mt-2 text-xs font-medium text-clay-600 dark:text-clay-300">
                        {issues.guardianConsent}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Alert tone="guardrail" title="What happens next">
                Your assessment scores are interpreted against a career cluster map.
                A counsellor reviews the report before you see it. Nothing is
                released automatically, and no outcome is promised at any stage.
              </Alert>
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 0 || busy}
              className="focus-ring inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-panel2 hover:text-content disabled:opacity-40 sm:justify-start"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-2">
              <p className="mr-1 hidden text-[0.68rem] text-faint sm:block">
                {learner ? "Saved to your existing profile" : "You can edit this later"}
              </p>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep} size="md">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={submit} disabled={busy} size="md">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {busy ? "Saving" : "Save and enter workspace"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 text-[0.7rem] leading-5 text-faint">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Your profile is visible only to you and your assigned counsellor.
            Sensitive details are minimised, and every access is attributable.
          </p>
        </div>
        {Object.keys(issues).length > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-clay-600 dark:text-clay-300">
            <CircleAlert className="h-3.5 w-3.5" /> Please resolve the highlighted fields.
          </p>
        )}
      </div>
    </div>
  );
}
