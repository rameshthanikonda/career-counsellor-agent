"use client";

import { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  GitCompareArrows,
  Info,
  MapPin,
  Monitor,
} from "lucide-react";
import type { ShortlistItemView } from "@/lib/types";
import { Badge, humanStatus, statusTone } from "@/components/ui/badge";
import { formatFeeRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const OUTCOME_LABEL: Record<string, string> = {
  high: "Strong",
  moderate: "Moderate",
  emerging: "Emerging",
  not_disclosed: "Not disclosed",
};

export function ShortlistCompare({ items }: { items: ShortlistItemView[] }) {
  const [selected, setSelected] = useState<string[]>(
    items.slice(0, 3).map((item) => item.id)
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  const chosen = selected
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ShortlistItemView => Boolean(item));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-panel2/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-content">
              <GitCompareArrows className="h-4 w-4 text-brand" />
              Compare side by side
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Choose up to three programmes. Fees and outcomes are indicative and must
              be verified.
            </p>
          </div>
          <span className="text-[0.68rem] font-medium text-faint">
            {chosen.length} of 3 selected
          </span>
        </div>

        {chosen.length >= 2 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-panel">
            <table className="w-full min-w-[42rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line">
                  <th className="w-36 px-4 py-3 font-medium text-faint">Criterion</th>
                  {chosen.map((item) => (
                    <th key={item.id} className="px-4 py-3 align-bottom">
                      <span className="block text-[0.6rem] font-medium uppercase tracking-[0.1em] text-faint">
                        Rank {item.rank}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold leading-5 text-content">
                        {item.course.title}
                      </span>
                      <span className="block text-[0.65rem] font-normal text-muted">
                        {item.course.provider}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <Row label="Fit score" cells={chosen.map((i) => (
                  <span className="display text-lg font-semibold text-brand">{i.fitScore}</span>
                ))} />
                <Row label="Eligibility" cells={chosen.map((i) => (
                  <Badge tone={statusTone(i.eligibility.status)} dot>
                    {humanStatus(i.eligibility.status)}
                  </Badge>
                ))} />
                <Row label="Indicative fees" cells={chosen.map((i) => (
                  <span className="font-medium text-content">
                    {formatFeeRange(i.course.feeMinINR, i.course.feeMaxINR)}
                  </span>
                ))} />
                <Row label="Duration" cells={chosen.map((i) => `${i.course.durationMonths} months`)} />
                <Row label="Level" cells={chosen.map((i) => i.course.level)} />
                <Row label="Mode" cells={chosen.map((i) => humanStatus(i.course.modes.join(", ")))} />
                <Row label="Country" cells={chosen.map((i) => i.course.countries.join(", "))} />
                <Row label="Outcome band" cells={chosen.map((i) => OUTCOME_LABEL[i.course.outcomes.placementBand])} />
                <Row label="Accreditation" cells={chosen.map((i) => i.course.accreditation)} />
                <Row
                  label="Data source"
                  cells={chosen.map((i) => (
                    <span className="capitalize text-muted">{i.course.dataSource.replace("_", " ")}</span>
                  ))}
                />
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
            Select at least two programmes to compare them.
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const active = selected.includes(item.id);
          return (
            <li key={item.id}>
              <article
                className={cn(
                  "rounded-2xl border bg-panel transition-colors",
                  active ? "border-brand/40" : "border-line"
                )}
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-3 sm:flex-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={active}
                      aria-label={`Compare ${item.course.title}`}
                      onClick={() => toggle(item.id)}
                      className={cn(
                        "focus-ring mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[0.6rem] font-bold transition-colors",
                        active
                          ? "border-brand bg-brand text-brandContrast"
                          : "border-lineStrong bg-panel text-transparent hover:border-brand"
                      )}
                    >
                      ✓
                    </button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="display text-[0.7rem] font-semibold tabular-nums text-faint">
                          {String(item.rank).padStart(2, "0")}
                        </span>
                        <h3 className="text-sm font-semibold leading-5 text-content">
                          {item.course.title}
                        </h3>
                        <Badge tone={statusTone(item.eligibility.status)}>
                          {humanStatus(item.eligibility.status)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {item.course.provider} · {item.course.level} ·{" "}
                        {item.course.durationMonths} months
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted">{item.rationale}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-faint">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.course.locations.join(", ")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {item.course.modes.map(humanStatus).join(", ")}
                        </span>
                        {item.course.url && (
                          <a
                            href={item.course.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 font-medium text-content hover:underline"
                          >
                            Institution <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-52 sm:text-right">
                    <div>
                      <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">Fit</p>
                      <p className="display text-2xl font-semibold text-brand">{item.fitScore}</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] uppercase tracking-[0.1em] text-faint">
                        Fees
                      </p>
                      <p className="mt-1 text-xs font-medium text-content">
                        {formatFeeRange(item.course.feeMinINR, item.course.feeMaxINR)}
                      </p>
                      <p className="text-[0.6rem] text-faint">total programme</p>
                    </div>
                  </div>
                </div>

                <details className="group border-t border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-xs font-medium text-muted transition-colors hover:text-content">
                    <span className="inline-flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Why this score?
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-3 border-t border-line px-5 py-4">
                    {item.factors.map((factor) => (
                      <div key={factor.label}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[0.7rem] font-medium text-content">
                            {factor.label}
                            <span className="ml-1.5 font-normal text-faint">
                              {Math.round(factor.weight * 100)}% weight
                            </span>
                          </span>
                          <span className="text-[0.7rem] tabular-nums text-muted">
                            {Math.round(factor.score)}
                          </span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-panel2">
                          <div
                            className="h-full rounded-full bg-brand/70"
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[0.68rem] leading-5 text-muted">{factor.note}</p>
                      </div>
                    ))}
                    <div className="rounded-lg bg-panel2/50 p-3">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-faint">
                        Eligibility detail
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {item.eligibility.messages.map((message) => (
                          <li key={message} className="text-[0.7rem] leading-5 text-muted">
                            {message}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-[0.65rem] leading-5 text-faint">
                      {item.course.outcomes.outcomeNote} Outcome data last verified{" "}
                      {item.course.outcomes.lastVerified}. Always confirm with the
                      institution.
                    </p>
                  </div>
                </details>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr>
      <th scope="row" className="bg-panel2/40 px-4 py-3 font-medium text-muted">
        {label}
      </th>
      {cells.map((cell, index) => (
        <td key={index} className="px-4 py-3 text-content">
          {cell}
        </td>
      ))}
    </tr>
  );
}
