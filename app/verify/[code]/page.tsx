import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleAlert, ShieldCheck } from "lucide-react";
import { PublicPage } from "@/components/site/public-page";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, humanStatus, statusTone } from "@/components/ui/badge";
import { VerifyForm } from "@/components/site/verify-form";
import { buttonClasses } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { getStore } from "@/lib/store";
import type { Report } from "@/lib/types";

export const metadata: Metadata = {
  title: "Verification result",
  description: "Check the status of a Northstar counselling report.",
};

export const dynamic = "force-dynamic";

function maskName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Learner";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-line py-3 last:border-0">
      <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-faint">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-content">{value}</dd>
    </div>
  );
}

export default async function VerifyCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    // A malformed escape sequence should produce "not found", not a 500.
  }
  const normalised = decoded.trim().toUpperCase();
  const store = getStore();
  const report: Report | null = await store.getReportByCode(normalised);
  const learner = report ? await store.getLearnerById(report.learnerId) : null;
  const counsellor =
    report?.counsellorId ? await store.getUserById(report.counsellorId) : null;
  const assessment = learner ? await store.getAssessmentByLearner(learner.id) : null;

  if (!report || !learner) {
    return (
      <PublicPage>
        <PageHeader
          eyebrow="Verification"
          title="No report found for that code."
          description="Check the code on the report cover. Codes are printed as NS-YYYY-XXXX and are not case-sensitive."
          back={{ href: "/verify", label: "Try another code" }}
        />
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay-600 dark:text-clay-300" />
            <div>
              <p className="text-sm font-semibold text-content">
                We could not match <span className="font-mono">{normalised || "an empty code"}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                A report that has never been generated will not verify. If you
                believe the code is correct, contact the counselling team quoting
                it.
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <VerifyForm initialCode={normalised} />
          </div>
        </div>
      </PublicPage>
    );
  }

  const released = report.status === "released";

  return (
    <PublicPage>
      <PageHeader
        eyebrow="Verification"
        title={released ? "Report verified." : "Report found — not yet released."}
        description={
          released
            ? "This code matches a released counselling report version in the record."
            : "This code exists in the counselling record, but the report has not been released to the learner. Treat any copy as a draft."
        }
        actions={
          <Badge tone={statusTone(report.status)} dot>
            {humanStatus(report.status)}
          </Badge>
        }
        back={{ href: "/verify", label: "Verify another code" }}
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line bg-panel2/40 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brandSoft text-brand">
              {released ? <BadgeCheck className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-content">
                {released ? "Authentic released version" : "Draft or in-review version"}
              </p>
              <p className="text-xs text-muted">
                Code <span className="font-mono">{report.verificationCode}</span>
              </p>
            </div>
          </div>
          <dl className="px-5 py-2">
            <Detail label="Prepared for" value={maskName(learner.fullName)} />
            <Detail label="Report version" value={`v${report.version}`} />
            <Detail label="Status" value={humanStatus(report.status)} />
            <Detail
              label="Counsellor"
              value={counsellor?.name ?? "Pending assignment"}
            />
            <Detail label="Reviewed" value={formatDate(report.reviewedAt)} />
            <Detail label="Released" value={formatDate(report.releasedAt)} />
            <Detail
              label="Instrument version"
              value={assessment?.instrumentVersion ?? "Not recorded"}
            />
          </dl>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-sm font-semibold text-content">What this confirms</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted">
              <li>• The report version exists in the counselling record.</li>
              <li>• It was produced for the learner shown.</li>
              <li>• Its review and release dates are as displayed.</li>
            </ul>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold text-content">What it cannot confirm</p>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              Any admission, placement, salary or visa outcome. Always verify fees
              and criteria directly with the institution.
            </p>
          </div>
          <Link href="/methodology" className={buttonClasses("secondary", "md", "w-full")}>
            Read the method and limits
          </Link>
        </div>
      </div>
    </PublicPage>
  );
}
