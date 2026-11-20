import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { SectionCard } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Feedback" };
export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await requireUser();
  const store = getStore();
  const notifications = await store.listNotifications(user.id);

  return (
    <AppShell user={user} notifications={notifications}>
      <PageHeader
        eyebrow="Product feedback"
        title="Tell us what is not working."
        description="Bug reports, missing features, confusing screens and content corrections go straight to the team that maintains Northstar. Every item is triaged and tracked."
        back={{ href: "/", label: "Back to site" }}
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <SectionCard eyebrow="Send feedback" title="What should we fix?">
          <FeedbackForm />
        </SectionCard>

        <div className="space-y-4">
          <div className="card p-5">
            <MessageSquare className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">What happens next</p>
            <ol className="mt-2 space-y-2 text-xs leading-5 text-muted">
              <li>1. The item is stored with your role and page.</li>
              <li>2. An administrator triages it: open, reviewing, resolved.</li>
              <li>3. The status change is written to the audit trail.</li>
            </ol>
          </div>

          <div className="card p-5">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <p className="mt-2 text-sm font-semibold text-content">Not for urgent counselling</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              If you are in crisis, use the emergency contacts in the advisor or
              contact your counsellor directly. This form is not monitored 24/7.
            </p>
          </div>

          <Link href="/privacy" className={buttonClasses("secondary", "sm", "w-full")}>
            How feedback data is handled
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
