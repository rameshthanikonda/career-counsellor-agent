import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { checklistProgress } from "@/lib/applications/checklist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(value: string | number | undefined | null) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in to export applications.", { status: 401 });

  const store = getStore();
  const requested = new URL(request.url).searchParams.get("learnerId");
  const learner =
    user.role === "learner"
      ? await store.getLearnerByUserId(user.id)
      : requested
        ? await store.getLearnerById(requested)
        : null;
  if (!learner) return new Response("Learner not found.", { status: 404 });
  if (user.role === "learner" && learner.userId !== user.id) {
    return new Response("Forbidden.", { status: 403 });
  }

  const [applications, courses] = await Promise.all([
    store.listApplications(learner.id),
    store.listCourses(),
  ]);
  const courseMap = new Map(courses.map((course) => [course.id, course]));

  const header = [
    "Programme",
    "Provider",
    "Level",
    "Status",
    "Deadline",
    "Submitted",
    "Decision",
    "Checklist done",
    "Checklist total",
    "Missing required",
    "Notes",
  ];
  const lines = [header.map(cell).join(",")];

  for (const application of applications) {
    const course = courseMap.get(application.courseId);
    const progress = checklistProgress(application.checklist);
    lines.push(
      [
        course?.title ?? application.courseId,
        course?.provider ?? "",
        course?.level ?? "",
        application.status,
        application.deadline ?? "",
        application.submittedAt ?? "",
        application.decisionAt ?? "",
        progress.done,
        progress.total,
        progress.missingRequired.map((item) => item.label).join("; "),
        application.notes ?? "",
      ]
        .map(cell)
        .join(",")
    );
  }

  const safe = learner.fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="northstar-${safe}-applications.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
