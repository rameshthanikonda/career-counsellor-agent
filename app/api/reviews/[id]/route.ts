import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { AuditEvent } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  learnerReflection: z.string().trim().max(2000),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "learner")
    return NextResponse.json({ error: "Learner access only" }, { status: 403 });

  const { id } = await params;
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  const review = await store.getReviewById(id);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (!learner || review.learnerId !== learner.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (review.completedAt) {
    return NextResponse.json(
      { error: "This review is complete. Add a new reflection at the next one." },
      { status: 409 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reflection" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = {
    ...review,
    learnerReflection: parsed.data.learnerReflection || undefined,
  };
  await store.saveReview(updated);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "learner",
    action: "review.reflection_added",
    entity: "review",
    entityId: review.id,
    metadata: { quarter: review.quarter, year: review.year },
    createdAt: now,
  } satisfies AuditEvent);

  return NextResponse.json({ ok: true, review: updated });
}
