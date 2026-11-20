import { BadgeCheck, Check, ShieldCheck } from "lucide-react";

const bars = [
  { label: "Investigative", value: 88, tone: "bg-evergreen-500" },
  { label: "Conventional", value: 81, tone: "bg-slateblue-500" },
  { label: "Enterprising", value: 74, tone: "bg-brass-500" },
  { label: "Social", value: 61, tone: "bg-clay-500" },
  { label: "Realistic", value: 38, tone: "bg-olive-500" },
  { label: "Artistic", value: 33, tone: "bg-aubergine-500" },
];

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[27rem]">
      <div className="absolute -left-6 top-16 hidden rotate-[-4deg] rounded-xl border border-line bg-panel px-3.5 py-2.5 shadow-lift sm:block">
        <p className="text-[0.6rem] font-semibold uppercase tracking-eyebrow text-faint">
          Guardrail
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-content">
          <ShieldCheck className="h-3.5 w-3.5 text-clay-500" />
          No outcome promises
        </p>
      </div>

      <div className="card relative overflow-hidden shadow-lift">
        <div className="flex items-start justify-between gap-3 border-b border-line bg-panel2/40 px-5 py-4">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-eyebrow text-faint">
              Counselling report · v1
            </p>
            <p className="display mt-1 text-lg font-semibold text-content">
              Aarav Menon
            </p>
            <p className="text-[0.7rem] text-muted">B.Com (Hons) → PG analytics</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brandSoft px-2.5 py-1 text-[0.65rem] font-semibold text-brand">
            <Check className="h-3 w-3" /> Released
          </span>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-faint">
              Interest profile · RIASEC
            </p>
            <p className="display text-lg font-semibold text-content">ICE</p>
          </div>
          <div className="mt-3 space-y-2">
            {bars.map((bar) => (
              <div key={bar.label} className="flex items-center gap-2.5">
                <span className="w-[5.9rem] shrink-0 text-[0.68rem] text-muted">
                  {bar.label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
                  <div
                    className={`h-full rounded-full ${bar.tone}`}
                    style={{ width: `${bar.value}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[0.65rem] tabular-nums text-faint">
                  {bar.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-line px-5 py-4">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-panel2/60 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[0.6rem] uppercase tracking-eyebrow text-faint">
                Top fit
              </p>
              <p className="truncate text-xs font-medium text-content">
                Data, Computing & AI
              </p>
            </div>
            <span className="display text-xl font-semibold text-brand">82</span>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-dashed border-line pt-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brandSoft">
              <BadgeCheck className="h-3.5 w-3.5 text-brand" />
            </span>
            <p className="text-[0.68rem] leading-5 text-muted">
              Reviewed by{" "}
              <span className="font-medium text-content">Meera Iyer</span>, Senior
              Career Counsellor
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -right-3 hidden rotate-[3deg] rounded-xl border border-line bg-panel px-3.5 py-2.5 shadow-lift sm:block">
        <p className="text-[0.6rem] font-semibold uppercase tracking-eyebrow text-faint">
          Shortlist
        </p>
        <p className="mt-0.5 text-xs font-medium text-content">
          5 programmes · 3 criteria met
        </p>
      </div>
    </div>
  );
}
