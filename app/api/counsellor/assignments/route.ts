import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { AuditEvent } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  learnerId: z.string().min(1),
  counsellorId: z.string().min(1).nullable(),
});

/**
 * Assigns (or clears) the accountable counsellor for a learner. Any
 * counsellor or administrator can assign within the team; the learner and the
 * assigned counsellor are notified and the change is audited.
 */
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "counsellor" && user.role !== "admin") {
    return NextResponse.json({ error: "Counsellor access only" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid assignment." }, { status: 400 });
  }

  const store = getStore();
  const learner = await store.getLearnerById(parsed.data.learnerId);
  if (!learner) {
    return NextResponse.json({ error: "Learner not found." }, { status: 404 });
  }

  const target = parsed.data.counsellorId
    ? await store.getUserById(parsed.data.counsellorId)
    : null;
  if (parsed.data.counsellorId && (!target || (target.role !== "counsellor" && target.role !== "admin"))) {
    return NextResponse.json({ error: "Choose a counsellor or administrator." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = {
    ...learner,
    counsellorId: target?.id,
    updatedAt: now,
  };
  await store.saveLearner(updated);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: target ? "learner.counsellor_assigned" : "learner.counsellor_unassigned",
    entity: "learner",
    entityId: learner.id,
    metadata: {
      learner: learner.fullName,
      counsellor: target?.name ?? null,
    },
    createdAt: now,
  } satisfies AuditEvent);

  if (target) {
    await store.saveNotification({
      id: crypto.randomUUID(),
      userId: learner.userId,
      title: "A counsellor is assigned to you",
      body: `${target.name} is now your counsellor for reviews and report sign-off.`,
      href: "/learner",
      read: false,
      createdAt: now,
    });
    await store.saveNotification({
      id: crypto.randomUUID(),
      userId: target.id,
      title: "Learner assigned to you",
      body: `${learner.fullName} is now in your counselling caseload.`,
      href: `/counsellor/learner/${learner.id}`,
      read: false,
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true, learner: updated });
}
