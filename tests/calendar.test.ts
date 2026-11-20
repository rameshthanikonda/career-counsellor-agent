import { describe, expect, it } from "vitest";
import type { ApplicationView, Milestone, Plan, QuarterlyReview } from "@/lib/types";
import { buildIcs } from "@/lib/calendar/ics";
import { buildLearnerEvents } from "@/lib/calendar/events";
import { buildDefaultChecklist } from "@/lib/applications/checklist";
import { makeCourse, makeLearner } from "./fixtures";

describe("iCalendar output", () => {
  it("wraps events in a VCALENDAR with stable UIDs", () => {
    const ics = buildIcs([
      {
        uid: "milestone-1@northstar",
        start: "2026-12-01T00:00:00.000Z",
        allDay: true,
        title: "Submit application",
        description: "Verify the deadline with the institution.",
        alarmDaysBefore: 3,
      },
    ]);
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("UID:milestone-1@northstar");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261201");
    expect(ics).toContain("SUMMARY:Submit application");
    expect(ics).toContain("TRIGGER:-P3D");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("escapes commas, semicolons and newlines", () => {
    const ics = buildIcs([
      {
        uid: "x",
        start: "2026-12-01T09:00:00.000Z",
        title: "Review: fees, eligibility; documents",
        description: "Line one\nLine two",
      },
    ]);
    expect(ics).toContain("SUMMARY:Review: fees\\, eligibility\\; documents");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
    expect(ics).toContain("DTSTART:20261201T090000Z");
  });

  it("ignores invalid dates instead of emitting a broken event", () => {
    const ics = buildIcs([
      { uid: "bad", start: "not-a-date", title: "Broken" },
      { uid: "good", start: "2026-12-01T00:00:00.000Z", allDay: true, title: "Good" },
    ]);
    expect(ics).not.toContain("UID:bad");
    expect(ics).toContain("UID:good");
  });
});

describe("learner calendar events", () => {
  const learner = makeLearner();
  const course = makeCourse();

  const plan: Plan & { milestones: Milestone[] } = {
    id: "plan-1",
    learnerId: learner.id,
    title: "12-month plan",
    status: "active",
    startDate: "2026-11-01T00:00:00.000Z",
    endDate: "2027-11-01T00:00:00.000Z",
    objective: "Test plan",
    createdBy: "system",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    milestones: [
      {
        id: "ms-1",
        planId: "plan-1",
        quarter: 1,
        order: 1,
        title: "Open milestone",
        description: "Do the work.",
        dueDate: "2026-12-01T00:00:00.000Z",
        status: "pending",
      },
      {
        id: "ms-2",
        planId: "plan-1",
        quarter: 1,
        order: 2,
        title: "Done milestone",
        description: "Already done.",
        dueDate: "2026-11-10T00:00:00.000Z",
        status: "done",
      },
    ],
  };

  const reviews: QuarterlyReview[] = [
    {
      id: "rev-1",
      learnerId: learner.id,
      quarter: 1,
      year: 2027,
      scheduledFor: "2027-02-01T00:00:00.000Z",
    },
  ];

  const application: ApplicationView = {
    id: "app-1",
    learnerId: learner.id,
    courseId: course.id,
    status: "preparing",
    deadline: "2026-12-15T00:00:00.000Z",
    checklist: buildDefaultChecklist(course, learner),
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    course,
  };

  it("includes open milestones, pending reviews and application deadlines", () => {
    const events = buildLearnerEvents({
      learner,
      plan,
      reviews,
      applications: [application],
    });
    const titles = events.map((event) => event.title);
    expect(titles).toContain("Milestone: Open milestone");
    expect(titles).not.toContain("Milestone: Done milestone");
    expect(titles.some((title) => title.startsWith("Quarterly review"))).toBe(true);
    expect(titles).toContain("Apply: Test Programme");
  });

  it("omits closed applications and completed reviews", () => {
    const events = buildLearnerEvents({
      learner,
      plan: null,
      reviews: [{ ...reviews[0], completedAt: "2026-12-01T00:00:00.000Z" }],
      applications: [{ ...application, status: "rejected" }],
    });
    expect(events).toHaveLength(0);
  });
});
