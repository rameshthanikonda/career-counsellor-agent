import type { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, KeyValue } from "@/components/ui/card";
import { Badge, humanStatus } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Account settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const store = getStore();
  const notifications = await store.listNotifications(user.id);

  return (
    <AppShell user={user} notifications={notifications}>
      <PageHeader
        eyebrow="Account"
        title="Settings & security"
        description="Your account details, password, data rights and privacy controls. Learner profile data is edited from the counselling profile."
        actions={<Badge tone="outline">{humanStatus(user.role)}</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard eyebrow="Security" title="Change password">
          <ChangePasswordForm />
          <p className="mt-4 rounded-xl bg-panel2/50 px-3 py-2 text-[0.68rem] leading-5 text-muted">
            Changing your password increments your session generation, so other
            browsers signed into this account are signed out. This browser stays
            signed in.
          </p>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard eyebrow="Account" title="Your details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <KeyValue label="Name" value={user.name} />
              <KeyValue label="Email" value={user.email} />
              <KeyValue label="Role" value={humanStatus(user.role)} />
              <KeyValue label="Member since" value={formatDate(user.createdAt)} />
              <KeyValue
                label="Privacy notice"
                value={
                  user.privacyAcceptedAt
                    ? `Accepted v${user.privacyVersion ?? "—"} · ${formatDate(user.privacyAcceptedAt)}`
                    : "Accepted during onboarding"
                }
              />
              <KeyValue
                label="Last password change"
                value={user.passwordChangedAt ? formatDate(user.passwordChangedAt) : "Not recorded"}
              />
            </dl>
            {user.role === "learner" && (
              <Link
                href="/onboarding"
                className={buttonClasses("secondary", "md", "mt-4 w-full")}
              >
                <UserRound className="h-4 w-4" /> Edit counselling profile
              </Link>
            )}
          </SectionCard>

          <SectionCard eyebrow="Data rights" title="Your record">
            <div className="space-y-2">
              {user.role === "learner" && (
                <a href="/api/learner/export" className={buttonClasses("secondary", "sm", "w-full")}>
                  <Download className="h-3.5 w-3.5" /> Download my data
                </a>
              )}
              <Link href="/notifications" className={buttonClasses("ghost", "sm", "w-full")}>
                <KeyRound className="h-3.5 w-3.5" /> Notification history
              </Link>
              <Link href="/feedback" className={buttonClasses("ghost", "sm", "w-full")}>
                <MessageSquare className="h-3.5 w-3.5" /> Send product feedback
              </Link>
              <Link href="/privacy" className={buttonClasses("ghost", "sm", "w-full")}>
                <ShieldCheck className="h-3.5 w-3.5" /> Privacy notice
              </Link>
            </div>
            <p className="mt-3 text-[0.65rem] leading-5 text-faint">
              Deletion and correction requests are handled by the counselling
              team. Use Feedback with the category “Other” and state “account
              deletion”, or contact the team from the privacy notice.
            </p>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
