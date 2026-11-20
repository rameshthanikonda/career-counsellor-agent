"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Brand } from "@/components/brand";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Northstar route error", error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Brand />
        </div>
        <span className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-brass-500/10 text-brass-600 dark:text-brass-300">
          <TriangleAlert className="h-5 w-5" />
        </span>
        <p className="eyebrow mt-5">Something went wrong</p>
        <h1 className="display mt-2 text-2xl font-semibold tracking-tight text-content">
          The workspace could not finish that request.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          No learner data was changed by this error page. Try again; if it repeats,
          quote reference <span className="font-mono text-xs">{error.digest ?? "n/a"}</span>{" "}
          to the counselling team.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={reset} className={buttonClasses("primary", "md")}>
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link href="/" className={buttonClasses("secondary", "md")}>
            Back to Northstar
          </Link>
        </div>
      </div>
    </main>
  );
}
