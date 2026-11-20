import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { APTITUDE_ITEMS, INTEREST_ITEMS, PERSONALITY_ITEMS } from "@/lib/assessment/instruments";

export const runtime = "nodejs";

const validIds = new Set(
  [...INTEREST_ITEMS, ...APTITUDE_ITEMS, ...PERSONALITY_ITEMS].map((i) => i.id)
);

const patchSchema = z.object({
  responses: z.record(z.number().int().min(0).max(5)).optional(),
  sectionTimings: z
    .object({
      interest: z.number().min(0).max(100000).optional(),
      aptitude: z.number().min(0).max(100000).optional(),
      personality: z.number().min(0).max(100000).optional(),
    })
    .partial()
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  const store = getStore();
  const assessment = await store.getAssessmentById(id);
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const learner = await store.getLearnerByUserId(user.id);
  if (!learner || learner.id !== assessment.learnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (assessment.status === "completed") {
    return NextResponse.json({ error: "Assessment already submitted." }, { status: 409 });
  }

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const incoming = Object.entries(parsed.data.responses ?? {}).filter(
    ([key, value]) => validIds.has(key) && Number.isFinite(value)
  );

  for (const [key, value] of incoming) {
    assessment.responses[key] = value;
  }
  assessment.sectionTimings = {
    ...assessment.sectionTimings,
    ...parsed.data.sectionTimings,
  };
  assessment.status = "in_progress";
  assessment.updatedAt = new Date().toISOString();
  await store.saveAssessment(assessment);

  return NextResponse.json({ ok: true, savedAt: assessment.updatedAt });
}
