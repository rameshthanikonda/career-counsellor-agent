import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Brand } from "@/components/brand";
import { SignupForm } from "@/components/auth/signup-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Create your account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.02fr]">
      <aside className="relative hidden overflow-hidden bg-ink-900 px-10 py-12 text-paper lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute inset-0 opacity-[0.13] [background-image:radial-gradient(circle_at_20%_15%,white,transparent_40%),radial-gradient(circle_at_85%_80%,white,transparent_35%)]" />
        <div className="relative">
          <Link href="/" className="focus-ring inline-block rounded-md">
            <Brand />
          </Link>
        </div>
        <div className="relative max-w-md">
          <p className="text-[0.62rem] font-semibold uppercase tracking-eyebrow text-paper/45">
            Career Compass
          </p>
          <h1 className="display mt-3 text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-paper xl:text-[3rem]">
            A serious decision deserves a serious process.
          </h1>
          <p className="mt-4 text-[0.92rem] leading-7 text-paper/60">
            Assessment, evidence, a counsellor review and a plan you can act on.
            Your data stays confidential and nothing is released without human
            sign-off.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "80-item interest, aptitude and working-style battery",
              "Counsellor-reviewed report and shortlist",
              "12-month plan with quarterly reviews",
              "No placement, admission or salary promises",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-[0.82rem] leading-6 text-paper/70"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brass-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[0.65rem] text-paper/35">
          © {new Date().getFullYear()} WAECS · Human checkpoint enforced
        </p>
      </aside>

      <div className="flex min-h-dvh flex-col bg-canvas">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted hover:text-content"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-[27rem]">
            <div className="mb-7 lg:hidden">
              <Brand />
            </div>
            <h2 className="display text-[1.9rem] font-semibold tracking-tight text-content">
              Create your account
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Sign up as a learner. Staff accounts are provisioned by an
              administrator.
            </p>
            <div className="mt-7">
              <SignupForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
