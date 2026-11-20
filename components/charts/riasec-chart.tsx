import type { RiasecScores } from "@/lib/types";
import { RIASEC_LABELS } from "@/lib/assessment/instruments";
import { cn } from "@/lib/utils/cn";

const ORDER = ["R", "I", "A", "S", "E", "C"] as const;

export function RiasecChart({
  scores,
  compact = false,
}: {
  scores: RiasecScores;
  compact?: boolean;
}) {
  const ranked = [...ORDER].sort((a, b) => scores[b] - scores[a]);
  const strongest = new Set(ranked.slice(0, 2));

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {ORDER.map((key) => (
        <div key={key} className="group">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "text-xs",
                strongest.has(key) ? "font-semibold text-content" : "text-muted"
              )}
            >
              {RIASEC_LABELS[key].name}
              <span className="ml-1.5 text-[0.62rem] text-faint">
                {RIASEC_LABELS[key].blurb}
              </span>
            </span>
            <span
              className={cn(
                "tabular-nums text-xs",
                strongest.has(key) ? "font-semibold text-brand" : "text-faint"
              )}
            >
              {scores[key]}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel2">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700",
                strongest.has(key) ? "bg-brand" : "bg-lineStrong/70"
              )}
              style={{ width: `${scores[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
