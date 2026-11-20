"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { PRIVACY_VERSION } from "@/lib/legal/versions";

function strength(password: string) {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => strength(password), [password]);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    if (!acceptPrivacy || !acceptTerms) {
      setError("You must accept the privacy notice and counselling terms.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          acceptPrivacy,
          acceptTerms,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not create your account.");
        return;
      }
      router.push(data.redirect ?? "/onboarding");
      router.refresh();
    } catch {
      setError("The server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert tone="warning">{error}</Alert>}

      <Field label="Full name" htmlFor="name">
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          placeholder="As it should appear on your reports"
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 10 characters, including a letter and a number."
      >
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={10}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-content"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={
                step <= score
                  ? "h-1 flex-1 rounded-full bg-brand"
                  : "h-1 flex-1 rounded-full bg-panel2"
              }
            />
          ))}
        </div>
        <p className="mt-1 text-[0.65rem] text-faint">
          {password.length === 0
            ? "Use a passphrase you do not use elsewhere."
            : score <= 1
              ? "Weak — add length, numbers and a symbol."
              : score === 2
                ? "Fair — a longer passphrase is safer."
                : score === 3
                  ? "Good password."
                  : "Strong password."}
        </p>
      </Field>

      <Field label="Confirm password" htmlFor="confirm" error={mismatch ? "Passwords do not match." : undefined}>
        <Input
          id="confirm"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>

      <div className="space-y-3 rounded-xl border border-line bg-panel2/40 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(event) => setAcceptPrivacy(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
          />
          <span>
            I have read and accept the{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-content underline">
              privacy notice
            </Link>{" "}
            (version {PRIVACY_VERSION}), including how my assessment and counselling
            data are processed.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
          />
          <span>
            I accept the{" "}
            <Link href="/methodology" target="_blank" className="font-medium text-content underline">
              counselling terms and limits
            </Link>
            : guidance only, no guarantee of admission, placement, salary or visa.
          </span>
        </label>
      </div>

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Create account
        {!busy && <ArrowRight className="h-4 w-4" />}
      </Button>

      <p className="text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-content underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
