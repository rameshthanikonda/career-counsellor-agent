import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Database, Layers, Map, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { CAREER_CLUSTERS } from "@/lib/catalogue/clusters";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, Stat } from "@/components/ui/card";
import { Badge, humanStatus } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate, formatFeeRange, formatINR } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Catalogue provenance" };
export const dynamic = "force-dynamic";

export default async function AdminCataloguePage() {
  await requireAdmin();
  const store = getStore();
  const [courses, paths] = await Promise.all([
    store.listCourses(),
    store.listCareerPaths(),
  ]);

  const bySource = courses.reduce<Record<string, number>>((acc, course) => {
    acc[course.dataSource] = (acc[course.dataSource] ?? 0) + 1;
    return acc;
  }, {});
  const byLevel = courses.reduce<Record<string, number>>((acc, course) => {
    acc[course.level] = (acc[course.level] ?? 0) + 1;
    return acc;
  }, {});

  const avgFee = courses.length
    ? Math.round(
        courses.reduce((sum, course) => sum + (course.feeMinINR + course.feeMaxINR) / 2, 0) /
          courses.length
      )
    : 0;
  const countries = new Set(courses.flatMap((course) => course.countries));
  const missingEligibility = courses.filter(
    (course) => course.eligibility.minPercentage === undefined
  ).length;
  const illustrative = bySource.illustrative ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Data provenance"
        description="What the matching engine is allowed to recommend, and how trustworthy each record is. The platform never invents a programme; it can only surface what is in this catalogue."
        back={{ href: "/admin", label: "Back to operations" }}
        actions={
          <Link href="/counsellor/catalogue" className={buttonClasses("secondary", "md")}>
            Open searchable catalogue <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Programmes" value={courses.length} hint="Active catalogue rows" />
        <Stat
          label="Illustrative"
          value={illustrative}
          hint={illustrative > 0 ? "Must be replaced before production" : "All rows sourced"}
        />
        <Stat
          label="Average fee"
          value={formatINR(avgFee, { compact: true })}
          hint="Midpoint of each fee range"
        />
        <Stat label="Countries" value={countries.size} hint="Destination coverage" />
      </div>

      {illustrative > 0 && (
        <Alert tone="warning" title="Illustrative data is still in the catalogue" className="mb-5">
          {illustrative} of {courses.length} programmes are marked illustrative.
          This is expected in a reference build, but real counselling must use
          licensed or institution-verified rows, with a verification date and a
          named source.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard eyebrow="Coverage" title="By level">
          <ul className="space-y-2.5">
            {Object.entries(byLevel)
              .sort((a, b) => b[1] - a[1])
              .map(([level, count]) => (
                <li key={level} className="flex items-center justify-between text-xs">
                  <span className="text-muted">{level}</span>
                  <span className="font-semibold text-content">{count}</span>
                </li>
              ))}
          </ul>
        </SectionCard>

        <SectionCard eyebrow="Provenance" title="By source">
          <ul className="space-y-2.5">
            {Object.entries(bySource).map(([source, count]) => (
              <li key={source} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">{humanStatus(source)}</span>
                <Badge tone={source === "illustrative" ? "brass" : "success"}>{count}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.65rem] leading-5 text-faint">
            {missingEligibility} rows have no minimum-percentage rule. That is valid
            for some programmes, but the counsellor should still check the
            prospectus.
          </p>
        </SectionCard>

        <SectionCard eyebrow="Career paths" title="Templates">
          <ul className="space-y-2.5">
            <li className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Map className="h-3.5 w-3.5" /> Total paths
              </span>
              <span className="font-semibold text-content">{paths.length}</span>
            </li>
            <li className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <ShieldCheck className="h-3.5 w-3.5" /> Licensed
              </span>
              <span className="font-semibold text-content">
                {paths.filter((path) => path.source === "licensed").length}
              </span>
            </li>
            <li className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Layers className="h-3.5 w-3.5" /> Clusters
              </span>
              <span className="font-semibold text-content">{CAREER_CLUSTERS.length}</span>
            </li>
            <li className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Database className="h-3.5 w-3.5" /> Illustrative
              </span>
              <span className="font-semibold text-content">
                {paths.filter((path) => path.source === "illustrative").length}
              </span>
            </li>
          </ul>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5">
        <SectionCard
          eyebrow="Course records"
          title="Programme inventory"
          bodyClassName="p-0 sm:p-0"
        >
          <div className="max-h-[38rem] overflow-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead className="sticky top-0 z-10 bg-panel2">
                <tr>
                  {[
                    "Programme",
                    "Level",
                    "Fee range",
                    "Outcome",
                    "Source",
                    "Last verified",
                  ].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-faint"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {courses.map((course) => (
                  <tr key={course.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-content">{course.title}</p>
                      <p className="text-[0.62rem] text-muted">{course.provider}</p>
                    </td>
                    <td className="px-4 py-3 text-[0.68rem] text-muted">{course.level}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[0.68rem] text-muted">
                      {formatFeeRange(course.feeMinINR, course.feeMaxINR)}
                    </td>
                    <td className="px-4 py-3 text-[0.68rem] text-muted">
                      {humanStatus(course.outcomes.placementBand)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={course.dataSource === "illustrative" ? "brass" : "success"}>
                        {humanStatus(course.dataSource)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[0.66rem] text-muted">
                      {formatDate(course.outcomes.lastVerified)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Career maps"
          title="Path templates"
          bodyClassName="p-0 sm:p-0"
        >
          <div className="max-h-[26rem] overflow-auto">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="sticky top-0 z-10 bg-panel2">
                <tr>
                  {["Path", "Cluster", "Demand index", "Source"].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-faint"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paths.map((path) => (
                  <tr key={path.id}>
                    <td className="px-4 py-2.5 text-xs font-medium text-content">
                      {path.title}
                    </td>
                    <td className="px-4 py-2.5 text-[0.68rem] text-muted">
                      {CAREER_CLUSTERS.find((cluster) => cluster.id === path.clusterId)?.shortName ??
                        path.clusterId}
                    </td>
                    <td className="px-4 py-2.5 text-[0.68rem] text-muted">
                      {path.demandIndex}/100
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={path.source === "illustrative" ? "brass" : "success"}>
                        {humanStatus(path.source)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <p className="mt-4 text-[0.66rem] leading-5 text-faint">
        Catalogue rows are edited through the data pipeline / seed file in this
        build, not from the browser. A production deployment should add an
        ingestion job with source URLs, verification dates and a reviewer.
      </p>
    </>
  );
}
