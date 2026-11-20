import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { OnboardingForm } from "@/components/learner/onboarding-form";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser(["learner"]);
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="focus-ring rounded-md">
            <Brand compact />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={learner?.onboardingCompletedAt ? "/learner" : "/login"}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-content"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {learner?.onboardingCompletedAt ? "Back to workspace" : "Back"}
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="container-page py-8 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow mb-2">
            {learner?.onboardingCompletedAt ? "Profile" : "Getting started"}
          </p>
          <h1 className="display text-[2rem] font-semibold tracking-tight text-content sm:text-[2.5rem]">
            {learner?.onboardingCompletedAt
              ? "Update your counselling profile."
              : "Let's set up your counselling profile."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-[0.95rem]">
            Four short steps. We ask only for what changes the advice: your stage,
            qualifications, budget and consent. You can update it later, and you can
            ask for a copy or deletion at any time.
          </p>
        </div>

        <OnboardingForm learner={learner} />
      </main>
    </div>
  );
}
