import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { requireCounsellor } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { searchCourses } from "@/lib/catalogue/matching";
import { CAREER_CLUSTERS } from "@/lib/catalogue/clusters";
import type { Course } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/card";
import { Badge, humanStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { formatFeeRange, titleCase } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Catalogue" };
export const dynamic = "force-dynamic";

const OUTCOME_TONE: Record<Course["outcomes"]["placementBand"], "success" | "brand" | "brass" | "neutral"> = {
  high: "success",
  moderate: "brand",
  emerging: "brass",
  not_disclosed: "neutral",
};

export default async function CounsellorCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; cluster?: string }>;
}) {
  await requireCounsellor();
  const params = await searchParams;
  const store = getStore();
  const all = await store.listCourses();

  const levels: Course["level"][] = ["UG", "PG", "Diploma", "Certificate"];
  const level = levels.includes(params.level as Course["level"])
    ? (params.level as Course["level"])
    : undefined;
  const cluster = CAREER_CLUSTERS.some((entry) => entry.id === params.cluster)
    ? params.cluster
    : undefined;

  const rows = searchCourses(all, {
    query: params.q?.trim() || undefined,
    level,
    clusterId: cluster,
  }).sort((a, b) => a.title.localeCompare(b.title));

  const sourceCounts = rows.reduce<Record<string, number>>((acc, course) => {
    acc[course.dataSource] = (acc[course.dataSource] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Programmes and pathways"
        description="The evidence base behind every shortlist. Fees, eligibility and outcome bands are indicative catalogue data and must be verified with the institution before advising a learner."
      />

      <form
        method="get"
        action="/counsellor/catalogue"
        className="mb-5 rounded-2xl border border-line bg-panel p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label htmlFor="q" className="text-xs font-medium text-content">
              Search
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <Input
                id="q"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Programme, provider, skill or city"
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-[26rem]">
            <div>
              <label htmlFor="level" className="text-xs font-medium text-content">
                Level
              </label>
              <Select id="level" name="level" defaultValue={params.level ?? ""} className="mt-1">
                <option value="">All levels</option>
                {levels.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="cluster" className="text-xs font-medium text-content">
                Cluster
              </label>
              <Select id="cluster" name="cluster" defaultValue={params.cluster ?? ""} className="mt-1">
                <option value="">All clusters</option>
                {CAREER_CLUSTERS.slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">
              <SlidersHorizontal className="h-4 w-4" /> Apply
            </Button>
            <Link
              href="/counsellor/catalogue"
              className="inline-flex h-10 items-center rounded-xl border border-lineStrong px-4 text-sm font-medium text-muted hover:bg-panel2 hover:text-content"
            >
              Clear
            </Link>
          </div>
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {rows.length} of {all.length} programmes
          {params.q ? ` matching “${params.q}”` : ""}.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(sourceCounts).map(([source, count]) => (
            <Badge key={source} tone={source === "illustrative" ? "brass" : "success"}>
              {humanStatus(source)} · {count}
            </Badge>
          ))}
        </div>
      </div>

      <SectionCard bodyClassName="p-0 sm:p-0" title="Course records">
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-content">No programmes match those filters</p>
            <p className="mt-1 text-xs text-muted">Widen the search or clear a filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left">
              <thead className="bg-panel2/60">
                <tr>
                  {[
                    "Programme",
                    "Level",
                    "Fee range",
                    "Eligibility",
                    "Outcome band",
                    "Clusters",
                    "Source",
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
                {rows.map((course) => (
                  <tr key={course.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-content">{course.title}</p>
                      <p className="mt-0.5 text-[0.65rem] text-muted">
                        {course.provider} · {course.durationMonths} months ·{" "}
                        {course.modes.map(titleCase).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[0.7rem] text-muted">
                      {course.level}
                      <span className="block text-[0.6rem] text-faint">{course.discipline}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[0.7rem] text-muted">
                      {formatFeeRange(course.feeMinINR, course.feeMaxINR)}
                    </td>
                    <td className="px-4 py-3 text-[0.65rem] leading-4 text-muted">
                      <span className="block">
                        {course.eligibility.minPercentage !== undefined
                          ? `Min ${course.eligibility.minPercentage}%`
                          : "No percentage floor"}
                      </span>
                      <span className="block text-faint">
                        {course.eligibility.requiredSubjects.length
                          ? course.eligibility.requiredSubjects.join(", ")
                          : "No required subjects"}
                      </span>
                      {course.eligibility.englishRequirement && (
                        <span className="block text-faint">
                          {course.eligibility.englishRequirement}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={OUTCOME_TONE[course.outcomes.placementBand]}>
                        {humanStatus(course.outcomes.placementBand)}
                      </Badge>
                      <p className="mt-1 max-w-[13rem] text-[0.6rem] leading-4 text-faint">
                        {course.outcomes.outcomeNote}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[0.65rem] text-muted">
                      {course.clusterIds
                        .map(
                          (id) =>
                            CAREER_CLUSTERS.find((entry) => entry.id === id)?.shortName ?? id
                        )
                        .join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={course.dataSource === "illustrative" ? "brass" : "success"}>
                        {humanStatus(course.dataSource)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <p className="mt-4 text-[0.68rem] leading-5 text-muted">
        Illustrative records exist so the product can be evaluated without a
        licensed data feed. Replace them before production use; the admin
        workspace shows the same provenance flags.
      </p>
    </>
  );
}
