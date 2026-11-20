"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type CalendarEventType = "milestone" | "review" | "application";

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: CalendarEventType;
  description?: string;
}

const TYPE_STYLE: Record<
  CalendarEventType,
  { dot: string; chip: string; label: string }
> = {
  milestone: {
    dot: "bg-brand",
    chip: "bg-brandSoft text-brand border-brand/20",
    label: "Milestone",
  },
  review: {
    dot: "bg-slateblue-500",
    chip: "bg-slateblue-500/10 text-slateblue-600 border-slateblue-500/20",
    label: "Review",
  },
  application: {
    dot: "bg-brass-500",
    chip: "bg-brass-50 text-brass-700 border-brass-200 dark:bg-brass-900/30 dark:text-brass-200",
    label: "Application",
  },
};

function dayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDay(iso: string) {
  // All planner events are date-based; use the calendar date, not the UTC
  // instant, so a deadline does not move a day across time zones.
  return iso.slice(0, 10);
}

function buildMonth(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  const weekday = (first.getDay() + 6) % 7; // Monday-first
  start.setDate(first.getDate() - weekday);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function CalendarView({
  events,
  learnerName,
}: {
  events: CalendarEvent[];
  learnerName: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => dayKey(today));

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = parseIsoDay(event.date);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return map;
  }, [events]);

  const days = useMemo(() => buildMonth(month), [month]);
  const selectedEvents = byDay.get(selected) ?? [];
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(month);

  function shift(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  function goToday() {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(dayKey(today));
  }

  const upcoming = events
    .filter((event) => parseIsoDay(event.date) >= dayKey(today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            <h2 className="display text-lg font-semibold text-content">{monthLabel}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={goToday}>
              Today
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-line bg-panel2/40">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="px-1 py-2 text-center text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-faint"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((date) => {
            const key = dayKey(date);
            const inMonth = date.getMonth() === month.getMonth();
            const isToday = key === dayKey(today);
            const isSelected = key === selected;
            const dayEvents = byDay.get(key) ?? [];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={`${date.toDateString()}, ${dayEvents.length} event(s)`}
                aria-pressed={isSelected}
                className={cn(
                  "focus-ring min-h-[5.2rem] border-b border-r border-line p-1.5 text-left align-top transition-colors last:border-r-0 sm:min-h-[6.4rem] sm:p-2",
                  !inMonth && "bg-panel2/20 text-faint",
                  isSelected ? "bg-brandSoft/70" : "hover:bg-panel2/50"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.68rem]",
                    isToday
                      ? "bg-brand text-brandContrast font-semibold"
                      : inMonth
                        ? "text-content"
                        : "text-faint"
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span
                      key={event.id}
                      className={cn(
                        "block truncate rounded px-1 py-0.5 text-[0.56rem] leading-4",
                        TYPE_STYLE[event.type].chip
                      )}
                    >
                      {event.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="block px-1 text-[0.55rem] text-faint">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-3 text-[0.62rem] text-muted">
          {(Object.keys(TYPE_STYLE) as CalendarEventType[]).map((type) => (
            <span key={type} className="inline-flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_STYLE[type].dot)} />
              {TYPE_STYLE[type].label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <p className="eyebrow">Selected day</p>
          <h3 className="display mt-1 text-lg font-semibold text-content">
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(`${selected}T12:00:00`))}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing scheduled on this day.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {selectedEvents.map((event) => (
                <li key={event.id} className="rounded-xl border border-line bg-panel2/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-content">{event.title}</p>
                    <Badge tone="outline">{TYPE_STYLE[event.type].label}</Badge>
                  </div>
                  {event.description && (
                    <p className="mt-1 text-[0.68rem] leading-5 text-muted">
                      {event.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="eyebrow">Next up</p>
              <p className="mt-1 text-sm font-semibold text-content">
                {learnerName.split(" ")[0]}&apos;s next five
              </p>
            </div>
            <a href="/api/calendar" className={buttonClasses("secondary", "sm")}>
              <Download className="h-3.5 w-3.5" /> .ics
            </a>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-xs text-muted">No upcoming events.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.map((event) => (
                <li key={event.id} className="flex items-start gap-2">
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", TYPE_STYLE[event.type].dot)} />
                  <div className="min-w-0">
                    <p className="truncate text-[0.72rem] font-medium text-content">{event.title}</p>
                    <p className="text-[0.62rem] text-faint">
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(`${parseIsoDay(event.date)}T12:00:00`))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid gap-2">
            <Link href="/learner/plan" className={buttonClasses("ghost", "sm", "w-full")}>
              Open 12-month plan
            </Link>
            <Link href="/learner/applications" className={buttonClasses("ghost", "sm", "w-full")}>
              Open applications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
