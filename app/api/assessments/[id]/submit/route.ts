import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { scoreAssessment } from "@/lib/assessment/scoring";
import { INSTRUMENT_VERSION } from "@/lib/assessment/instruments";
import { buildSuggestedShortlist, computeClusterFits, rankCareerPaths } from "@/lib/catalogue/matching";
import { buildNarrative } from "@/lib/reports/narrative";
import { generatePlan } from "@/lib/plans/generator";
import type {
  AuditEvent,
  Milestone,
  Plan,
  Report,
  ShortlistItem,
} from "@/lib/types";

export const runtime = "nodejs";

const submitSchema = z.object({
  responses: z.record(z.number()).optional(),
  durationSeconds: z.number().min(0).max(24 * 3600).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "learner")
    return NextResponse.json({ error: "Learner access only" }, { status: 403 });

  const { id } = await params;
  const store = getStore();
  const assessment = await store.getAssessmentById(id);
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const learner = await store.getLearnerByUserId(user.id);
  if (!learner || learner.id !== assessment.learnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (assessment.status === "completed") {
    return NextResponse.json({ error: "Already submitted.", redirect: "/learner/results" }, { status: 409 });
  }

  const json = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const merged = { ...assessment.responses, ...(parsed.data.responses ?? {}) };
  const duration =
    parsed.data.durationSeconds ??
    (assessment.startedAt
      ? Math.max(0, (Date.now() - new Date(assessment.startedAt).getTime()) / 1000)
      : 0);

  const now = new Date().toISOString();
  const scores = scoreAssessment({ responses: merged, durationSeconds: duration });

  assessment.responses = merged;
  assessment.scores = scores;
  assessment.status = "completed";
  assessment.completedAt = now;
  assessment.updatedAt = now;
  assessment.instrumentVersion = INSTRUMENT_VERSION;
  await store.saveAssessment(assessment);

  // ── Shortlist ──────────────────────────────────────────────
  const courses = await store.listCourses();
  const existingShortlist = await store.listShortlist(learner.id);
  const preserved = existingShortlist.filter(
    (item) => item.addedBy === "counsellor" && item.status !== "removed"
  );
  const preservedCourseIds = new Set(preserved.map((p) => p.courseId));
  const suggestions = buildSuggestedShortlist(learner, scores, courses, 5).filter(
    (s) => !preservedCourseIds.has(s.courseId)
  );

  let nextRank = preserved.length + 1;
  const generated: ShortlistItem[] = suggestions.map((suggestion, index) => ({
    id: crypto.randomUUID(),
    learnerId: learner.id,
    courseId: suggestion.courseId,
    rank: nextRank++,
    fitScore: suggestion.fitScore,
    rationale: suggestion.rationale,
    factors: suggestion.factors,
    status: "proposed",
    addedBy: "system",
    createdAt: now,
    updatedAt: now,
  }));

  await store.replaceShortlist(learner.id, [
    ...preserved.map((item, index) => ({ ...item, rank: index + 1 })),
    ...generated,
  ]);

  // ── Report draft, submitted for human review ───────────────
  const fits = computeClusterFits(scores);
  const paths = rankCareerPaths(scores, 6);
  const narrative = buildNarrative({ learner, scores, fits, paths });
  const existingReport = await store.getReportByLearner(learner.id);

  const report: Report = {
    id: crypto.randomUUID(),
    learnerId: learner.id,
    version: (existingReport?.version ?? 0) + 1,
    status: "in_review",
    verificationCode: `NS-${new Date().getFullYear()}-${crypto
      .randomUUID()
      .slice(0, 4)
      .toUpperCase()}`,
    narrative,
    topClusterIds: fits.slice(0, 3).map((f) => f.cluster.id),
    suggestedPathIds: paths.slice(0, 3).map((p) => p.path.id),
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
  };
  await store.saveReport(report);

  // ── Plan (draft until the report is released) ──────────────
  const existingPlan = await store.getPlanByLearner(learner.id);
  if (!existingPlan && paths[0]) {
    const draft = generatePlan(learner, paths[0].path, {
      startDate: new Date(),
      shortlistCount: preserved.length + generated.length,
    });
    const plan: Plan = {
      id: crypto.randomUUID(),
      learnerId: learner.id,
      title: draft.title,
      status: "draft",
      startDate: draft.startDate,
      endDate: draft.endDate,
      objective: draft.objective,
      createdBy: "system",
      createdAt: now,
      updatedAt: now,
    };
    await store.savePlan(plan);
    const milestones: Milestone[] = draft.milestones.map((m) => ({
      id: crypto.randomUUID(),
      planId: plan.id,
      quarter: m.quarter,
      order: m.order,
      title: m.title,
      description: m.description,
      dueDate: m.dueDate,
      status: m.status,
    }));
    for (const milestone of milestones) {
      await store.saveMilestone(milestone);
    }
  }

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "learner",
    action: "assessment.completed",
    entity: "assessment",
    entityId: assessment.id,
    metadata: { instrument: INSTRUMENT_VERSION, quality: scores.quality.band },
    createdAt: now,
  } satisfies AuditEvent);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "learner",
    action: "report.submitted_for_review",
    entity: "report",
    entityId: report.id,
    metadata: { version: report.version },
    createdAt: now,
  } satisfies AuditEvent);

  const staff = (await store.listUsers()).filter(
    (u) => u.role === "counsellor" || u.role === "admin"
  );
  await Promise.all(
    staff.map((member) =>
      store.saveNotification({
        id: crypto.randomUUID(),
        userId: member.id,
        title: "Report awaiting review",
        body: `${learner.fullName}'s assessment is complete and the report needs review.`,
        href: `/counsellor/learner/${learner.id}`,
        read: false,
        createdAt: now,
      })
    )
  );

  await store.saveNotification({
    id: crypto.randomUUID(),
    userId: user.id,
    title: "Assessment complete",
    body: "Your report is with a counsellor for review. We will notify you when it is released.",
    href: "/learner/results",
    read: false,
    createdAt: now,
  });

  return NextResponse.json({ ok: true, redirect: "/learner/results" });
}
