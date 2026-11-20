import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { AuditEvent } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  status: z
    .enum(["pending", "in_progress", "done", "at_risk"])
    .optional(),
  evidence: z.string().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string; milestoneId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { planId, milestoneId } = await params;
  const store = getStore();
  const plan = await store.getPlanById(planId);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  const milestone = (await store.listMilestones(planId)).find(
    (m) => m.id === milestoneId
  );
  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  if (user.role === "learner") {
    const learner = await store.getLearnerByUserId(user.id);
    if (!learner || learner.id !== plan.learnerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const report = await store.getReportByLearner(learner.id);
    if (report?.status !== "released") {
      return NextResponse.json(
        { error: "Your plan unlocks when the report is released." },
        { status: 409 }
      );
    }
  } else if (user.role !== "counsellor" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const next = {
    ...milestone,
    status: parsed.data.status ?? milestone.status,
    evidence:
      parsed.data.evidence !== undefined ? parsed.data.evidence || undefined : milestone.evidence,
  };
  if (next.status === "done" && milestone.status !== "done") {
    next.completedAt = now;
  }
  if (next.status !== "done") {
    next.completedAt = undefined;
  }

  await store.saveMilestone(next);
  await store.savePlan({ ...plan, updatedAt: now });

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "milestone.updated",
    entity: "milestone",
    entityId: milestone.id,
    metadata: {
      planId,
      learnerId: plan.learnerId,
      status: next.status,
      statusChanged: next.status !== milestone.status,
    },
    createdAt: now,
  } satisfies AuditEvent);

  return NextResponse.json({ ok: true, milestone: next });
}
