"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = notifications.filter((notification) => !notification.read).length;

  async function markAll() {
    setBusy(true);
    try {
      await fetch("/api/notifications/read", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-content">Inbox</p>
          <p className="text-xs text-muted">
            {unread ? `${unread} unread` : "Everything is read"}
          </p>
        </div>
        {unread > 0 && (
          <Button type="button" size="sm" variant="secondary" onClick={markAll} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <Bell className="mx-auto h-5 w-5 text-faint" />
          <p className="mt-2 text-sm font-semibold text-content">No notifications</p>
          <p className="mt-1 text-xs text-muted">
            Report releases, reviews and application updates will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {notifications.map((notification) => {
            const inner = (
              <div className={cn("px-5 py-4 transition-colors", !notification.read && "bg-brandSoft/30")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-content">{notification.title}</p>
                      {!notification.read && <Badge tone="brand">New</Badge>}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">{notification.body}</p>
                  </div>
                  <span className="text-[0.62rem] text-faint">
                    {relativeTime(notification.createdAt)}
                  </span>
                </div>
              </div>
            );
            return (
              <li key={notification.id}>
                {notification.href ? (
                  <Link href={notification.href} className="block hover:bg-panel2/40">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
