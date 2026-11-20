import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Database,
  KeyRound,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { licenceRegister } from "@/lib/services/licensing";
import { geminiConfig, geminiCircuitState } from "@/lib/ai/gemini";
import { isOpenApplication } from "@/lib/applications/checklist";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, Stat } from "@/components/ui/card";
import { Badge, humanStatus } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LicenceManager } from "@/components/admin/licence-manager";
import { HealthPanel } from "@/components/admin/health-panel";
import { formatDate, relativeTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

const ACTION_TONE = (action: string) => {
  if (action.includes("released") || action.includes("approved")) return "success" as const;
  if (action.includes("blocked") || action.includes("returned") || action.includes("expired"))
    return "clay" as const;
  if (action.includes("guardrail")) return "brass" as const;
  return "neutral" as const;
};

export default async function AdminPage() {
  await requireAdmin();
  const store = getStore();
  const [stats, licences, courses, paths, audit, applications] = await Promise.all([
    store.stats(),
    licenceRegister(),
    store.listCourses(),
    store.listCareerPaths(),
    store.listAudit(8),
    store.listApplications(),
  ]);

  const gemini = geminiConfig();
  const geminiCircuit = geminiCircuitState();
  const activeLicences = licences.filter((row) => row.usable).length;
  const blockedLicences = licences.filter((row) => !row.usable).length;
  const illustrative = courses.filter((course) => course.dataSource === "illustrative").length;
  const backend = (process.env.DATA_BACKEND ?? "file").toLowerCase();
  const openApplications = applications.filter(isOpenApplication).length;
  const offerApplications = applications.filter(
    (application) => application.status === "offer"
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Administrator workspace"
        title="Operations"
        description="Service health, instrument licensing, catalogue provenance and the audit trail. Learner data is managed in the counselling workspace."
        actions={
          <Link href="/admin/audit" className={buttonClasses("secondary", "md")}>
            <ScrollText className="h-4 w-4" /> Audit trail
          </Link>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Learners" value={stats.learners} hint="Records in the store" />
        <Stat
          label="Awaiting review"
          value={stats.reportsAwaitingReview}
          hint="Human checkpoint backlog"
        />
        <Stat
          label="Assessments complete"
          value={stats.assessmentsCompleted}
          hint="Scored batteries"
        />
        <Stat
          label="Applications"
          value={applications.length}
          hint={`${openApplications} open · ${offerApplications} offers`}
        />
        <Stat
          label="Satisfaction"
          value={stats.averageSatisfaction ? `${stats.averageSatisfaction}/5` : "—"}
          hint="Average learner rating"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <SectionCard
            eyebrow="Guardrail control"
            title="Instrument licensing"
            description="Administration is blocked unless a licence is active, in date and has seats remaining. The assessment API enforces this on every start."
            action={
              <Badge tone={blockedLicences > 0 ? "clay" : "success"} dot>
                {blockedLicences > 0 ? `${blockedLicences} blocked` : "All usable"}
              </Badge>
            }
          >
            {blockedLicences > 0 && (
              <Alert tone="warning" title="Some instruments cannot be administered" className="mb-4">
                Expired, pending or suspended licences stay in the register but the
                platform will refuse to start an assessment that depends on them.
                Renew or replace the agreement, then record it here.
              </Alert>
            )}
            <LicenceManager rows={licences} />
          </SectionCard>

          <SectionCard
            eyebrow="Recent activity"
            title="Audit trail"
            action={
              <Link
                href="/admin/audit"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-content"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            }
            bodyClassName="p-0 sm:p-0"
          >
            <ul className="divide-y divide-line">
              {audit.map((event) => (
                <li key={event.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-content">
                        {humanStatus(event.action.replace(/\./g, " "))}
                      </p>
                      <Badge tone={ACTION_TONE(event.action)}>{event.entity}</Badge>
                    </div>
                    <p className="mt-0.5 text-[0.65rem] text-muted">
                      {event.actorName} · {event.actorRole}
                      {typeof event.metadata?.learner === "string"
                        ? ` · ${event.metadata.learner}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-[0.62rem] text-faint">
                    {relativeTime(event.createdAt)}
                  </span>
                </li>
              ))}
              {audit.length === 0 && (
                <li className="px-5 py-8 text-center text-xs text-muted">
                  No audit events yet.
                </li>
              )}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard eyebrow="Environment" title="Runtime">
            <ul className="space-y-3">
              <li className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                  <Database className="h-3.5 w-3.5" /> Data backend
                </span>
                <Badge tone={backend === "supabase" ? "success" : "brass"}>
                  {backend === "supabase" ? "Supabase / Postgres" : "Local JSON file"}
                </Badge>
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                  <Sparkles className="h-3.5 w-3.5" /> AI advisor
                </span>
                <Badge tone={geminiCircuit.open ? "clay" : gemini.configured ? "brass" : "neutral"}>
                  {geminiCircuit.open
                    ? "Key rejected — fallback"
                    : gemini.configured
                      ? "Key configured — test it"
                      : "Rule-based fallback"}
                </Badge>
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                  <ShieldCheck className="h-3.5 w-3.5" /> Instruments usable
                </span>
                <span className="text-xs font-semibold text-content">
                  {activeLicences} / {licences.length}
                </span>
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                  <BookOpen className="h-3.5 w-3.5" /> Catalogue
                </span>
                <span className="text-xs font-semibold text-content">
                  {courses.length} programmes
                </span>
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                  <Activity className="h-3.5 w-3.5" /> Career paths
                </span>
                <span className="text-xs font-semibold text-content">
                  {paths.length} templates
                </span>
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                  <KeyRound className="h-3.5 w-3.5" /> Session security
                </span>
                <Badge tone="success">HMAC + HttpOnly</Badge>
              </li>
            </ul>
            <p className="mt-4 text-[0.65rem] leading-5 text-faint">
              Secrets are never rendered here. Configure the backend in{" "}
              <code className="font-mono">.env.local</code>; see{" "}
              <code className="font-mono">.env.example</code>.
            </p>
            <div className="mt-4 border-t border-line pt-4">
              <HealthPanel />
            </div>
          </SectionCard>

          <SectionCard eyebrow="Data provenance" title="Catalogue quality">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">Illustrative records</span>
                <Badge tone={illustrative > 0 ? "brass" : "success"}>
                  {illustrative} / {courses.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">Career path sources</span>
                <span className="text-xs font-semibold text-content">
                  {paths.filter((path) => path.source === "licensed").length} licensed ·{" "}
                  {paths.filter((path) => path.source === "illustrative").length} illustrative
                </span>
              </div>
            </div>
            {illustrative > 0 && (
              <Alert tone="warning" className="mt-4">
                Replace illustrative catalogue rows with licensed or
                institution-verified data before advising real learners. Record
                the last verification date on each course.
              </Alert>
            )}
            <Link
              href="/admin/catalogue"
              className={buttonClasses("secondary", "sm", "mt-4 w-full")}
            >
              Inspect catalogue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </SectionCard>

          <SectionCard eyebrow="People" title="Counselling team">
            <TeamCounts />
          </SectionCard>
        </div>
      </div>

      <p className="mt-5 text-[0.66rem] leading-5 text-faint">
        Last refresh {formatDate(new Date().toISOString(), { hour: "numeric", minute: "2-digit" })}. This
        page reads live store data; no figures are cached or fabricated.
      </p>
    </>
  );
}

async function TeamCounts() {
  const store = getStore();
  const users = await store.listUsers();
  const counsellors = users.filter((user) => user.role === "counsellor").length;
  const admins = users.filter((user) => user.role === "admin").length;
  const learners = users.filter((user) => user.role === "learner").length;
  return (
    <ul className="space-y-2.5">
      <li className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 text-muted">
          <Users className="h-3.5 w-3.5" /> Counsellors
        </span>
        <span className="font-semibold text-content">{counsellors}</span>
      </li>
      <li className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 text-muted">
          <ShieldCheck className="h-3.5 w-3.5" /> Administrators
        </span>
        <span className="font-semibold text-content">{admins}</span>
      </li>
      <li className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 text-muted">
          <Users className="h-3.5 w-3.5" /> Learner accounts
        </span>
        <span className="font-semibold text-content">{learners}</span>
      </li>
    </ul>
  );
}
