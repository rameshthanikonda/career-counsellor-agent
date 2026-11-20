import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/card";
import { Badge, humanStatus } from "@/components/ui/badge";
import { formatDateTime, relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Audit trail" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "report", label: "Reports" },
  { key: "assessment", label: "Assessments" },
  { key: "shortlist", label: "Shortlists" },
  { key: "review", label: "Reviews" },
  { key: "licence", label: "Licences" },
  { key: "advisor", label: "Advisor" },
  { key: "instrument", label: "Instrument gate" },
];

function tone(action: string) {
  if (action.includes("blocked") || action.includes("expired") || action.includes("returned"))
    return "clay" as const;
  if (action.includes("released") || action.includes("approved") || action.includes("completed"))
    return "success" as const;
  if (action.includes("guardrail") || action.includes("saved")) return "brass" as const;
  return "neutral" as const;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const active = FILTERS.some((filter) => filter.key === params.entity)
    ? params.entity!
    : "all";

  const store = getStore();
  const events = await store.listAudit(300);
  const filtered =
    active === "all"
      ? events
      : events.filter((event) => {
          if (active === "instrument") return event.action.startsWith("instrument.");
          return event.entity === active;
        });

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        description="Every material action in the workspace, newest first. Entries are append-only in the application layer and include the actor, role, entity and structured metadata."
        back={{ href: "/admin", label: "Back to operations" }}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter.key === "all"
              ? events.length
              : events.filter((event) =>
                  filter.key === "instrument"
                    ? event.action.startsWith("instrument.")
                    : event.entity === filter.key
                ).length;
          return (
            <Link
              key={filter.key}
              href={filter.key === "all" ? "/admin/audit" : `/admin/audit?entity=${filter.key}`}
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

      <SectionCard
        title={`${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
        bodyClassName="p-0 sm:p-0"
      >
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ScrollText className="mx-auto h-5 w-5 text-faint" />
            <p className="mt-2 text-sm font-medium text-content">No events in this filter</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((event) => (
              <li key={event.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-content">
                        {humanStatus(event.action.replace(/\./g, " "))}
                      </p>
                      <Badge tone={tone(event.action)}>{event.entity}</Badge>
                      {event.entityId && (
                        <span className="font-mono text-[0.6rem] text-faint">
                          {event.entityId.slice(0, 16)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[0.65rem] text-muted">
                      {event.actorName} · {event.actorRole}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.62rem] text-faint">{relativeTime(event.createdAt)}</p>
                    <p className="text-[0.6rem] text-faint">{formatDateTime(event.createdAt)}</p>
                  </div>
                </div>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[0.62rem] font-medium text-faint hover:text-content">
                      Metadata
                    </summary>
                    <pre className="mt-1.5 overflow-x-auto rounded-lg bg-panel2/60 px-3 py-2 font-mono text-[0.6rem] leading-4 text-muted">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <p className="mt-4 text-[0.66rem] leading-5 text-faint">
        Showing the most recent 300 events. In production, ship these events to
        append-only storage with a retention policy; the local JSON store trims to
        2,000 entries.
      </p>
    </>
  );
}
