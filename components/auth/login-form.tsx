"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Button, Spinner } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

export interface DemoAccount {
  role: "learner" | "counsellor" | "admin";
  name: string;
  email: string;
  password: string;
  blurb: string;
}

export function LoginForm({
  accounts,
  next,
}: {
  accounts: DemoAccount[];
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function signIn(credentials: { email: string; password: string }, marker: string) {
    setBusy(marker);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "We could not sign you in. Check your details.");
        return;
      }
      router.push(next || data.redirect || "/learner");
      router.refresh();
    } catch {
      setError("The server could not be reached. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="w-full">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void signIn({ email, password }, "form");
        }}
      >
        <Field label="Email" htmlFor="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@institution.edu"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </Field>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-clay-500/30 bg-clay-500/[0.08] px-3.5 py-2.5 text-xs leading-5 text-clay-700 dark:text-clay-200"
          >
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
          {busy === "form" ? <Spinner /> : null}
          Sign in
          {busy !== "form" && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-faint">
          Demo accounts
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-2">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            disabled={busy !== null}
            onClick={() =>
              signIn({ email: account.email, password: account.password }, account.role)
            }
            className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-line bg-panel px-3.5 py-3 text-left transition-colors hover:border-lineStrong hover:bg-panel2 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brandSoft text-[0.65rem] font-semibold uppercase text-brand">
              {account.role.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-content">{account.name}</span>
                <Badge tone="outline" className="hidden sm:inline-flex">
                  {account.role}
                </Badge>
              </span>
              <span className="mt-0.5 block truncate text-[0.72rem] text-muted">
                {account.blurb}
              </span>
            </span>
            {busy === account.role ? (
              <Spinner className="h-4 w-4 text-brand" />
            ) : (
              <ArrowRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-content" />
            )}
          </button>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-content underline">
          Create a learner account
        </Link>
      </p>

      <p className="mt-3 text-center text-[0.68rem] leading-5 text-faint">
        The accounts below are seeded demo accounts. New learner accounts are
        created through sign-up and go through the same onboarding.
      </p>
    </div>
  );
}
