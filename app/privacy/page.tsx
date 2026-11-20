import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Mail, Phone, ShieldCheck } from "lucide-react";
import { PublicPage } from "@/components/site/public-page";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { INSTRUMENT_VERSION } from "@/lib/assessment/instruments";
import { PRIVACY_VERSION } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "What learner data Northstar processes, why, who can see it, how long it is kept and how instrument licensing is enforced.",
};

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="display text-xl font-semibold tracking-tight text-content">
        {title}
      </h2>
      <div className="prose-northstar mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <PublicPage>
      <PageHeader
        eyebrow="Trust"
        title="Privacy notice."
        description="Counselling requires trust. This notice explains what the platform records, who can see it and what learners can ask for. It is written to match how this build actually behaves."
        back={{ href: "/", label: "Back to Northstar" }}
      />

      <Alert tone="info" title="Reference notice" className="mt-4">
        This is an engineering reference notice for a pilot deployment, not legal
        advice. A deploying institution must have its own counsel review and
        localise it for the jurisdictions it serves.
      </Alert>

      <Section title="Who is responsible">
        <p>
          Northstar is a career counselling workspace operated by WAECS. For
          questions about this notice or a learner&apos;s data, contact{" "}
          <a className="font-medium text-content underline" href="mailto:info@waecs.in">
            info@waecs.in
          </a>{" "}
          or{" "}
          <a className="font-medium text-content underline" href="tel:+918209628849">
            +91 82096 28849
          </a>
          .
        </p>
      </Section>

      <Section title="What we record">
        <ul className="space-y-2">
          <li>
            <strong>Account data:</strong> name, email, password hash (scrypt),
            role and sign-in timestamps.
          </li>
          <li>
            <strong>Profile data:</strong> stage of study or work, city and
            country, current qualification, institution, percentage or CGPA,
            subjects, backlogs, English-test type and score, work experience,
            target intake, budget range, preferred countries and modes, interest
            areas, career goal, intended cluster, and — optionally — date of birth
            and phone.
          </li>
          <li>
            <strong>Assessment data:</strong> item-level responses, section timings,
            scores, response-quality flags and instrument version.
          </li>
          <li>
            <strong>Counselling records:</strong> shortlist rows, plans and
            milestones, report versions and narratives, counsellor notes, learner
            notes, quarterly review records and satisfaction ratings.
          </li>
          <li>
            <strong>Application records:</strong> programmes tracked, deadlines,
            document-checklist status, submission and decision dates, and your
            notes.
          </li>
          <li>
            <strong>Operational records:</strong> advisor messages, audit events,
            notifications and licence usage counts.
          </li>
        </ul>
        <p>
          Date of birth is used only to determine whether guardian consent is
          required. It is not used in matching.
        </p>
      </Section>

      <Section title="Why we process it">
        <ul className="space-y-2">
          <li>
            To deliver career counselling: score the assessment, produce a
            shortlist and plan, and support the counsellor&apos;s review.
          </li>
          <li>
            To keep the service safe and accountable: authentication, rate
            limiting, audit trails, licence enforcement and abuse prevention.
          </li>
          <li>
            To improve the service through aggregate satisfaction and quality
            signals.
          </li>
        </ul>
        <p>
          Consent is recorded at onboarding with a version string. Learners under
          18 must also have guardian consent recorded before a profile can be
          saved.
        </p>
      </Section>

      <Section id="licensing" title="Instrument licensing">
        <p>
          Psychometric instruments are administered only under a valid licence.
          The platform keeps a register with provider, licence reference,
          validity dates, seat count and status. The assessment API checks the
          licence before administration and blocks it when the licence is
          missing, expired, pending, suspended or out of seats.
        </p>
        <p>
          A learner can ask a counsellor which instrument was used and its
          licence status. Third-party instruments are never administered under a
          lapsed agreement, even if historical records exist.
        </p>
      </Section>

      <Section title="Who can see it">
        <ul className="space-y-2">
          <li>
            <strong>The learner</strong> can see their own profile, released
            report, shortlist and plan. Scores and the report stay hidden until a
            counsellor releases them.
          </li>
          <li>
            <strong>Counsellors and administrators</strong> can see learner
            records in their workspace to carry out review, planning and support.
          </li>
          <li>
            <strong>Other learners</strong> cannot see another learner&apos;s data;
            advisor tools only ever return the signed-in learner&apos;s context.
          </li>
        </ul>
        <p>
          Every record change that matters — onboarding, assessment submission,
          report approval, release, shortlist changes, review completion and
          licence updates — is written to an audit trail with actor and timestamp.
        </p>
      </Section>

      <Section title="AI processing">
        <p>
          When a model key is configured, advisor messages and a compact summary
          of the signed-in learner&apos;s context are sent to the configured model
          provider to generate a reply. The advisor does not receive other
          learners&apos; data. If no key is configured, or the provider is
          unavailable, a deterministic rule-based advisor runs locally instead.
        </p>
        <p>
          Model output is filtered by a server-side guardrail before it is shown
          or stored. Redactions are audited. A deploying institution should review
          its provider&apos;s data-processing terms before enabling a model in
          production.
        </p>
      </Section>

      <Section id="retention" title="Retention and deletion">
        <p>
          This reference build does not auto-delete records: they persist in the
          configured store until an administrator removes them. That is a
          deployment decision, not a retention policy. A production deployment
          must set a retention schedule, including the treatment of assessment
          responses and reports after counselling ends.
        </p>
        <p>
          Learners can ask for a copy of their record, correct profile details
          from the profile form, withdraw consent, or request deletion through
          their counsellor or the contact above. Deletion requests are handled by
          an administrator and recorded in the audit trail.
        </p>
      </Section>

      <Section title="Security controls in this build">
        <ul className="space-y-2">
          <li>Passwords are hashed with scrypt and a per-user salt.</li>
          <li>
            Sessions use an HMAC-signed, HttpOnly, SameSite=Lax cookie with a
            seven-day expiry; the secret is generated and stored outside the
            repository when not supplied by environment.
          </li>
          <li>
            The Postgres adapter uses the service-role key only on the server, with
            row-level security enabled and no anon policies.
          </li>
          <li>
            Advisor and assessment endpoints are rate limited. Security headers are
            set globally.
          </li>
          <li>
            The PDF download route enforces role and ownership, and a learner can
            only download a report after release.
          </li>
        </ul>
      </Section>

      <Section title="Your choices">
        <p>
          You can download a machine-readable copy of your record from the
          Applications page (“My data”) or the learner overview. It includes your
          profile, assessment, reports, shortlist, plan, applications, reviews and
          advisor messages, but not internal staff notes or password hashes.
        </p>
        <p>
          You can ask what data is held about you, request a correction, withdraw
          consent, or ask for deletion. You can also ask which instruments were
          administered and under which licence. If you are unhappy with a
          response, raise it with the WAECS counselling lead using the contact
          details above.
        </p>
      </Section>

      <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel p-5 text-sm">
        <ShieldCheck className="h-5 w-5 text-brand" />
        <span className="font-medium text-content">Related policies</span>
        <Link href="/methodology" className="text-muted underline hover:text-content">
          Assessment method and limits
        </Link>
        <Link href="/methodology#licensing" className="text-muted underline hover:text-content">
          Instrument licensing method
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:gap-6">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" /> info@waecs.in
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" /> +91 82096 28849
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" /> Privacy version {PRIVACY_VERSION} · Instrument {INSTRUMENT_VERSION}
        </span>
      </div>
    </PublicPage>
  );
}
