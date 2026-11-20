import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { PublicPage } from "@/components/site/public-page";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  INSTRUMENT_NAME,
  INSTRUMENT_VERSION,
  SECTIONS,
  TOTAL_ITEMS,
} from "@/lib/assessment/instruments";
import { CAREER_CLUSTERS } from "@/lib/catalogue/clusters";
import { COURSES } from "@/lib/catalogue/courses";
import { CAREER_PATHS } from "@/lib/catalogue/career-paths";

export const metadata: Metadata = {
  title: "Method & limits",
  description:
    "How the Northstar career counselling agent scores assessments, matches courses, builds plans and keeps a human checkpoint.",
};

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display mt-1.5 text-[1.4rem] font-semibold tracking-tight text-content sm:text-2xl">
        {title}
      </h2>
      <div className="prose-northstar mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  const totalMinutes = SECTIONS.reduce((sum, section) => sum + section.minutes, 0);

  return (
    <PublicPage>
      <PageHeader
        eyebrow="Standards"
        title="Method and limits."
        description="A career recommendation is only useful if you can see how it was produced, what it ignores and where a human is accountable. This page documents the method behind every score, shortlist and plan."
        back={{ href: "/", label: "Back to Northstar" }}
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{INSTRUMENT_VERSION}</Badge>
        <Badge tone="outline">{TOTAL_ITEMS} items</Badge>
        <Badge tone="outline">~{totalMinutes} minutes</Badge>
        <Badge tone="outline">{COURSES.length} catalogue programmes</Badge>
        <Badge tone="outline">{CAREER_PATHS.length} career paths</Badge>
      </div>

      <Alert tone="guardrail" title="What this product does not do" className="mt-8">
        Northstar does not promise admission, placement, salary or visa outcomes.
        It is not a clinical or diagnostic instrument, and it is not a selection
        tool for employers or institutions. Every significant decision moves to a
        qualified counsellor.
      </Alert>

      <Section id="assessment" eyebrow="01 · Assessment" title="One battery, three lenses">
        <p>
          <strong>{INSTRUMENT_NAME}</strong> is an in-house guidance battery. It
          combines three short sections so a counsellor can see interests,
          reasoning practice and working style together rather than relying on a
          single self-report.
        </p>
        <div className="not-prose mt-5 grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((section) => (
            <div key={section.key} className="card-flat p-4">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-faint">
                {section.eyebrow}
              </p>
              <p className="mt-1 text-sm font-semibold text-content">
                {section.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {section.itemCount} items · {section.minutes} min
              </p>
            </div>
          ))}
        </div>
        <p>
          Interest items use the six RIASEC themes (Realistic, Investigative,
          Artistic, Social, Enterprising, Conventional). Aptitude items are
          practice-level numerical, verbal, logical and spatial questions with
          one correct answer. Working-style items cover five broad dimensions
          (openness, conscientiousness, extraversion, agreeableness and emotional
          stability), with reverse-scored statements to reduce agreement bias.
        </p>
        <p>
          Aptitude results are <strong>not</strong> population percentiles. They
          show how many practice items were answered correctly in each dimension
          and are useful for a conversation about preparation, not for ranking a
          learner against other learners.
        </p>
      </Section>

      <Section id="scoring" eyebrow="02 · Scoring" title="How the numbers are produced">
        <ul className="space-y-2">
          <li>
            <strong>Interest.</strong> Each RIASEC theme is normalised to 0–100
            from the answered Likert items. Unanswered items are excluded rather
            than counted as neutral, and a partially completed section is
            normalised against the items actually answered.
          </li>
          <li>
            <strong>Aptitude.</strong> Per-dimension score = correct ÷ items in
            that dimension. The overall score uses the full item set. Skipped
            questions score zero, so the screen rewards completion as well as
            accuracy.
          </li>
          <li>
            <strong>Working style.</strong> Reverse-scored items are inverted
            before averaging, then normalised to 0–100.
          </li>
          <li>
            <strong>Response quality.</strong> A transparency signal — not a
            validity scale — flags missing items, very low variation and
            unusually fast completion. It lowers confidence in the reading; it
            never silently changes a learner&apos;s scores.
          </li>
        </ul>
      </Section>

      <Section id="matching" eyebrow="03 · Matching" title="From scores to clusters and programmes">
        <p>
          The catalogue defines {CAREER_CLUSTERS.length} career clusters, each
          with an ideal interest shape and aptitude weights. Cluster fit uses the
          <strong> shape</strong> of the interest profile (Pearson correlation,
          centred at 50 so a flat profile reads as neutral), weighted aptitude
          and working-style alignment:
        </p>
        <div className="not-prose grid gap-3 sm:grid-cols-3">
          {[
            ["Interest pattern", "50%"],
            ["Aptitude alignment", "30%"],
            ["Working style", "20%"],
          ].map(([label, weight]) => (
            <div key={label} className="card-flat p-4">
              <p className="display text-2xl font-semibold text-brand">{weight}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        <p>
          Programme matches combine five factors: career fit (40%), eligibility
          (20%), budget (15%), stated preferences (15%) and catalogue outcome band
          (10%). The factors and their notes are stored on every shortlist row, so
          a learner can see why an option ranks where it does. The shortlist also
          spreads across clusters so it supports a real conversation instead of
          five near-identical rows.
        </p>
        <p>
          Eligibility is evaluated against the catalogue row: minimum percentage,
          required subjects, prior degree, backlog allowance and English-test
          threshold. Where a criterion cannot be confirmed, the status is{" "}
          <strong>conditional</strong> with a concrete next action — never a
          hidden rejection.
        </p>
      </Section>

      <Section id="plan" eyebrow="04 · Planning" title="A 12-month plan with evidence">
        <p>
          A plan is generated from the leading career path and the learner&apos;s
          stage. It contains ten dated milestones across four quarters, each with a
          description and a status. School and undergraduate learners get a
          route into study; working professionals get a route that does not assume
          a career break.
        </p>
        <p>
          Milestones are marked done only when evidence is recorded. The plan is
          activated when the report is released, and progress is reviewed each
          quarter. A missed review is itself a signal the counsellor records.
        </p>
      </Section>

      <Section id="checkpoint" eyebrow="05 · Human checkpoint" title="Nothing reaches the learner unreviewed">
        <p>
          An assessment produces a <strong>draft report in review</strong>. A
          counsellor reads the interpretation, the shortlist reasoning and the
          language, edits the narrative, writes a learner-facing note, then
          approves and releases it. If information is missing, the report is
          returned with a reason.
        </p>
        <div className="not-prose mt-4 flex flex-wrap items-center gap-2">
          {["Draft", "In review", "Approved", "Released"].map((stage, index) => (
            <span key={stage} className="flex items-center gap-2">
              <Badge tone={index === 3 ? "success" : index === 2 ? "brand" : "brass"}>
                {stage}
              </Badge>
              {index < 3 && <span className="text-faint">→</span>}
            </span>
          ))}
        </div>
        <p>
          A learner cannot read the report, download the PDF or open the plan until
          the release step. Verification codes let a third party confirm that a
          released version exists; they do not expose the report.
        </p>
      </Section>

      <Section id="advisor" eyebrow="06 · AI advisor" title="Tool-bound, guardrailed, not autonomous">
        <p>
          The advisor answers from the learner&apos;s own record and the course
          catalogue using tool calls for any specific fee, eligibility or pathway
          claim. It is instructed never to invent catalogue data and to say when a
          search returns nothing. A deterministic rule-based advisor is used when
          no model key is configured or the model is unavailable, so the product
          does not break.
        </p>
        <p>
          A server-side guardrail removes sentences that promise outcomes and adds
          a clear disclaimer. A separate crisis detector stops the career
          conversation and surfaces emergency contacts. Every redaction is written
          to the audit trail.
        </p>
        <ul className="space-y-2">
          <li>No outcome guarantees, hype or certainty claims.</li>
          <li>No invented courses, fees, institutions or statistics.</li>
          <li>No clinical, legal, immigration or financial advice.</li>
          <li>No access to another learner&apos;s data.</li>
        </ul>
      </Section>

      <Section id="licensing" eyebrow="07 · Licensing" title="Instruments are administered under licence">
        <p>
          The platform keeps a licence register for every psychometric instrument,
          including validity dates, seat counts and status. Administration is
          blocked when a licence is missing, expired, pending, suspended or out of
          seats — the check runs when an assessment starts, not only in the admin
          UI. The in-house battery is registered as a guidance instrument and is
          deliberately not described as clinical or selection-grade.
        </p>
        <p>
          Third-party instruments in the register are marked with their provider
          and licence reference. They are only usable once the deploying
          institution records a valid agreement.
        </p>
        <Link href="/privacy#licensing" className="font-medium text-content underline">
          Read how licensing and data processing are handled
        </Link>
      </Section>

      <Section id="limits" eyebrow="08 · Limits" title="Known limitations of this build">
        <ul className="space-y-2">
          <li>
            The catalogue is <strong>illustrative</strong> unless a record is
            marked licensed or institution-verified. Fees, criteria and outcome
            bands must be checked against current prospectuses.
          </li>
          <li>
            Outcome bands are deliberately coarse. No precise placement
            percentage or salary promise is claimed.
          </li>
          <li>
            The battery is a guidance screen. It is not normed against a national
            sample and must not be used for admission or hiring decisions.
          </li>
          <li>
            AI narrative quality depends on the configured model. The guardrail
            filter is a backstop, not a guarantee of factual accuracy — the
            counsellor remains the accountable reviewer.
          </li>
          <li>
            Salary bands in career maps are broad planning ranges, not offers.
          </li>
        </ul>
      </Section>

      <div className="mt-12 flex items-start gap-3 rounded-2xl border border-line bg-panel p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <p className="text-sm font-semibold text-content">
            Questions about the method?
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Contact WAECS at{" "}
            <a className="font-medium text-content underline" href="mailto:info@waecs.in">
              info@waecs.in
            </a>{" "}
            or{" "}
            <a className="font-medium text-content underline" href="tel:+918209628849">
              +91 82096 28849
            </a>
            . Version {INSTRUMENT_VERSION}.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2 text-[0.7rem] leading-5 text-faint">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          This page describes the reference implementation. Deploying
          institutions must confirm instruments, catalogue sources and policies
          before production use.
        </p>
      </div>
    </PublicPage>
  );
}
