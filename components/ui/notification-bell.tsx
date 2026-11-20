"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function NotificationBell({
  notifications: initial,
}: {
  notifications: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/read", { method: "POST" });
    } catch {
      /* non-critical */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-panel2 hover:text-content"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[0.6rem] font-semibold leading-none text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[19rem] overflow-hidden rounded-2xl border border-line bg-panel shadow-lift sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-content">Notifications</p>
              <p className="text-xs text-muted">
                {unread ? `${unread} unread` : "All caught up"}
              </p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.7rem] font-medium text-brand hover:bg-brandSoft"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {items.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-muted">
                Nothing new right now.
              </li>
            )}
            {items.map((n) => {
              const inner = (
                <div
                  className={cn(
                    "rounded-xl px-3 py-2.5 transition-colors hover:bg-panel2",
                    !n.read && "bg-brandSoft/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[0.8rem] font-semibold leading-5 text-content">
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-muted">{n.body}</p>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link href={n.href} onClick={() => setOpen(false)} className="block">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[0.72rem] font-medium text-brand hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
