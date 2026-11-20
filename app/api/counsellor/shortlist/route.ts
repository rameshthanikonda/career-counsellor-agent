import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { matchCourse } from "@/lib/catalogue/matching";
import type { AuditEvent, ShortlistItem } from "@/lib/types";

export const runtime = "nodejs";

const addSchema = z.object({
  learnerId: z.string().uuid().or(z.string().min(1)),
  courseId: z.string().min(1),
});

const patchSchema = z.object({
  learnerId: z.string().min(1),
  itemId: z.string().min(1),
  status: z.enum(["approved", "removed", "proposed"]).optional(),
  note: z.string().max(500).optional(),
});

async function authorise() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) };
  if (user.role !== "counsellor" && user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function POST(request: Request) {
  const auth = await authorise();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const store = getStore();
  const [learner, course, assessment] = await Promise.all([
    store.getLearnerById(parsed.data.learnerId),
    store.getCourseById(parsed.data.courseId),
    store.getAssessmentByLearner(parsed.data.learnerId),
  ]);
  if (!learner || !course) {
    return NextResponse.json({ error: "Learner or course not found" }, { status: 404 });
  }
  if (!assessment?.scores) {
    return NextResponse.json(
      { error: "The assessment must be complete before editing the shortlist." },
      { status: 409 }
    );
  }

  const existing = await store.listShortlist(learner.id);
  if (existing.some((item) => item.courseId === course.id && item.status !== "removed")) {
    return NextResponse.json({ error: "Already on the shortlist." }, { status: 409 });
  }

  const match = matchCourse(learner, assessment.scores, course);
  const now = new Date().toISOString();
  const item: ShortlistItem = {
    id: crypto.randomUUID(),
    learnerId: learner.id,
    courseId: course.id,
    rank: Math.max(0, ...existing.map((i) => i.rank)) + 1,
    fitScore: match.fitScore,
    rationale: match.rationale,
    factors: match.factors,
    status: "approved",
    addedBy: "counsellor",
    createdAt: now,
    updatedAt: now,
  };
  await store.saveShortlistItem(item);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "shortlist.course_added",
    entity: "shortlist",
    entityId: item.id,
    metadata: { learner: learner.fullName, course: course.title },
    createdAt: now,
  } satisfies AuditEvent);

  return NextResponse.json({ ok: true, item });
}

export async function PATCH(request: Request) {
  const auth = await authorise();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const store = getStore();
  const learner = await store.getLearnerById(parsed.data.learnerId);
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

  const items = await store.listShortlist(learner.id);
  const item = items.find((i) => i.id === parsed.data.itemId);
  if (!item) return NextResponse.json({ error: "Shortlist item not found" }, { status: 404 });

  const now = new Date().toISOString();
  const next: ShortlistItem = {
    ...item,
    status: parsed.data.status ?? item.status,
    rationale: parsed.data.note ? `${item.rationale} — ${parsed.data.note}` : item.rationale,
    addedBy: "counsellor",
    updatedAt: now,
  };
  await store.saveShortlistItem(next);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: `shortlist.${next.status}`,
    entity: "shortlist",
    entityId: item.id,
    metadata: { learner: learner.fullName, note: parsed.data.note ?? null },
    createdAt: now,
  } satisfies AuditEvent);

  return NextResponse.json({ ok: true, item: next });
}
