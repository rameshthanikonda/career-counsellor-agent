import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Brain,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Fingerprint,
  GitCompareArrows,
  GraduationCap,
  Layers,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { COURSES } from "@/lib/catalogue/courses";
import { CAREER_CLUSTERS } from "@/lib/catalogue/clusters";
import { CAREER_PATHS } from "@/lib/catalogue/career-paths";
import { TOTAL_ITEMS } from "@/lib/assessment/instruments";

const stats = [
  { value: String(TOTAL_ITEMS), label: "assessment items", hint: "Interest, aptitude and work style" },
  { value: String(CAREER_CLUSTERS.length), label: "career clusters", hint: "Explainable fit scoring, no black box" },
  { value: String(CAREER_PATHS.length), label: "career paths", hint: "With progression and skill maps" },
  { value: String(COURSES.length), label: "catalogue programmes", hint: "Fees, eligibility and outcome bands" },
];

const workflow = [
  {
    n: "01",
    title: "Profile",
    body: "Capture stage, subjects, budget, destinations and consent — only what counselling actually needs. A guardian consent path covers learners under 18.",
    detail: "Consent versioned · data minimisation",
  },
  {
    n: "02",
    title: "Assess",
    body: "Eighty items across RIASEC interests, four aptitude dimensions and five work-style traits. Autosaved, resumable and usable on any phone.",
    detail: "Response-quality flags, not validity claims",
  },
  {
    n: "03",
    title: "Interpret",
    body: "Convert scores into cluster-level fit with the factors shown openly: interest pattern, aptitude contribution and work-style alignment.",
    detail: "Every score is traceable",
  },
  {
    n: "04",
    title: "Compare",
    body: "Rank programmes by fit, eligibility, budget and preferences — with fees, duration, accreditation and outcome bands side by side.",
    detail: "Eligibility rules run before ranking",
  },
  {
    n: "05",
    title: "Plan",
    body: "Generate a 12-month plan with four quarters of checkable milestones, evidence fields and a named counsellor review cadence.",
    detail: "Milestones produce evidence",
  },
  {
    n: "06",
    title: "Human checkpoint",
    body: "Nothing is released to the learner until a counsellor reviews, edits and signs off the report. Every action lands in the audit trail.",
    detail: "Approval is a gate, not a formality",
  },
];

const capabilities = [
  {
    icon: Brain,
    title: "Assessment that shows its working",
    body: "RIASEC, aptitude and Big Five scoring is deterministic and versioned. The learner sees what moved the result, including what it cannot tell them.",
  },
  {
    icon: Scale,
    title: "Eligibility before aspiration",
    body: "A rule engine checks percentage, subjects, backlogs and English tests before a programme can enter an auto-generated shortlist.",
  },
  {
    icon: GitCompareArrows,
    title: "Compare on what matters",
    body: "Fees, duration, mode, country, accreditation and outcome bands — with data provenance displayed on every row.",
  },
  {
    icon: Target,
    title: "Career maps, not vague advice",
    body: "Entry roles, progression stages, indicative salary ranges and the skills needed between each step, all open to counsellor editing.",
  },
  {
    icon: CalendarCheck,
    title: "Quarterly reviews that close the loop",
    body: "Scheduled checkpoints capture progress ratings, next steps and the learner's own reflection, then update the plan.",
  },
  {
    icon: FileText,
    title: "A report you can verify",
    body: "A designed PDF with a verification code, approval trail and clear disclaimers — never a screenshot of a spreadsheet.",
  },
];

