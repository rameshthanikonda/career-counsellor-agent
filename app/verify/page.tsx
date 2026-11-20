import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileCheck2, ShieldCheck } from "lucide-react";
import { PublicPage } from "@/components/site/public-page";
import { PageHeader } from "@/components/ui/page-header";
import { VerifyForm } from "@/components/site/verify-form";
import { SectionCard } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Verify a report",
  description:
    "Confirm that a Northstar counselling report version exists in the counselling record.",
};

export default function VerifyIndexPage() {
  return (
    <PublicPage>
      <PageHeader
        eyebrow="Report verification"
        title="Verify a counselling report."
        description="Every released report carries a verification code. Enter it here to confirm that the version exists in the counselling record and to see its release status."
        back={{ href: "/", label: "Back to Northstar" }}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          eyebrow="Check a code"
          title="Enter the code from the report cover"
          description="Codes look like NS-2026-7K4Q and are case-insensitive."
        >
          <VerifyForm />
        </SectionCard>

        <div className="space-y-4">
          <div className="card p-5">
            <FileCheck2 className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">
              What verification proves
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              That a report with this code and version was produced by Northstar
              and is present in the counselling record, with its status and review
              dates.
            </p>
          </div>
          <div className="card p-5">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">
              What it does not prove
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              It does not confirm an admission, placement, salary or visa outcome,
              and it does not replace the institution&apos;s own checks.
            </p>
          </div>
          <div className="card p-5">
            <BadgeCheck className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">
              Need the full report?
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              The report itself is confidential and available only to the learner
              after release, or to counselling staff.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-block text-xs font-medium text-content underline"
            >
              Sign in to your workspace
            </Link>
          </div>
        </div>
      </div>

      <Alert tone="info" className="mt-6">
        Verification is a record check, not a quality stamp. Read the report&apos;s
        guardrail section and confirm all fees, eligibility and outcome figures
        with the institution before acting.
      </Alert>
    </PublicPage>
  );
}
