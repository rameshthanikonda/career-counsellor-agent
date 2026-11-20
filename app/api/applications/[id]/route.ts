import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { Application, ApplicationStatus, AuditEvent } from "@/lib/types";

export const runtime = "nodejs";

const statuses = [
  "planned",
  "preparing",
  "submitted",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

const checklistSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  required: z.boolean(),
  done: z.boolean(),
  note: z.string().trim().max(500).optional(),
});

const patchSchema = z.object({
  status: z.enum(statuses).optional(),
  deadline: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
  checklist: z.array(checklistSchema).max(40).optional(),
});

async function loadAuthorised(id: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) } as const;
  }
  const store = getStore();
  const application = await store.getApplicationById(id);
  if (!application) {
    return { error: NextResponse.json({ error: "Application not found" }, { status: 404 }) } as const;
  }
  const learner = await store.getLearnerById(application.learnerId);
  if (!learner) {
    return { error: NextResponse.json({ error: "Learner not found" }, { status: 404 }) } as const;
  }
  if (user.role === "learner") {
    if (learner.userId !== user.id) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
    }
  } else if (user.role !== "counsellor" && user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { user, store, application, learner } as const;
}

function parseDeadline(value: string | null | undefined): string | undefined | null {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const context = await loadAuthorised(id);
  if ("error" in context) return context.error;
  const { user, store, application, learner } = context;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid application update." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const nextStatus: ApplicationStatus = parsed.data.status ?? application.status;
  const next: Application = {
    ...application,
    status: nextStatus,
    notes:
      parsed.data.notes !== undefined ? parsed.data.notes || undefined : application.notes,
    checklist: parsed.data.checklist ?? application.checklist,
    updatedAt: now,
  };

  if (parsed.data.deadline !== undefined) {
    const deadline = parseDeadline(parsed.data.deadline);
    if (deadline === null && parsed.data.deadline !== null && parsed.data.deadline !== "") {
      return NextResponse.json({ error: "Deadline is not a valid date." }, { status: 400 });
    }
    next.deadline = deadline ?? undefined;
  }

  if (nextStatus === "submitted" && !next.submittedAt) {
    next.submittedAt = now;
  }
  if (
    (nextStatus === "offer" || nextStatus === "rejected") &&
    !next.decisionAt
  ) {
    next.decisionAt = now;
  }

  await store.saveApplication(next);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action:
      nextStatus !== application.status
        ? `application.status_${nextStatus}`
        : "application.updated",
    entity: "application",
    entityId: application.id,
    metadata: {
      learner: learner.fullName,
      status: { from: application.status, to: nextStatus },
    },
    createdAt: now,
  } satisfies AuditEvent);

  if (nextStatus === "submitted" && application.status !== "submitted" && learner.counsellorId) {
    await store.saveNotification({
      id: crypto.randomUUID(),
      userId: learner.counsellorId,
      title: "Application submitted",
      body: `${learner.fullName} submitted an application. Review the decision timeline at the next check-in.`,
      href: `/counsellor/learner/${learner.id}`,
      read: false,
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true, application: next });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const context = await loadAuthorised(id);
  if ("error" in context) return context.error;
  const { user, store, application, learner } = context;

  if (user.role === "learner" && application.status !== "planned") {
    return NextResponse.json(
      { error: "Only planned applications can be removed. Withdraw a submitted application instead." },
      { status: 409 }
    );
  }

  await store.deleteApplication(application.id);
  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "application.deleted",
    entity: "application",
    entityId: application.id,
    metadata: { learner: learner.fullName, status: application.status },
    createdAt: new Date().toISOString(),
  } satisfies AuditEvent);

  return NextResponse.json({ ok: true });
}
