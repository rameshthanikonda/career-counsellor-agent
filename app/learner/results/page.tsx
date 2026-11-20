import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  Download,
  FileText,
  Lock,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, humanStatus, statusTone } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { SectionCard, KeyValue } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Tabs } from "@/components/ui/tabs";
import { RiasecChart } from "@/components/charts/riasec-chart";
import { AptitudeChart } from "@/components/charts/aptitude-chart";
import { PersonalityRadar } from "@/components/charts/personality-radar";
import { ShortlistCompare } from "@/components/learner/shortlist-compare";
import { CareerMap } from "@/components/learner/career-map";
import { formatDate, formatFeeRange } from "@/lib/utils/format";
import { RIASEC_LABELS, BIG_FIVE_LABELS } from "@/lib/assessment/instruments";

export const metadata: Metadata = { title: "Results & report" };
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) redirect("/onboarding");

  const workspace = await getLearnerWorkspace(learner.id);
  const { assessment, report, shortlist, fits, paths, satisfaction } = workspace;
  const counsellor = learner.counsellorId
    ? await store.getUserById(learner.counsellorId)
    : report?.counsellorId
      ? await store.getUserById(report.counsellorId)
      : null;
  const releasedVersions = (await store.listReports())
    .filter(
      (candidate) =>
        candidate.learnerId === learner.id && candidate.status === "released"
    )
    .sort((a, b) => b.version - a.version);

  if (!assessment || assessment.status !== "completed") {
    return (
      <>
        <PageHeader
          eyebrow="Results"
          title="Your report starts with the assessment."
          description="Complete the Career Compass battery and a counsellor will review your results before anything is released."
        />
        <div className="card p-8 text-center sm:p-12">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brandSoft text-brand">
            <FileText className="h-5 w-5" />
          </span>
          <h2 className="display mt-4 text-xl font-semibold text-content">
            No assessment on file yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            The battery takes about 28 minutes across three sections. Your answers
            save as you go.
          </p>
          <Link href="/learner/assessment" className={buttonClasses("primary", "md", "mt-5")}>
            Start the assessment
          </Link>
        </div>
      </>
    );
  }

  if (!report || report.status !== "released") {
    const stages = [
      { label: "Assessment complete", date: assessment.completedAt, done: true },
      { label: "Report submitted", date: report?.submittedAt, done: Boolean(report?.submittedAt) },
      { label: "Counsellor review", date: report?.reviewedAt, done: Boolean(report?.reviewedAt) },
      { label: "Released to you", date: report?.releasedAt, done: false },
    ];
    return (
      <>
        <PageHeader
          eyebrow="Results"
          title="A counsellor is reviewing your report."
          description="This is the human checkpoint. Your report, shortlist and plan are prepared, but nothing is visible until a counsellor has reviewed the interpretation and the language."
          actions={
            <Badge tone={statusTone(report?.status ?? "in_review")} dot>
              {humanStatus(report?.status ?? "in_review")}
            </Badge>
          }
        />

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brass-500/10 text-brass-600 dark:text-brass-300">
                <Clock3 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="display text-xl font-semibold text-content">
                  Review in progress
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  {report?.status === "approved"
                    ? "Your report is approved and will be released shortly."
                    : "Your counsellor checks the scores, the shortlist reasoning and every line of advice before release. This usually takes 1–3 working days."}
                </p>
              </div>
            </div>

            <ol className="mt-7 space-y-0">
              {stages.map((stage, index) => (
                <li key={stage.label} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < stages.length - 1 && (
                    <span
                      className="absolute left-[0.68rem] top-6 h-[calc(100%-1.5rem)] w-px bg-line"
                      aria-hidden
                    />
                  )}
                  <span
                    className={
                      stage.done
                        ? "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-brandContrast"
                        : "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-[0.6rem] text-faint"
                    }
                  >
                    {stage.done ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-content">{stage.label}</p>
                    <p className="text-xs text-muted">
                      {stage.date ? formatDate(stage.date) : "Pending"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-xl border border-line bg-panel2/40 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-content">
                <Lock className="h-3.5 w-3.5 text-muted" /> Why scores stay hidden for now
              </p>
              <p className="mt-1.5 text-xs leading-5 text-muted">
                A raw score without interpretation can be misleading. The report pairs
                your profile with eligibility, budget and options — and a counsellor
                signs that interpretation before you act on it.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <SectionCard eyebrow="What you will receive" title="Inside the report">
              <ul className="space-y-2.5 text-sm text-muted">
                {[
                  "Interest, aptitude and working-style profile",
                  "Cluster fit with the factors behind each score",
                  "A verified shortlist with fees, eligibility and outcome bands",
                  "A career map and 12-month plan",
                  "Your counsellor's written note",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard eyebrow="While you wait" title="Use the time well">
              <p className="text-sm leading-6 text-muted">
                You can talk to the advisor now. It can search the catalogue and
                compare options, but it cannot see the report before it is released.
              </p>
              <Link href="/learner/advisor" className={buttonClasses("secondary", "md", "mt-4 w-full")}>
                <Sparkles className="h-4 w-4" /> Open advisor
              </Link>
            </SectionCard>
          </div>
        </div>
      </>
    );
  }

  const scores = assessment.scores!;
  const leadingFit = fits[0];

  const profileTab = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          eyebrow="Interest profile"
          title={`Holland code ${scores.topInterestCode}`}
          description="Interest themes describe what kind of work holds your attention. There are no right answers."
        >
          <RiasecChart scores={scores.interest} />
          <div className="mt-5 rounded-xl bg-panel2/50 p-3.5">
            <p className="text-xs font-semibold text-content">
              {RIASEC_LABELS[scores.topInterestCode[0] as keyof typeof RIASEC_LABELS]?.name} is your
              strongest theme
            </p>
            <p className="mt-1 text-[0.7rem] leading-5 text-muted">
              Combined with{" "}
              {RIASEC_LABELS[scores.topInterestCode[1] as keyof typeof RIASEC_LABELS]?.name?.toLowerCase()}{" "}
              and{" "}
              {RIASEC_LABELS[scores.topInterestCode[2] as keyof typeof RIASEC_LABELS]?.name?.toLowerCase()}
              , this pattern shapes which work environments are likely to feel
              natural — not which ones you are capable of.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Aptitude screen"
          title="Reasoning profile"
          description="A practice-level check of numerical, verbal, logical and spatial reasoning."
        >
          <AptitudeChart scores={scores.aptitude} />
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <SectionCard
          eyebrow="Working style"
          title="Five broad traits"
          description="Self-reported preferences, useful for reflection and coaching — not a clinical diagnosis."
        >
          <PersonalityRadar scores={scores.personality} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(
              Object.keys(scores.personality) as (keyof typeof scores.personality)[]
            ).map((trait) => (
              <div key={trait} className="rounded-lg border border-line bg-panel2/30 px-3 py-2">
                <p className="text-[0.62rem] uppercase tracking-[0.08em] text-faint">
                  {BIG_FIVE_LABELS[trait].name}
                </p>
                <p className="mt-0.5 text-xs font-medium text-content">
                  {scores.personality[trait] >= 65
                    ? BIG_FIVE_LABELS[trait].high
                    : scores.personality[trait] <= 35
                      ? BIG_FIVE_LABELS[trait].low
                      : "Balanced — context-dependent"}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Cluster fit"
          title="Where the profile points"
          description="Fit combines interest pattern (50%), aptitude (30%) and working style (20%)."
          bodyClassName="p-0 sm:p-0"
        >
          <ul className="divide-y divide-line">
            {fits.slice(0, 6).map((fit) => (
              <li key={fit.cluster.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content">{fit.cluster.name}</p>
                    <p className="mt-0.5 text-[0.68rem] leading-5 text-muted">
                      {fit.cluster.summary}
                    </p>
                  </div>
                  <span className="display shrink-0 text-xl font-semibold text-brand">
                    {fit.score}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.62rem] text-faint">
                  <span>Interest {fit.factors.interest}</span>
                  <span>Aptitude {fit.factors.aptitude}</span>
                  <span>Style {fit.factors.personality}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <p className="text-[0.65rem] leading-5 text-faint">
              Scores are relative to this catalogue&apos;s cluster definitions, not
              population percentiles.
            </p>
          </div>
        </SectionCard>
      </div>

      <Alert tone={scores.quality.band === "high" ? "success" : "warning"} title={`Response quality: ${scores.quality.band}`}>
        {scores.quality.flags.length > 0 ? (
          <ul className="space-y-1">
            {scores.quality.flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        ) : (
          "Your responses showed good variation and were completed at a sensible pace. This is a response-quality signal, not a validity certificate."
        )}
      </Alert>
    </div>
  );

  const shortlistTab = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-5 text-muted">
          {shortlist.length} programmes, ranked on fit, eligibility, budget and
          preference. Each row shows the factors behind its score.
        </p>
        <Badge tone="outline">{shortlist[0]?.course.dataSource === "illustrative" ? "Illustrative catalogue" : "Verified data"}</Badge>
      </div>
      <ShortlistCompare items={shortlist} />
    </div>
  );

  const reportTab = (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        <SectionCard eyebrow="Counsellor summary" title="The reading">
          <p className="text-sm leading-7 text-muted">{report.narrative.summary}</p>
          {report.learnerFacingNote && (
            <div className="mt-4 rounded-xl border border-brand/20 bg-brandSoft/60 p-4">
              <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-brand">
                <MessageSquareQuote className="h-3.5 w-3.5" /> Note from your counsellor
              </p>
              <p className="mt-1.5 text-sm leading-6 text-content">
                {report.learnerFacingNote}
              </p>
            </div>
          )}
        </SectionCard>

        <div className="grid gap-5 sm:grid-cols-2">
          <SectionCard eyebrow="Strengths" title="What stands out">
            <ul className="space-y-2.5">
              {report.narrative.strengths.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-5 text-muted">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard eyebrow="Considerations" title="What to watch">
            <ul className="space-y-2.5">
              {report.narrative.considerations.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-5 text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass-500" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <SectionCard eyebrow="Recommendations" title="Next four moves">
          <ol className="space-y-3">
            {report.narrative.recommendations.map((item, index) => (
              <li key={item} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brandSoft text-[0.62rem] font-semibold text-brand">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-muted">{item}</p>
              </li>
            ))}
          </ol>
        </SectionCard>

        <Alert tone="guardrail" title="Guardrail">
          {report.narrative.guardrailNote}
        </Alert>
      </div>

      <div className="space-y-5">
        <SectionCard eyebrow="Report record" title="Version & verification">
          <dl className="space-y-3">
            <KeyValue label="Status" value={<Badge tone="success" dot>{humanStatus(report.status)}</Badge>} />
            <KeyValue label="Version" value={`v${report.version}`} />
            <KeyValue
              label="Counsellor"
              value={`${counsellor?.name ?? "Pending assignment"}${counsellor?.title ? ` · ${counsellor.title}` : ""}`}
            />
            <KeyValue label="Reviewed" value={formatDate(report.reviewedAt)} />
            <KeyValue label="Released" value={formatDate(report.releasedAt)} />
            <KeyValue
              label="Verification code"
              value={<span className="font-mono text-xs">{report.verificationCode}</span>}
            />
          </dl>
          {releasedVersions.length > 1 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-faint">
                Previous released versions
              </p>
              <ul className="mt-1.5 space-y-1">
                {releasedVersions
                  .filter((version) => version.id !== report.id)
                  .map((version) => (
                    <li key={version.id} className="flex items-center justify-between gap-2 text-[0.68rem]">
                      <span className="text-muted">
                        v{version.version} · {formatDate(version.releasedAt)}
                      </span>
                      <a
                        href={`/api/reports/${version.id}/pdf`}
                        className="font-medium text-content underline"
                      >
                        PDF
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <div className="mt-4 space-y-2">
            <a
              href={`/api/reports/${report.id}/pdf?inline=1`}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("secondary", "md", "w-full")}
            >
              <FileText className="h-4 w-4" /> View PDF in browser
            </a>
            <a
              href={`/api/reports/${report.id}/pdf`}
              className={buttonClasses("primary", "md", "w-full")}
            >
              <Download className="h-4 w-4" /> Download PDF report
            </a>
            <Link
              href={`/verify/${report.verificationCode}`}
              className={buttonClasses("secondary", "md", "w-full")}
            >
              <BadgeCheck className="h-4 w-4" /> Verify this report
            </Link>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Catalogue snapshot" title="Outcome data">
          <p className="text-xs leading-6 text-muted">
            Fees and eligibility are indicative and drawn from an illustrative
            catalogue in this reference build. Outcome bands are deliberately coarse:
            no verified placement or salary figure is claimed.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-panel2/60 px-3 py-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted" />
            <p className="text-[0.68rem] text-muted">Always verify with the institution.</p>
          </div>
        </SectionCard>

        {!satisfaction && (
          <SectionCard eyebrow="Feedback" title="Did this help?">
            <p className="text-xs leading-5 text-muted">
              A one-question satisfaction check helps the counselling team improve.
            </p>
            <Link href="/learner/reviews#satisfaction" className={buttonClasses("quiet", "sm", "mt-3 w-full")}>
              Rate this report
            </Link>
          </SectionCard>
        )}
      </div>
    </div>
  );

  const pathsTab = (
    <div className="space-y-4">
      <CareerMap paths={paths.slice(0, 3)} />
      <div className="rounded-xl border border-line bg-panel2/40 p-4">
        <p className="text-[0.68rem] leading-5 text-muted">
          These maps are templates built from the catalogue&apos;s cluster definitions.
          Your counsellor can edit the route and milestones in your 12-month plan.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow={`Counselling report · v${report.version} · released ${formatDate(report.releasedAt)}`}
        title={`${learner.fullName.split(" ")[0]}, here is your evidence-based route.`}
        description="Your assessment profile, verified shortlist and career map — reviewed and signed off by your counsellor."
        actions={
          <>
            <a
              href={`/api/reports/${report.id}/pdf?inline=1`}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("secondary", "md")}
            >
              <FileText className="h-4 w-4" /> View PDF
            </a>
            <a href={`/api/reports/${report.id}/pdf`} className={buttonClasses("primary", "md")}>
              <Download className="h-4 w-4" /> Download PDF
            </a>
            <Link href="/learner/advisor" className={buttonClasses("secondary", "md")}>
              <Sparkles className="h-4 w-4" /> Ask the advisor
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="card-flat flex items-center gap-4 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brandSoft text-brand">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">Reviewed by</p>
            <p className="text-xs font-semibold text-content">
              {counsellor?.name ?? "Pending assignment"}
            </p>
            <p className="text-[0.65rem] text-muted">{formatDate(report.reviewedAt)}</p>
          </div>
        </div>
        <div className="card-flat flex items-center gap-4 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brandSoft text-brand">
            <BadgeCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">Leading fit</p>
            <p className="text-xs font-semibold text-content">{leadingFit?.cluster.name}</p>
            <p className="text-[0.65rem] text-muted">{leadingFit?.score}/100</p>
          </div>
        </div>
        <div className="card-flat flex items-center gap-4 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brandSoft text-brand">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">Shortlist</p>
            <p className="text-xs font-semibold text-content">
              {shortlist.length} programmes
            </p>
            <p className="text-[0.65rem] text-muted">
              {shortlist[0] ? formatFeeRange(shortlist[0].course.feeMinINR, shortlist[0].course.feeMaxINR) + " from" : ""}
            </p>
          </div>
        </div>
      </div>

      <Tabs
        defaultId="profile"
        items={[
          { id: "profile", label: "Profile", content: profileTab },
          {
            id: "shortlist",
            label: "Shortlist",
            count: shortlist.length,
            content: shortlistTab,
          },
          { id: "paths", label: "Career map", content: pathsTab },
          { id: "report", label: "Report & notes", content: reportTab },
        ]}
      />
    </>
  );
}
