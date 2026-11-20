import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/roles";
import { DEMO_ACCOUNTS } from "@/lib/store/seed";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Sign in",
};

export const dynamic = "force-dynamic";

const assurances = [
  "Assessment results are reviewed by a qualified counsellor before release",
  "No placement, admission or salary outcomes are promised",
  "Licensed instruments only — expired licences are blocked",
  "Every report release is written to an audit trail",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; demo?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : undefined;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-900 px-10 py-12 text-paper lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute inset-0 opacity-[0.13] [background-image:radial-gradient(circle_at_20%_15%,white,transparent_40%),radial-gradient(circle_at_85%_80%,white,transparent_35%)]" />
        <div className="relative">
          <Link href="/" className="focus-ring inline-block rounded-md">
            <Brand invert />
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-[0.62rem] font-semibold uppercase tracking-eyebrow text-paper/45">
            Counselling workspace
          </p>
          <h1 className="display mt-3 text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-paper xl:text-[3rem]">
            The learner brings the questions. You bring the judgement.
          </h1>
          <p className="mt-4 text-[0.92rem] leading-7 text-paper/60">
            Northstar handles the assessment arithmetic, the catalogue search and
            the paperwork — so counselling time goes on the conversation that
            changes a decision.
          </p>
          <ul className="mt-8 space-y-3">
            {assurances.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[0.82rem] leading-6 text-paper/70">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brass-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-[0.68rem] text-paper/35">
          <span>© {new Date().getFullYear()} WAECS</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Human checkpoint enforced
          </span>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col bg-canvas">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted hover:text-content"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to site
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-[25rem]">
            <div className="mb-7 lg:hidden">
              <Brand />
            </div>
            <h2 className="display text-[1.9rem] font-semibold tracking-tight text-content">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Use a seeded demo account, or sign in with your institution email.
            </p>

            <div className="mt-7">
              <LoginForm accounts={DEMO_ACCOUNTS} next={next} />
            </div>

            <div className="mt-8 border-t border-line pt-5 text-[0.7rem] leading-5 text-faint">
              <p>
                By signing in you accept the{" "}
                <Link href="/privacy" className="underline hover:text-content">
                  privacy notice
                </Link>{" "}
                and the counselling disclaimer. Learner data is confidential and is
                processed only to deliver counselling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
