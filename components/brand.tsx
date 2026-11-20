import { cn } from "@/lib/utils/cn";

export function StarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={cn("h-8 w-8", className)}
    >
      <circle cx="20" cy="20" r="18.25" stroke="currentColor" strokeOpacity="0.28" />
      <path
        d="M20 4.5 23.4 16.6 35.5 20 23.4 23.4 20 35.5 16.6 23.4 4.5 20 16.6 16.6Z"
        fill="currentColor"
      />
      <circle cx="20" cy="20" r="2.4" fill="rgb(var(--canvas))" />
    </svg>
  );
}

export function Brand({
  compact = false,
  className,
  invert = false,
}: {
  compact?: boolean;
  className?: string;
  invert?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border",
          invert
            ? "border-white/25 text-paper"
            : "border-lineStrong/60 bg-panel text-brand"
        )}
      >
        <StarMark className="h-6 w-6" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "display text-[1.3rem] font-semibold tracking-tight",
            invert ? "text-paper" : "text-content"
          )}
        >
          Northstar
        </span>
        {!compact && (
          <span
            className={cn(
              "mt-1 text-[0.6rem] font-semibold uppercase tracking-eyebrow",
              invert ? "text-paper/60" : "text-faint"
            )}
          >
            Career Counsellor Agent
          </span>
        )}
      </span>
    </span>
  );
}
