import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import { buttonClasses } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Access denied",
};

export const dynamic = "force-dynamic";

const HOME_BY_ROLE = {
  learner: "/learner",
  counsellor: "/counsellor",
  admin: "/admin",
} as const;

export default async function ForbiddenPage() {
  const user = await getSessionUser();

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Brand />
        </div>
        <span className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-300">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <p className="eyebrow mt-5">403 · Access denied</p>
        <h1 className="display mt-2 text-2xl font-semibold tracking-tight text-content">
          This workspace is not yours.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {user
            ? `You are signed in as ${user.name} (${user.role}). This page belongs to a different role. Learner records are protected and are never shown across accounts.`
            : "Sign in with an account that has access to this page."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {user ? (
            <Link
              href={HOME_BY_ROLE[user.role]}
              className={buttonClasses("primary", "md")}
            >
              Go to your workspace
            </Link>
          ) : (
            <Link href="/login" className={buttonClasses("primary", "md")}>
              Sign in
            </Link>
          )}
          <Link href="/" className={buttonClasses("secondary", "md")}>
            Back to Northstar
          </Link>
        </div>
      </div>
    </main>
  );
}
