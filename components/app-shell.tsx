"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Library,
  ListChecks,
  Map,
  Menu,
  MessageSquare,
  ScrollText,
  Settings,
  Settings2,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { Notification, PublicUser, Role } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/ui/notification-bell";
import { LogoutButton } from "@/components/ui/logout-button";
import { Avatar } from "@/components/ui/page-header";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const NAV: Record<Role, { primary: NavItem[]; secondary?: NavItem[] }> = {
  learner: {
    primary: [
      { href: "/learner", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/learner/assessment", label: "Assessment", icon: ClipboardList },
      { href: "/learner/results", label: "Results & report", icon: FileText },
      { href: "/learner/plan", label: "12-month plan", icon: Map },
      { href: "/learner/applications", label: "Applications", icon: ListChecks },
      { href: "/learner/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/learner/advisor", label: "AI advisor", icon: Sparkles },
      { href: "/learner/reviews", label: "Reviews", icon: CalendarCheck },
      { href: "/onboarding", label: "Profile & consent", icon: UserRound },
    ],
  },
  counsellor: {
    primary: [
      { href: "/counsellor", label: "Review queue", icon: Users, exact: true },
      { href: "/counsellor/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/counsellor/catalogue", label: "Catalogue", icon: Library },
    ],
  },
  admin: {
    primary: [
      { href: "/admin", label: "Operations", icon: Settings2, exact: true },
      { href: "/admin/catalogue", label: "Catalogue", icon: Library },
      { href: "/admin/audit", label: "Audit trail", icon: ScrollText },
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
      { href: "/counsellor/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/counsellor", label: "Review queue", icon: Users },
    ],
  },
};

const ROLE_LABEL: Record<Role, string> = {
  learner: "Learner",
  counsellor: "Counsellor",
  admin: "Administrator",
};

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppShell({
  user,
  notifications,
  children,
}: {
  user: PublicUser;
  notifications: Notification[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const nav = NAV[user.role];

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href={`/${user.role === "learner" ? "learner" : user.role === "admin" ? "admin" : "counsellor"}`} className="focus-ring rounded-md">
          <Brand compact />
        </Link>
        <button
          type="button"
          onClick={() => setDrawer(false)}
          className="focus-ring rounded-md p-1.5 text-muted hover:bg-panel2 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3">
        <div className="rounded-xl border border-line bg-panel/70 px-3 py-2.5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-eyebrow text-faint">
            Workspace
          </p>
          <p className="mt-0.5 text-sm font-medium text-content">
            {ROLE_LABEL[user.role]}
          </p>
        </div>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3" aria-label="Primary">
        <p className="px-3 pb-2 text-[0.6rem] font-semibold uppercase tracking-eyebrow text-faint">
          {user.role === "learner" ? "Your journey" : "Counselling"}
        </p>
        <ul className="space-y-0.5">
          {nav.primary.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brandSoft text-brand"
                      : "text-muted hover:bg-panel2 hover:text-content"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-brand" : "text-faint group-hover:text-content"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-5 h-px bg-line" />
        <p className="px-3 pb-2 text-[0.6rem] font-semibold uppercase tracking-eyebrow text-faint">
          Standards
        </p>
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/methodology"
              className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-panel2 hover:text-content"
            >
              <ScrollText className="h-4 w-4 text-faint" />
              Method & limits
            </Link>
          </li>
          <li>
            <Link
              href="/feedback"
              className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-panel2 hover:text-content"
            >
              <MessageSquare className="h-4 w-4 text-faint" />
              Feedback
            </Link>
          </li>
          <li>
            <Link
              href="/settings"
              className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-panel2 hover:text-content"
            >
              <Settings className="h-4 w-4 text-faint" />
              Settings
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-panel2 hover:text-content"
            >
              <FileText className="h-4 w-4 text-faint" />
              Privacy
            </Link>
          </li>
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8rem] font-semibold text-content">{user.name}</p>
            <p className="truncate text-[0.68rem] text-muted">{user.email}</p>
          </div>
          <LogoutButton compact />
        </div>
        <p className="px-2 pt-1.5 text-[0.6rem] leading-4 text-faint">
          Northstar by WAECS · v1.0
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-canvas lg:block">
        {sidebar}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawer(false)}
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 w-[17.5rem] max-w-[85vw] animate-fade-in border-r border-line bg-canvas shadow-lift">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                aria-label="Open navigation"
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-panel2 hover:text-content lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <Link href="/" className="lg:hidden">
                <Brand compact />
              </Link>
              <div className="hidden lg:block">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-faint">
                  WAECS · Enterprise career counselling
                </p>
                <p className="text-sm font-medium text-content">
                  {ROLE_LABEL[user.role]} workspace
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell notifications={notifications} />
              <div className="hidden h-6 w-px bg-line sm:block" />
              <Link
                href={user.role === "learner" ? "/learner" : user.role === "admin" ? "/admin" : "/counsellor"}
                className="focus-ring hidden items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-panel2 sm:flex"
                aria-label="Your profile"
              >
                <Avatar name={user.name} size="sm" />
                <span className="max-w-[9rem] truncate text-xs font-medium text-content">
                  {user.name.split(" ")[0]}
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <footer className="border-t border-line px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 text-[0.68rem] text-faint sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} WAECS. Confidential learner data — handle with care.</p>
            <p>Guidance only. No placement, admission or salary is guaranteed.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
