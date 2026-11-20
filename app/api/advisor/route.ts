import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { runAdvisor } from "@/lib/ai/advisor";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { AdvisorMessage, AuditEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  message: z.string().trim().min(1, "Write a question first.").max(1200),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "learner")
    return NextResponse.json({ error: "Learner access only" }, { status: 403 });

  const limit = checkRateLimit(`advisor:${user.id}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "You are sending messages quickly. Give me a moment to catch up." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid message." },
      { status: 400 }
    );
  }

  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) {
    return NextResponse.json(
      { error: "Complete your profile before using the advisor." },
      { status: 409 }
    );
  }

  const history = await store.listAdvisorMessages(learner.id);
  const now = new Date().toISOString();
  const userMessage: AdvisorMessage = {
    id: crypto.randomUUID(),
    learnerId: learner.id,
    role: "user",
    content: parsed.data.message,
    createdAt: now,
  };
  await store.appendAdvisorMessage(userMessage);

  let reply;
  try {
    reply = await runAdvisor({
      learner,
      message: parsed.data.message,
      history: history.slice(-8),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "The advisor could not answer just now. Your message is saved; please try again.",
        detail:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }

  const assistantMessage: AdvisorMessage = {
    id: crypto.randomUUID(),
    learnerId: learner.id,
    role: "assistant",
    content: reply.text,
    createdAt: new Date().toISOString(),
    toolCalls: reply.toolCalls,
    model: reply.model,
    guardrail: reply.guardrail,
  };
  await store.appendAdvisorMessage(assistantMessage);

  if (reply.guardrail.redacted) {
    await store.appendAudit({
      id: crypto.randomUUID(),
      actorId: user.id,
      actorName: user.name,
      actorRole: "learner",
      action: "advisor.guardrail_triggered",
      entity: "advisor_message",
      entityId: assistantMessage.id,
      metadata: { reasons: reply.guardrail.reasons, provider: reply.provider },
      createdAt: assistantMessage.createdAt,
    } satisfies AuditEvent);
  }

  return NextResponse.json({
    ok: true,
    message: assistantMessage,
    provider: reply.provider,
    fallbackReason: reply.fallbackReason ?? null,
  });
}
