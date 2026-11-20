import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Download, Lock } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { buildLearnerEvents } from "@/lib/calendar/events";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarView, type CalendarEvent, type CalendarEventType } from "@/components/learner/calendar-view";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

function typeOf(uid: string): CalendarEventType {
  if (uid.startsWith("milestone-")) return "milestone";
  if (uid.startsWith("review-")) return "review";
  return "application";
}

export default async function CalendarPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) redirect("/onboarding");

  const workspace = await getLearnerWorkspace(learner.id);
  const released = workspace.report?.status === "released";

  if (!released) {
    return (
      <>
        <PageHeader
          eyebrow="Calendar"
          title="Your calendar unlocks with the report."
          description="Milestones, reviews and application deadlines are scheduled only after a counsellor releases the plan."
          actions={
            <Badge tone="brass" dot>
              {workspace.report ? workspace.report.status.replace(/_/g, " ") : "No report"}
            </Badge>
          }
        />
        <div className="card p-8 text-center sm:p-12">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brandSoft text-brand">
            <Lock className="h-5 w-5" />
          </span>
          <h2 className="display mt-4 text-xl font-semibold text-content">
            Nothing scheduled yet
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            Once the report is released, this page shows a real month view of
            milestones, quarterly reviews and every application deadline.
          </p>
          <Link href="/learner/results" className={buttonClasses("primary", "md", "mt-5")}>
            View report status
          </Link>
        </div>
      </>
    );
  }

  const events = buildLearnerEvents({
    learner,
    plan: workspace.plan,
    reviews: workspace.reviews,
    applications: workspace.applications,
  }).map<CalendarEvent>((event) => ({
    id: event.uid,
    date: event.start,
    title: event.title,
    type: typeOf(event.uid),
    description: event.description,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Everything with a date, in one place."
        description="Milestones, quarterly reviews and application deadlines from your plan. Dates are reminders, not institutional confirmations — verify each one in the official portal."
        actions={
          <>
            <a href="/api/calendar" className={buttonClasses("primary", "md")}>
              <Download className="h-4 w-4" /> Download .ics
            </a>
            <Link href="/learner/applications" className={buttonClasses("secondary", "md")}>
              <CalendarDays className="h-4 w-4" /> Applications
            </Link>
          </>
        }
      />

      {events.length === 0 ? (
        <div className="card p-8 text-center">
          <CalendarDays className="mx-auto h-5 w-5 text-faint" />
          <p className="mt-2 text-sm font-semibold text-content">No dated events yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">
            Add a deadline in applications or start the plan to populate the calendar.
          </p>
        </div>
      ) : (
        <CalendarView events={events} learnerName={learner.fullName} />
      )}
    </>
  );
}
