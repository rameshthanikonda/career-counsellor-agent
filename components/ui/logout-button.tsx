"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/button";

export function LogoutButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      aria-label="Sign out"
      title="Sign out"
      className={cn(
        "focus-ring inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted transition-colors hover:bg-panel2 hover:text-content disabled:opacity-50",
        className
      )}
    >
      {busy ? <Spinner className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
      {!compact && <span>Sign out</span>}
    </button>
  );
}

export function SignInLink({ next }: { next?: string }) {
  return (
    <Link
      href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
      className="focus-ring inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-medium text-brandContrast transition-colors hover:bg-brand/90"
    >
      Sign in
    </Link>
  );
}
