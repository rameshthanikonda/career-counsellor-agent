export function formatINR(value: number, opts: { compact?: boolean } = {}) {
  if (!Number.isFinite(value)) return "—";
  if (opts.compact) {
    if (value >= 10000000) return `₹${trim(value / 10000000)} Cr`;
    if (value >= 100000) return `₹${trim(value / 100000)} L`;
    if (value >= 1000) return `₹${trim(value / 1000)}k`;
    return `₹${Math.round(value)}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function trim(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatFeeRange(min: number, max: number) {
  if (min === max) return formatINR(min, { compact: true });
  return `${formatINR(min, { compact: true })} – ${formatINR(max, { compact: true })}`;
}

export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatDateTime(iso?: string) {
  return formatDate(iso, { hour: "numeric", minute: "2-digit" });
}

export function relativeTime(iso?: string) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

export function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function pluralise(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function isoMonthsFromNow(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}
