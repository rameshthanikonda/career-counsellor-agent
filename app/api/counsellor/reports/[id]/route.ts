import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { AuditEvent, Plan, QuarterlyReview, Report } from "@/lib/types";

export const runtime = "nodejs";

const narrativeSchema = z.object({
  summary: z.string().trim().min(40).max(3000),
  strengths: z.array(z.string().trim().min(3).max(600)).min(1).max(8),
  considerations: z.array(z.string().trim().min(3).max(600)).min(1).max(8),
  recommendations: z.array(z.string().trim().min(3).max(600)).min(1).max(8),
  guardrailNote: z.string().trim().min(10).max(2000),
});

const schema = z.object({
  action: z.enum(["save", "approve", "release", "approve_and_release", "return"]),
  narrative: narrativeSchema.optional(),
  counsellorNotes: z.string().trim().max(3000).optional(),
  learnerFacingNote: z.string().trim().max(2000).optional(),
  returnedReason: z.string().trim().max(1000).optional(),
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
  const report = await store.getReportById(id);
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  const learner = await store.getLearnerById(report.learnerId);
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some fields are invalid.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const { action } = parsed.data;
  const now = new Date().toISOString();
  const staff = (await store.listUsers()).filter((u) => u.role === "counsellor");

  let next: Report = { ...report };

  if (action === "save" || action === "approve" || action === "approve_and_release") {
    if (parsed.data.narrative) next.narrative = parsed.data.narrative;
    if (parsed.data.counsellorNotes !== undefined)
      next.counsellorNotes = parsed.data.counsellorNotes || undefined;
    if (parsed.data.learnerFacingNote !== undefined)
      next.learnerFacingNote = parsed.data.learnerFacingNote || undefined;
  }

  if (action === "save") {
    next.updatedAt = now;
    next.status = next.status === "returned" ? "in_review" : next.status;
    await store.saveReport(next);
    await store.appendAudit({
      id: crypto.randomUUID(),
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "report.saved",
      entity: "report",
      entityId: report.id,
      metadata: { learner: learner.fullName, version: report.version },
      createdAt: now,
    } satisfies AuditEvent);
    return NextResponse.json({ ok: true, report: next });
  }

  if (action === "return") {
    if (!parsed.data.returnedReason || parsed.data.returnedReason.length < 10) {
      return NextResponse.json(
        { error: "Give the learner a clear reason (at least 10 characters)." },
        { status: 400 }
      );
    }
    next.status = "returned";
    next.returnedReason = parsed.data.returnedReason;
    next.updatedAt = now;
    await store.saveReport(next);
    await store.appendAudit({
      id: crypto.randomUUID(),
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "report.returned",
      entity: "report",
      entityId: report.id,
      metadata: { reason: parsed.data.returnedReason },
      createdAt: now,
    } satisfies AuditEvent);
    await store.saveNotification({
      id: crypto.randomUUID(),
      userId: learner.userId,
      title: "Your report needs more information",
      body: parsed.data.returnedReason,
      href: "/learner/results",
      read: false,
      createdAt: now,
    });
    return NextResponse.json({ ok: true, report: next });
  }

  // Approval and release are separate gates, but the UI may do both.
  const approve = action === "approve" || action === "approve_and_release";
  const release = action === "release" || action === "approve_and_release";

  if (approve) {
    if (next.status === "released") {
      return NextResponse.json({ error: "Report is already released." }, { status: 409 });
    }
    next.status = "approved";
    next.approvedAt = now;
    next.reviewedAt = now;
    next.counsellorId = user.id;
    next.updatedAt = now;
    await store.saveReport(next);
    await store.appendAudit({
      id: crypto.randomUUID(),
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "report.approved",
      entity: "report",
      entityId: report.id,
      metadata: { learner: learner.fullName, version: report.version },
      createdAt: now,
    } satisfies AuditEvent);
  }

  if (release) {
    if (next.status !== "approved" && next.status !== "released") {
      return NextResponse.json(
        { error: "Approve the report before releasing it." },
        { status: 409 }
      );
    }
    if (next.status !== "released") {
      next.status = "released";
      next.releasedAt = now;
      next.updatedAt = now;
      await store.saveReport(next);

      // Activate the plan alongside the report.
      const plan = await store.getPlanByLearner(learner.id);
      if (plan && plan.status === "draft") {
        const activated: Plan = {
          ...plan,
          status: "active",
          approvedAt: now,
          updatedAt: now,
        };
        await store.savePlan(activated);
      }

      // Schedule the first quarterly review if none is pending.
      const reviews = await store.listReviews(learner.id);
      const pending = reviews.filter((r) => !r.completedAt);
      if (pending.length === 0) {
        const scheduled = new Date();
        scheduled.setUTCDate(scheduled.getUTCDate() + 90);
        const quarter =
          Math.floor(new Date().getUTCMonth() / 3) + 1;
        const review: QuarterlyReview = {
          id: crypto.randomUUID(),
          learnerId: learner.id,
          quarter,
          year: scheduled.getUTCFullYear(),
          scheduledFor: scheduled.toISOString(),
        };
        await store.saveReview(review);
      }

      await store.appendAudit({
        id: crypto.randomUUID(),
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "report.released",
        entity: "report",
        entityId: report.id,
        metadata: { learner: learner.fullName, version: report.version },
        createdAt: now,
      } satisfies AuditEvent);

      await store.saveNotification({
        id: crypto.randomUUID(),
        userId: learner.userId,
        title: "Your counselling report is ready",
        body: "Your counsellor has reviewed and released your report. You can read it and download the PDF.",
        href: "/learner/results",
        read: false,
        createdAt: now,
      });

      await Promise.all(
        staff
          .filter((member) => member.id !== user.id)
          .map((member) =>
            store.saveNotification({
              id: crypto.randomUUID(),
              userId: member.id,
              title: "Report released",
              body: `${learner.fullName}'s report was released by ${user.name}.`,
              href: `/counsellor/learner/${learner.id}`,
              read: false,
              createdAt: now,
            })
          )
      );
    }
  }

  return NextResponse.json({ ok: true, report: next });
}
