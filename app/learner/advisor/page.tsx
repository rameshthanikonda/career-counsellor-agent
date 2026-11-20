import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brain, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { geminiConfig } from "@/lib/ai/gemini";
import { PageHeader } from "@/components/ui/page-header";
import { AdvisorChat } from "@/components/learner/advisor-chat";
import { SectionCard, KeyValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFeeRange, formatINR } from "@/lib/utils/format";

export const metadata: Metadata = { title: "AI advisor" };
export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) redirect("/onboarding");

  const [workspace, messages] = await Promise.all([
    getLearnerWorkspace(learner.id),
    store.listAdvisorMessages(learner.id),
  ]);
  const config = geminiConfig();
  const leading = workspace.fits[0];

  return (
    <>
      <PageHeader
        eyebrow="AI advisor"
        title="Think it through, out loud."
        description="The advisor can search the catalogue, compare options, explain your scores and build a route. It uses tools rather than memory for every fact, and it cannot override the guardrails."
        actions={
          <Badge tone={config.configured ? "brand" : "outline"} dot>
            {config.configured ? "Gemini tool use" : "Local rules mode"}
          </Badge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <AdvisorChat
          initialMessages={messages}
          learnerName={learner.fullName}
          provider={config.configured ? "gemini" : "rules"}
          model={config.model}
        />

        <div className="space-y-4">
          <SectionCard eyebrow="Your context" title="What the advisor sees">
            <dl className="space-y-3">
              <KeyValue
                label="Assessment"
                value={
                  workspace.assessment?.status === "completed"
                    ? `Complete · ${workspace.assessment.scores?.topInterestCode} profile`
                    : "Not complete"
                }
              />
              <KeyValue
                label="Leading cluster"
                value={leading ? `${leading.cluster.shortName} · ${leading.score}/100` : "Pending"}
              />
              <KeyValue
                label="Budget"
                value={`${formatINR(learner.budgetMinINR, { compact: true })} – ${formatINR(learner.budgetMaxINR, { compact: true })}`}
              />
              <KeyValue label="Destinations" value={learner.preferredCountries.join(", ")} />
              <KeyValue
                label="Shortlist"
                value={
                  workspace.shortlist.length
                    ? `${workspace.shortlist.length} programmes · from ${formatFeeRange(
                        workspace.shortlist[0].course.feeMinINR,
                        workspace.shortlist[0].course.feeMaxINR
                      )}`
                    : "Not created yet"
                }
              />
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-[0.65rem] leading-5 text-faint">
              The advisor only sees your own record. It cannot access other learners,
              and it cannot release a report.
            </p>
          </SectionCard>

          <SectionCard eyebrow="How it works" title="Tools, not guesses">
            <ul className="space-y-3">
              {[
                {
                  icon: Wrench,
                  title: "Catalogue search",
                  body: "Every programme, fee and eligibility claim comes from a tool call against the catalogue.",
                },
                {
                  icon: Brain,
                  title: "Your scores, explained",
                  body: "The advisor can read your assessment summary and map it to clusters — but it cannot change the scores.",
                },
                {
                  icon: ShieldCheck,
                  title: "Guardrails on output",
                  body: "Guarantee language is removed before it reaches you. Crisis language triggers immediate human-support guidance.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-xs font-semibold text-content">{item.title}</p>
                      <p className="mt-0.5 text-[0.7rem] leading-5 text-muted">{item.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <div className="rounded-2xl border border-line bg-panel p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-content">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> Prefer a human?
            </p>
            <p className="mt-1 text-[0.7rem] leading-5 text-muted">
              Your counsellor makes the final call on significant choices. Book time
              before you commit to a programme.
            </p>
            <Link
              href="/learner/reviews"
              className="mt-2 inline-block text-[0.7rem] font-medium text-brand underline underline-offset-4"
            >
              See review dates
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
