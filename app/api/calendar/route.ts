import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { buildLearnerEvents } from "@/lib/calendar/events";
import { buildIcs } from "@/lib/calendar/ics";
import type { ApplicationView } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Calendar feed for a learner: open milestones, quarterly reviews and
 * application deadlines. Learners export their own; staff may export a
 * learner's feed for a review conversation.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Sign in to export a calendar.", { status: 401 });
  }

  const store = getStore();
  const url = new URL(request.url);
  const requestedLearnerId = url.searchParams.get("learnerId");

  let learnerId: string;
  if (user.role === "learner") {
    const learner = await store.getLearnerByUserId(user.id);
    if (!learner) return new Response("Complete your profile first.", { status: 409 });
    learnerId = learner.id;
  } else {
    if (!requestedLearnerId) {
      return new Response("learnerId is required for staff exports.", { status: 400 });
    }
    learnerId = requestedLearnerId;
  }

  const learner = await store.getLearnerById(learnerId);
  if (!learner) return new Response("Learner not found.", { status: 404 });

  const [workspace, applications, courses] = await Promise.all([
    getLearnerWorkspace(learner.id),
    store.listApplications(learner.id),
    store.listCourses(),
  ]);

  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const applicationViews: ApplicationView[] = applications
    .map((application) => {
      const course = courseMap.get(application.courseId);
      return course ? { ...application, course } : null;
    })
    .filter((row): row is ApplicationView => row !== null);

  const released = workspace.report?.status === "released";
  const staff = user.role !== "learner";
  const events = buildLearnerEvents({
    learner,
    plan: released || staff ? workspace.plan : null,
    reviews: released || staff ? workspace.reviews : [],
    applications: released || staff ? applicationViews : [],
  });

  const ics = buildIcs(events, {
    calendarName: `${learner.fullName} - Northstar plan`,
  });

  const safeName = learner.fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="northstar-${safeName}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