const guardrails = [
  {
    icon: Users,
    title: "A counsellor is always in the loop",
    body: "Reports move through draft, review, approval and release. The learner cannot receive a report that no counsellor has signed.",
  },
  {
    icon: ShieldCheck,
    title: "No placement or outcome promises",
    body: "A guardrail checks generated and human-authored copy for guarantee language, and every surface carries the same disclaimer.",
  },
  {
    icon: Fingerprint,
    title: "Licensed instruments only",
    body: "The licence registry holds provider, reference and validity. Expired or pending instruments are blocked from administration.",
  },
  {
    icon: Lock,
    title: "Confidential by design",
    body: "Role-based access, minimal personal data, hashed credentials, an audit trail for every release and no training on learner responses.",
  },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="hairline-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_60%_20%,black,transparent_72%)]" />
          <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand/[0.07] blur-3xl" />
          <div className="absolute -left-32 bottom-0 h-[22rem] w-[22rem] rounded-full bg-brass-500/[0.08] blur-3xl" />

          <div className="container-page relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:py-28">
            <div className="animate-fade-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 text-[0.7rem] font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Career Counsellor Agent · Education & careers
              </div>
              <h1 className="display text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-content sm:text-[3.4rem] lg:text-[4rem]">
                Career decisions
                <br />
                deserve{" "}
                <span className="relative whitespace-nowrap text-brand">
                  evidence
                  <svg
                    className="absolute -bottom-2 left-0 w-full text-brand/35"
                    height="10"
                    viewBox="0 0 200 10"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path d="M2 7c40-5 90-6 196-2" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
                ,
                <br />
                not guesswork.
              </h1>
              <p className="mt-6 max-w-xl text-[1.02rem] leading-7 text-muted">
                Northstar guides students through UG and PG selection, and
                professionals through career path design. Assessments become a
                ranked shortlist, a career map and a 12-month plan — reviewed by a
                human counsellor before anything reaches the learner.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="focus-ring inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-medium text-brandContrast transition-colors hover:bg-brand/90"
                >
                  Enter the learner demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login?demo=counsellor"
                  className="focus-ring inline-flex h-12 items-center gap-2 rounded-xl border border-lineStrong px-6 text-sm font-medium text-content transition-colors hover:border-content/40 hover:bg-panel2"
                >
                  See the counsellor review
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.72rem] text-faint">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" /> Human-reviewed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" /> No outcome promises
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand" /> Gemini tool use
                </span>
              </div>
            </div>

            <div className="animate-fade-up animation-delay-200 pb-6 sm:pb-0">
              <HeroPreview />
            </div>
          </div>

          <div className="container-page relative pb-10">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-panel px-4 py-5 sm:px-5">
                  <p className="display text-2xl font-semibold text-content sm:text-[1.9rem]">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] font-medium text-content">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-[0.65rem] leading-4 text-faint">{stat.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="border-b border-line py-20 sm:py-28">
          <div className="container-page">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="eyebrow mb-3">The operating flow</p>
                <h2 className="display text-[2rem] font-semibold leading-tight tracking-tight text-content sm:text-[2.6rem]">
                  Six steps from a questionnaire to a plan someone will actually
                  follow.
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-7 text-muted">
                  The workflow is deliberately linear, with one deliberate break:
                  step six. A counsellor reviews the interpretation and the
                  language before the learner can act on it.
                </p>
                <div className="mt-6 rounded-xl border border-line bg-panel p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-content">
                    <BadgeCheck className="h-4 w-4 text-brand" />
                    Approval is enforced in the data model
                  </p>
                  <p className="mt-1.5 text-[0.75rem] leading-5 text-muted">
                    Report status: draft → in review → approved → released. The
                    learner results screen reads the last gate, not the first.
                  </p>
                </div>
              </div>

              <ol className="relative space-y-0">
                {workflow.map((step, index) => (
                  <li key={step.n} className="relative flex gap-5 pb-8 last:pb-0 sm:gap-6">
                    {index < workflow.length - 1 && (
                      <span
                        className="absolute left-[1.15rem] top-10 h-[calc(100%-2.5rem)] w-px bg-line sm:left-[1.4rem]"
                        aria-hidden
                      />
                    )}
                    <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-[0.7rem] font-semibold tabular-nums text-muted sm:h-11 sm:w-11">
                      {step.n}
                    </span>
                    <div className="min-w-0 pt-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="display text-lg font-semibold text-content sm:text-xl">
                          {step.title}
                        </h3>
                        <span className="text-[0.65rem] font-medium uppercase tracking-[0.1em] text-faint">
                          {step.detail}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="border-b border-line bg-panel/40 py-20 sm:py-28">
          <div className="container-page">
            <div className="max-w-2xl">
              <p className="eyebrow mb-3">What the agent does</p>
              <h2 className="display text-[2rem] font-semibold leading-tight tracking-tight text-content sm:text-[2.6rem]">
                Built around the five responsibilities of a real counsellor.
              </h2>
              <p className="mt-4 text-[0.95rem] leading-7 text-muted">
                Run assessments, translate results into options, compare the
                economics, build a path with milestones and review progress every
                quarter. Northstar supports each one without pretending to replace
                the counsellor.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="group rounded-2xl border border-line bg-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-lineStrong hover:shadow-card sm:p-6"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel2 text-brand transition-colors group-hover:bg-brandSoft">
                      <Icon className="h-[1.15rem] w-[1.15rem]" />
                    </span>
                    <h3 className="display mt-4 text-[1.05rem] font-semibold leading-snug text-content">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[0.82rem] leading-6 text-muted">{item.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Guardrails */}
        <section id="guardrails" className="relative overflow-hidden bg-ink-900 py-20 text-paper sm:py-28">
          <div className="absolute inset-0 opacity-[0.09] [background-image:radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_80%_70%,white,transparent_40%)]" />
          <div className="container-page relative">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-eyebrow text-paper/50">
                  Guardrails
                </p>
                <h2 className="display text-[2rem] font-semibold leading-tight tracking-tight text-paper sm:text-[2.6rem]">
                  The limits are part of the product.
                </h2>
                <p className="mt-4 text-[0.95rem] leading-7 text-paper/65">
                  Career advice carries real consequences. Northstar is designed to
                  be honest about uncertainty, restrictive about instruments, and
                  accountable for every report it releases.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 text-xs text-paper/70">
                <ShieldCheck className="h-4 w-4" /> Policy enforced in code
              </div>
            </div>

            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-paper/15 bg-paper/15 sm:grid-cols-2">
              {guardrails.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-ink-900 p-6 sm:p-7">
                    <Icon className="h-5 w-5 text-brass-300" />
                    <h3 className="display mt-4 text-lg font-semibold text-paper">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[0.82rem] leading-6 text-paper/60">{item.body}</p>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-[0.7rem] leading-5 text-paper/40">
              Psychometric note: the in-house Career Compass battery is a guidance
              instrument, not a clinical diagnostic or selection test. Third-party
              instruments remain subject to their provider&apos;s licence terms.
            </p>
          </div>
        </section>

        {/* Architecture */}
        <section id="stack" className="border-b border-line py-20 sm:py-28">
          <div className="container-page">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                <p className="eyebrow mb-3">Interfaces & architecture</p>
                <h2 className="display text-[2rem] font-semibold leading-tight tracking-tight text-content sm:text-[2.5rem]">
                  Three screens, one accountable core.
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-7 text-muted">
                  Learner screens for onboarding, assessment and results. A
                  counsellor console for review, editing and release. An agent core
                  that pairs a deterministic scoring engine with a tool-based AI
                  advisor — and a human checkpoint before anything reaches the
                  learner.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Next.js",
                    "Tailwind CSS",
                    "Postgres / Supabase",
                    "AI advisor with tool use",
                    "PDF counselling reports",
                    "Human review",
                  ].map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-line bg-panel px-3 py-1 text-[0.7rem] font-medium text-muted"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.75rem]">
                  <a
                    href="/sample-report.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-content underline decoration-lineStrong underline-offset-4 hover:decoration-content"
                  >
                    <FileText className="h-3.5 w-3.5" /> Sample report (PDF)
                  </a>
                  <Link
                    href="/verify"
                    className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-content"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" /> Verify a report
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-content"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Create an account
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: GraduationCap,
                    title: "Learner",
                    body: "Onboarding, resumable assessment, results after release, career map, plan, applications and quarterly reviews.",
                    meta: "Learner workspace",
                  },
                  {
                    icon: Users,
                    title: "Counsellor",
                    body: "Review queue, editable narrative, shortlist decisions, approval, release, report history and learner analytics.",
                    meta: "Human checkpoint",
                  },
                  {
                    icon: Layers,
                    title: "Agent core",
                    body: "Deterministic scoring, eligibility rules, tool-based AI with a deterministic fallback, guardrail filter and audit logging.",
                    meta: "Explainable by default",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 rounded-2xl border border-line bg-panel p-5"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brandSoft text-brand">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-content">{item.title}</h3>
                          <span className="rounded-full border border-line px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.08em] text-faint">
                            {item.meta}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[0.82rem] leading-6 text-muted">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-brass-500/25 bg-brass-500/[0.06] p-5 sm:flex-row sm:items-start sm:gap-4">
              <Star className="h-5 w-5 shrink-0 text-brass-600 dark:text-brass-300" />
              <p className="text-[0.8rem] leading-6 text-muted">
                <strong className="font-semibold text-content">Build note.</strong>{" "}
                The catalogue in this build is illustrative — fees, eligibility and
                outcome bands are approximations. Confirm systems, access, policies
                and approvals with the client before production, and replace the
                catalogue with institution-verified or licensed data before using
                the product with real learners. The licence registry exists so this
                step cannot be skipped quietly.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-b border-line py-20 sm:py-24">
          <div className="container-narrow text-center">
            <p className="eyebrow mb-3">Pilot</p>
            <h2 className="display text-[2rem] font-semibold leading-tight tracking-tight text-content sm:text-[2.7rem]">
              Start with one cohort. Measure the counselling, not the hype.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[0.95rem] leading-7 text-muted">
              Run a supervised pilot: one counsellor, twenty learners, one intake
              cycle. Track completion, review turnaround and learner satisfaction —
              then decide.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-medium text-brandContrast transition-colors hover:bg-brand/90 sm:w-auto"
              >
                Create a learner account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login?demo=counsellor"
                className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-lineStrong px-6 text-sm font-medium text-content transition-colors hover:bg-panel2 sm:w-auto"
              >
                Explore the counsellor workspace
              </Link>
              <a
                href="mailto:info@waecs.in?subject=Northstar%20pilot"
                className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-lineStrong px-6 text-sm font-medium text-content transition-colors hover:bg-panel2 sm:w-auto"
              >
                Talk to WAECS
              </a>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[0.72rem]">
              <a
                href="/sample-report.pdf"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-content underline underline-offset-4"
              >
                <FileText className="h-3.5 w-3.5" /> View a sample report
              </a>
              <Link href="/verify" className="inline-flex items-center gap-1.5 text-muted hover:text-content">
                <BadgeCheck className="h-3.5 w-3.5" /> Verify a report code
              </Link>
            </div>
            <p className="mt-4 text-[0.7rem] text-faint">
              Demo accounts are pre-seeded. No real learner data is used.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
