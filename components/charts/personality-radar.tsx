import type { BigFive, PersonalityScores } from "@/lib/types";
import { BIG_FIVE_LABELS } from "@/lib/assessment/instruments";

const ORDER: BigFive[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "emotional_stability",
];

const SHORT: Record<BigFive, string> = {
  openness: "Open",
  conscientiousness: "Conscientious",
  extraversion: "Extraverted",
  agreeableness: "Agreeable",
  emotional_stability: "Stability",
};

export function PersonalityRadar({ scores }: { scores: PersonalityScores }) {
  const size = 240;
  const center = size / 2;
  const radius = 82;

  function point(index: number, value: number) {
    const angle = (Math.PI * 2 * index) / ORDER.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [center + Math.cos(angle) * r, center + Math.sin(angle) * r] as const;
  }

  const polygon = ORDER.map((key, index) => point(index, scores[key]).join(",")).join(" ");

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[240px_1fr]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto h-[220px] w-[220px] sm:h-[240px] sm:w-[240px]"
        role="img"
        aria-label="Work style radar chart"
      >
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={ORDER.map((_, index) => {
              const angle = (Math.PI * 2 * index) / ORDER.length - Math.PI / 2;
              return [
                center + Math.cos(angle) * radius * scale,
                center + Math.sin(angle) * radius * scale,
              ].join(",");
            }).join(" ")}
            fill="none"
            stroke="rgb(var(--chart-grid))"
            strokeWidth={1}
          />
        ))}
        {ORDER.map((_, index) => {
          const angle = (Math.PI * 2 * index) / ORDER.length - Math.PI / 2;
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={center + Math.cos(angle) * radius}
              y2={center + Math.sin(angle) * radius}
              stroke="rgb(var(--chart-grid))"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={polygon}
          fill="rgb(var(--chart-1) / 0.18)"
          stroke="rgb(var(--chart-1))"
          strokeWidth={2}
        />
        {ORDER.map((key, index) => {
          const [x, y] = point(index, scores[key]);
          return <circle key={key} cx={x} cy={y} r={3} fill="rgb(var(--chart-1))" />;
        })}
        {ORDER.map((key, index) => {
          const angle = (Math.PI * 2 * index) / ORDER.length - Math.PI / 2;
          const x = center + Math.cos(angle) * (radius + 20);
          const y = center + Math.sin(angle) * (radius + 20);
          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[rgb(var(--muted))] text-[8.5px]"
            >
              {SHORT[key]}
            </text>
          );
        })}
      </svg>

      <dl className="space-y-3">
        {ORDER.map((key) => (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-muted">{BIG_FIVE_LABELS[key].name}</dt>
              <dd className="tabular-nums text-xs font-semibold text-content">
                {scores[key]}
              </dd>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel2">
              <div
                className="h-full rounded-full bg-slateblue-500"
                style={{ width: `${scores[key]}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
