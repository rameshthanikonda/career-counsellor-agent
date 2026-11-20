import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { AuditEvent, Satisfaction } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "learner")
    return NextResponse.json({ error: "Learner access only" }, { status: 403 });

  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) return NextResponse.json({ error: "Profile missing" }, { status: 409 });

  const report = await store.getReportByLearner(learner.id);
  if (!report || report.status !== "released") {
    return NextResponse.json(
      { error: "Satisfaction can be recorded after your report is released." },
      { status: 409 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a rating from 1 to 5." }, { status: 400 });
  }

  const existing = await store.getSatisfactionByLearner(learner.id);
  const now = new Date().toISOString();
  const satisfaction: Satisfaction = {
    id: existing?.id ?? crypto.randomUUID(),
    learnerId: learner.id,
    reportId: report.id,
    score: parsed.data.score,
    comment: parsed.data.comment?.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
  };
  await store.saveSatisfaction(satisfaction);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "learner",
    action: existing ? "satisfaction.updated" : "satisfaction.recorded",
    entity: "satisfaction",
    entityId: satisfaction.id,
    metadata: { score: satisfaction.score, reportId: report.id },
    createdAt: now,
  } satisfies AuditEvent);

  const staff = (await store.listUsers()).filter((u) => u.role === "counsellor");
  await Promise.all(
    staff.map((member) =>
      store.saveNotification({
        id: crypto.randomUUID(),
        userId: member.id,
        title: "Learner satisfaction recorded",
        body: `${learner.fullName} rated the counselling report ${satisfaction.score}/5.`,
        href: `/counsellor/learner/${learner.id}`,
        read: false,
        createdAt: now,
      })
    )
  );

  return NextResponse.json({ ok: true, satisfaction });
}
