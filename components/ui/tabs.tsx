"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export function Tabs({
  items,
  defaultId,
  className,
  listClassName,
}: {
  items: TabItem[];
  defaultId?: string;
  className?: string;
  listClassName?: string;
}) {
  const [active, setActive] = useState(defaultId ?? items[0]?.id);
  const current = items.find((i) => i.id === active) ?? items[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Sections"
        className={cn(
          "no-scrollbar flex gap-1 overflow-x-auto border-b border-line",
          listClassName
        )}
      >
        {items.map((item) => {
          const selected = item.id === current?.id;
          return (
            <button
              key={item.id}
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              onClick={() => setActive(item.id)}
              className={cn(
                "focus-ring relative shrink-0 rounded-t-lg px-3.5 py-2.5 text-sm font-medium transition-colors sm:px-4",
                selected
                  ? "text-content"
                  : "text-muted hover:bg-panel2/60 hover:text-content"
              )}
            >
              <span className="inline-flex items-center gap-2">
                {item.label}
                {typeof item.count === "number" && (
                  <span className="rounded-full bg-panel2 px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-muted">
                    {item.count}
                  </span>
                )}
              </span>
              {selected && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>
      {current && (
        <div
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          className="animate-fade-in pt-5"
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
