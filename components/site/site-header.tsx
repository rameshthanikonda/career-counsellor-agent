"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "#workflow", label: "How it works" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#guardrails", label: "Guardrails" },
  { href: "#stack", label: "Architecture" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
        <Link href="/" className="focus-ring rounded-md" aria-label="Northstar home">
          <Brand />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.82rem] font-medium text-muted transition-colors hover:text-content"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link
            href="/login"
            className="focus-ring hidden h-9 items-center text-[0.8rem] font-medium text-muted transition-colors hover:text-content md:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="focus-ring hidden h-9 items-center rounded-full border border-lineStrong px-4 text-[0.8rem] font-medium text-content transition-colors hover:border-content/40 hover:bg-panel2 sm:inline-flex"
          >
            Create account
          </Link>
          <Link
            href="/login?demo=counsellor"
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[0.8rem] font-medium text-brandContrast transition-colors hover:bg-brand/90"
          >
            View the workspace
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-content md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-line bg-canvas md:hidden",
          open ? "max-h-96" : "max-h-0 border-t-0"
        )}
      >
        <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-muted hover:bg-panel2 hover:text-content"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-line pt-4">
            <Link
              href="/login"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-lineStrong text-sm font-medium text-content"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-brand text-sm font-medium text-brandContrast"
            >
              Create account
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
