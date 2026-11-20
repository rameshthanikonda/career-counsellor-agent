import type { CareerPath } from "@/lib/types";
import type { ClusterFit } from "@/lib/catalogue/matching";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils/format";
import { CLUSTER_BY_ID } from "@/lib/catalogue/clusters";
import { ArrowUpRight, TrendingUp } from "lucide-react";

const ACCENT: Record<string, string> = {
  evergreen: "text-evergreen-600 dark:text-evergreen-300 bg-evergreen-500/10",
  clay: "text-clay-600 dark:text-clay-300 bg-clay-500/10",
  brass: "text-brass-700 dark:text-brass-300 bg-brass-500/12",
  slateblue: "text-slateblue-600 dark:text-slateblue-400 bg-slateblue-500/10",
  aubergine: "text-aubergine-500 dark:text-aubergine-400 bg-aubergine-500/10",
  olive: "text-olive-600 dark:text-olive-400 bg-olive-500/10",
};

export function CareerMap({
  paths,
}: {
  paths: { path: CareerPath; fit: ClusterFit }[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-muted">
        Career maps are planning templates, not predictions. Salary ranges are broad,
        indicative Indian-market ranges and should be validated against current,
        role-specific market data.
      </p>

      {paths.map(({ path, fit }, index) => {
        const cluster = CLUSTER_BY_ID[path.clusterId];
        const accent = ACCENT[cluster?.accent ?? "evergreen"] ?? ACCENT.evergreen;
        return (
          <details
            key={path.id}
            open={index === 0}
            className="group overflow-hidden rounded-2xl border border-line bg-panel"
          >
            <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 transition-colors hover:bg-panel2/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
                >
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-content">{path.title}</h3>
                    <Badge tone="outline">{cluster?.shortName ?? "Career"}</Badge>
                  </div>
                  <p className="mt-0.5 max-w-xl text-xs leading-5 text-muted">
                    {path.summary}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4 pl-13 sm:pl-0">
                <div className="text-right">
                  <p className="display text-xl font-semibold text-brand">{fit.score}</p>
                  <p className="text-[0.58rem] uppercase tracking-[0.1em] text-faint">fit</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-content">{path.demandIndex}</p>
                  <p className="text-[0.58rem] uppercase tracking-[0.1em] text-faint">
                    demand index
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-faint transition-transform group-open:rotate-90" />
              </div>
            </summary>

            <div className="border-t border-line px-5 py-5">
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="eyebrow mb-3">Progression map</p>
                  <ol className="relative space-y-4 border-l border-line pl-5">
                    {path.progression.map((stage) => (
                      <li key={stage.title} className="relative">
                        <span className="absolute -left-[1.42rem] top-1.5 h-2 w-2 rounded-full border border-brand bg-canvas" />
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-content">{stage.title}</p>
                          <p className="text-[0.65rem] text-faint">
                            {stage.yearsFrom}–{stage.yearsTo} yrs
                          </p>
                        </div>
                        <p className="mt-0.5 text-[0.7rem] font-medium text-brand">
                          {formatINR(stage.indicativeSalaryMinINR, { compact: true })} –{" "}
                          {formatINR(stage.indicativeSalaryMaxINR, { compact: true })}
                        </p>
                        <p className="mt-0.5 text-[0.68rem] leading-5 text-muted">
                          {stage.skills.join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="eyebrow mb-2">Entry roles</p>
                    <ul className="space-y-1.5">
                      {path.entryRoles.map((role) => (
                        <li key={role} className="flex items-start gap-1.5 text-xs text-muted">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                          {role}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow mb-2">Education routes</p>
                    <ul className="space-y-1.5">
                      {path.educationRoutes.map((route) => (
                        <li key={route} className="text-xs leading-5 text-muted">
                          {route}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow mb-2">Skills to build</p>
                    <div className="flex flex-wrap gap-1.5">
                      {path.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-line bg-panel2 px-2 py-0.5 text-[0.62rem] text-muted"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-panel2/50 px-3 py-2.5">
                <p className="text-[0.66rem] leading-5 text-muted">
                  <span className="font-semibold text-content">Market note.</span>{" "}
                  {path.demandNote} Salary ranges are indicative planning ranges, not
                  offers or guarantees.
                </p>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
