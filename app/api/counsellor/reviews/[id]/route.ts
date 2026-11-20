import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { AuditEvent } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  complete: z.boolean(),
  progressRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(2000).optional(),
  nextSteps: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "counsellor" && user.role !== "admin") {
    return NextResponse.json({ error: "Counsellor access only" }, { status: 403 });
  }

  const { id } = await params;
  const store = getStore();
  const review = await store.getReviewById(id);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  const learner = await store.getLearnerById(review.learnerId);
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review update" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = {
    ...review,
    progressRating: parsed.data.progressRating ?? review.progressRating,
    notes: parsed.data.notes ?? review.notes,
    nextSteps: parsed.data.nextSteps ?? review.nextSteps,
    counsellorId: user.id,
    completedAt: parsed.data.complete ? now : undefined,
  };
  await store.saveReview(updated);

  if (parsed.data.complete) {
    await store.appendAudit({
      id: crypto.randomUUID(),
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "review.completed",
      entity: "review",
      entityId: review.id,
      metadata: {
        learner: learner.fullName,
        rating: updated.progressRating ?? null,
      },
      createdAt: now,
    } satisfies AuditEvent);

    await store.saveNotification({
      id: crypto.randomUUID(),
      userId: learner.userId,
      title: "Quarterly review complete",
      body: "Your counsellor has recorded the review notes and agreed next steps.",
      href: "/learner/reviews",
      read: false,
      createdAt: now,
    });

    // Schedule the following quarter.
    const next = new Date();
    next.setUTCDate(next.getUTCDate() + 90);
    await store.saveReview({
      id: crypto.randomUUID(),
      learnerId: learner.id,
      quarter: (review.quarter % 4) + 1,
      year: next.getUTCFullYear(),
      scheduledFor: next.toISOString(),
    });
  }

  return NextResponse.json({ ok: true, review: updated });
}
