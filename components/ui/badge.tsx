import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "brand" | "clay" | "brass" | "slate" | "outline" | "success";

const tones: Record<Tone, string> = {
  neutral: "bg-panel2 text-muted border-line",
  brand: "bg-brandSoft text-brand border-brand/20",
  clay: "bg-clay-50 text-clay-700 border-clay-200 dark:bg-clay-900/30 dark:text-clay-200 dark:border-clay-700/40",
  brass:
    "bg-brass-50 text-brass-700 border-brass-200 dark:bg-brass-900/30 dark:text-brass-200 dark:border-brass-700/40",
  slate:
    "bg-slateblue-500/10 text-slateblue-600 border-slateblue-500/20 dark:text-slateblue-400",
  success:
    "bg-evergreen-50 text-evergreen-700 border-evergreen-200 dark:bg-evergreen-900/30 dark:text-evergreen-200 dark:border-evergreen-700/40",
  outline: "bg-transparent text-muted border-lineStrong",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium leading-5",
        tones[tone],
        className
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      )}
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "released":
    case "active":
    case "eligible":
    case "done":
      return "success";
    case "in_review":
    case "submitted":
    case "in_progress":
    case "conditional":
      return "brass";
    case "approved":
      return "brand";
    case "returned":
    case "expired":
    case "not_eligible":
    case "at_risk":
      return "clay";
    default:
      return "neutral";
  }
}

export function humanStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
