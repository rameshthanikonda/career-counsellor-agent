export interface IcsEvent {
  uid: string;
  start: string;
  end?: string;
  allDay?: boolean;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  /** Adds a display alarm this many days before the event. */
  alarmDaysBefore?: number;
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateOnly(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}`;
}

function utcStamp(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return `${dateOnly(iso)}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(
    value.getUTCSeconds()
  )}Z`;
}

function nextDay(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  value.setUTCDate(value.getUTCDate() + 1);
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(
    value.getUTCDate()
  )}`;
}

/** RFC 5545 line folding at 75 octets (approximated by characters). */
function fold(line: string) {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = rest.slice(74);
  }
  parts.push(rest);
  return `${parts[0]}\r\n ${parts.slice(1).join("\r\n ")}`;
}

/**
 * Builds a standards-compliant iCalendar feed. Deterministic for a given set
 * of events; used for milestone, review and application-deadline exports.
 */
export function buildIcs(
  events: IcsEvent[],
  options: { calendarName?: string; prodId?: string; now?: Date } = {}
): string {
  const now = options.now ?? new Date();
  const stamp = utcStamp(now.toISOString()) ?? "19700101T000000Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${options.prodId ?? "WAECS Northstar//Career counselling//EN"}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.calendarName ?? "Northstar plan")}`,
  ];

  for (const event of events) {
    const start = event.allDay ? dateOnly(event.start) : utcStamp(event.start);
    if (!start) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeText(event.uid)}`);
    lines.push(`DTSTAMP:${stamp}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${start}`);
      const end = event.end ? dateOnly(event.end) : nextDay(event.start);
      if (end) lines.push(`DTEND;VALUE=DATE:${end}`);
    } else {
      lines.push(`DTSTART:${start}`);
      const end = event.end
        ? utcStamp(event.end)
        : utcStamp(new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString());
      if (end) lines.push(`DTEND:${end}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.url) lines.push(`URL:${escapeText(event.url)}`);
    if (event.alarmDaysBefore !== undefined) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeText(`${event.title} is due soon`)}`);
      lines.push(`TRIGGER:-P${Math.max(0, Math.round(event.alarmDaysBefore))}D`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
