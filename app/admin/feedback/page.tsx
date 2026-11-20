import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import type { FeedbackStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, Stat } from "@/components/ui/card";
import { FeedbackTable } from "@/components/admin/feedback-table";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Feedback triage" };
export const dynamic = "force-dynamic";

const FILTERS: { key: FeedbackStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "reviewing", label: "Reviewing" },
  { key: "resolved", label: "Resolved" },
];

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const active = FILTERS.some((filter) => filter.key === params.status)
    ? (params.status as FeedbackStatus | "all")
    : "all";

  const store = getStore();
  const all = await store.listFeedback();
  const items = active === "all" ? all : all.filter((item) => item.status === active);

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Feedback triage"
        description="Product feedback from learners and staff. Each status change is audited. Counselling concerns should still go through the learner's counsellor."
        back={{ href: "/admin", label: "Back to operations" }}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Total" value={all.length} hint="All feedback received" />
        <Stat
          label="Open"
          value={all.filter((item) => item.status === "open").length}
          hint="Not yet triaged"
        />
        <Stat
          label="Resolved"
          value={all.filter((item) => item.status === "resolved").length}
          hint="Closed by the team"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter.key === "all"
              ? all.length
              : all.filter((item) => item.status === filter.key).length;
          return (
            <Link
              key={filter.key}
              href={filter.key === "all" ? "/admin/feedback" : `/admin/feedback?status=${filter.key}`}
              className={cn(
                "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active === filter.key
                  ? "border-brand bg-brandSoft text-brand"
                  : "border-line bg-panel text-muted hover:text-content"
              )}
            >
              {filter.label}
              <span className="rounded-full bg-panel2 px-1.5 text-[0.62rem] tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <SectionCard bodyClassName="p-0 sm:p-0" title={`${items.length} item${items.length === 1 ? "" : "s"}`}>
        <FeedbackTable items={items} />
      </SectionCard>

      <div className="mt-4 flex items-start gap-2 text-[0.66rem] leading-5 text-faint">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Feedback may contain sensitive learner context. Do not copy it into
          public channels; resolve it in the workspace and record decisions in
          the audit trail.
        </p>
      </div>
    </>
  );
}
