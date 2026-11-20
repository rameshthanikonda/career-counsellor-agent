import type { ReactNode } from "react";
import { Info, CircleAlert, ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "info" | "warning" | "guardrail" | "success";

const config: Record<
  Tone,
  { classes: string; icon: typeof Info; iconClass: string }
> = {
  info: {
    classes:
      "border-slateblue-500/25 bg-slateblue-500/[0.07] text-content",
    icon: Info,
    iconClass: "text-slateblue-500",
  },
  warning: {
    classes: "border-brass-500/30 bg-brass-500/[0.08] text-content",
    icon: CircleAlert,
    iconClass: "text-brass-600 dark:text-brass-300",
  },
  guardrail: {
    classes: "border-clay-500/25 bg-clay-500/[0.06] text-content",
    icon: ShieldCheck,
    iconClass: "text-clay-600 dark:text-clay-300",
  },
  success: {
    classes: "border-brand/25 bg-brandSoft text-content",
    icon: CheckCircle2,
    iconClass: "text-brand",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { classes, icon: Icon, iconClass } = config[tone];
  return (
    <div
      className={cn("flex gap-3 rounded-xl border px-4 py-3.5 text-sm", classes, className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden />
      <div className="min-w-0 leading-6">
        {title && <p className="mb-0.5 font-semibold text-content">{title}</p>}
        <div className="text-muted [&_a]:font-medium [&_a]:text-content [&_a]:underline">
          {children}
        </div>
      </div>
    </div>
  );
}
