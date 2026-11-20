import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { buildDefaultChecklist } from "@/lib/applications/checklist";
import type { Application, AuditEvent, Notification } from "@/lib/types";

export const runtime = "nodejs";

const createSchema = z.object({
  courseId: z.string().min(1),
  deadline: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const store = getStore();
  const url = new URL(request.url);
  const requestedLearnerId = url.searchParams.get("learnerId");

  let learnerId: string | null = null;
  if (user.role === "learner") {
    const learner = await store.getLearnerByUserId(user.id);
    if (!learner) return NextResponse.json({ error: "Complete your profile first." }, { status: 409 });
    learnerId = learner.id;
  } else {
    learnerId = requestedLearnerId;
  }
  if (!learnerId) {
    return NextResponse.json({ error: "learnerId is required for staff access." }, { status: 400 });
  }

  const applications = await store.listApplications(learnerId);
  return NextResponse.json({ ok: true, applications });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "learner") {
    return NextResponse.json({ error: "Learner access only" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid application details." }, { status: 400 });
  }

  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) {
    return NextResponse.json({ error: "Complete your profile first." }, { status: 409 });
  }

  const [course, shortlist, existing, report] = await Promise.all([
    store.getCourseById(parsed.data.courseId),
    store.listShortlist(learner.id),
    store.listApplications(learner.id),
    store.getReportByLearner(learner.id),
  ]);
  if (!course || !course.isActive) {
    return NextResponse.json({ error: "Programme not found." }, { status: 404 });
  }
  if (report?.status !== "released") {
    return NextResponse.json(
      {
        error:
          "Your shortlist unlocks when the report is released. Applications can be tracked after that checkpoint.",
      },
      { status: 409 }
    );
  }

  const onShortlist = shortlist.some(
    (item) => item.courseId === course.id && item.status !== "removed"
  );
  if (!onShortlist) {
    return NextResponse.json(
      { error: "Add the programme to your shortlist before tracking an application." },
      { status: 409 }
    );
  }
  if (
    existing.some(
      (application) =>
        application.courseId === course.id &&
        application.status !== "withdrawn" &&
        application.status !== "rejected"
    )
  ) {
    return NextResponse.json(
      { error: "You are already tracking an application for this programme." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const deadline = parsed.data.deadline
    ? new Date(parsed.data.deadline).toISOString()
    : undefined;

  const application: Application = {
    id: crypto.randomUUID(),
    learnerId: learner.id,
    courseId: course.id,
    status: "planned",
    deadline,
    notes: parsed.data.notes || undefined,
    checklist: buildDefaultChecklist(course, learner),
    createdAt: now,
    updatedAt: now,
  };
  await store.saveApplication(application);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "learner",
    action: "application.created",
    entity: "application",
    entityId: application.id,
    metadata: { learner: learner.fullName, course: course.title },
    createdAt: now,
  } satisfies AuditEvent);

  if (learner.counsellorId) {
    await store.saveNotification({
      id: crypto.randomUUID(),
      userId: learner.counsellorId,
      title: "New application tracked",
      body: `${learner.fullName} started an application for ${course.title}.`,
      href: `/counsellor/learner/${learner.id}`,
      read: false,
      createdAt: now,
    } satisfies Notification);
  }

  return NextResponse.json({ ok: true, application });
}
