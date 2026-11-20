import type { AptitudeScores } from "@/lib/types";
import { APTITUDE_LABELS } from "@/lib/assessment/instruments";
import { cn } from "@/lib/utils/cn";

const DIMENSIONS = ["numerical", "verbal", "logical", "spatial"] as const;

export function AptitudeChart({ scores }: { scores: AptitudeScores }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 rounded-xl border border-line bg-panel2/40 p-4">
        <div>
          <p className="eyebrow">Overall reasoning</p>
          <p className="display mt-1 text-3xl font-semibold text-content">
            {scores.overall}
            <span className="ml-1 text-sm font-normal text-faint">/ 100</span>
          </p>
        </div>
        <p className="max-w-[11rem] text-right text-[0.68rem] leading-5 text-muted">
          A practice-level screen, not a standardised selection test.
        </p>
      </div>

      <div className="space-y-3">
        {DIMENSIONS.map((dim) => (
          <div key={dim}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">{APTITUDE_LABELS[dim]}</span>
              <span className="tabular-nums text-xs font-medium text-content">
                {scores[dim]}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel2">
              <div
                className={cn(
                  "h-full rounded-full",
                  scores[dim] >= 67
                    ? "bg-evergreen-500"
                    : scores[dim] >= 40
                      ? "bg-brass-500"
                      : "bg-clay-500"
                )}
                style={{ width: `${scores[dim]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
