import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { AuditEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Machine-readable copy of everything Northstar holds about the signed-in
 * learner. Supports the access/portability right described in the privacy
 * notice. Password hashes and internal staff notes are excluded.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in to export your data.", { status: 401 });
  if (user.role !== "learner") {
    return new Response("This export is for learners. Staff records are covered by the audit trail.", {
      status: 403,
    });
  }

  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) return new Response("Complete your profile first.", { status: 409 });

  const [assessment, reports, shortlist, plan, milestones, applications, reviews, satisfaction, messages, courses] =
    await Promise.all([
      store.getAssessmentByLearner(learner.id),
      store.listReports(),
      store.listShortlist(learner.id),
      store.getPlanByLearner(learner.id),
      store.getPlanByLearner(learner.id).then((row) =>
        row ? store.listMilestones(row.id) : []
      ),
      store.listApplications(learner.id),
      store.listReviews(learner.id),
      store.getSatisfactionByLearner(learner.id),
      store.listAdvisorMessages(learner.id),
      store.listCourses(),
    ]);

  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const bundle = {
    schemaVersion: "northstar-learner-export-1",
    exportedAt: new Date().toISOString(),
    learner: {
      ...learner,
      passwordHash: undefined,
    },
    assessment: assessment
      ? {
          ...assessment,
          // Item-level responses are included: they are the learner's own data.
        }
      : null,
    reports: reports
      .filter((report) => report.learnerId === learner.id)
      .map((report) => ({
        ...report,
        // Internal counsellor notes stay out of the learner copy.
        counsellorNotes: undefined,
      })),
    shortlist: shortlist.map((item) => ({
      ...item,
      course: courseMap.get(item.courseId) ?? null,
    })),
    plan: plan
      ? {
          ...plan,
          milestones,
        }
      : null,
    applications: applications.map((application) => ({
      ...application,
      course: courseMap.get(application.courseId) ?? null,
    })),
    reviews,
    satisfaction,
    advisorMessages: messages,
  };

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "learner",
    action: "learner.data_exported",
    entity: "learner",
    entityId: learner.id,
    metadata: { format: "json", schemaVersion: bundle.schemaVersion },
    createdAt: new Date().toISOString(),
  } satisfies AuditEvent);

  const safeName = learner.fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="northstar-${safeName}-data.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
