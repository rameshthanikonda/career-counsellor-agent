import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  CalendarPlus,
  FileText,
  Flag,
  GraduationCap,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { requireCounsellor } from "@/lib/auth/session";
import { getAssignedCounsellors, getLearnerWorkspace } from "@/lib/services/workspace";
import { getCounsellorLearnerDetail } from "@/lib/services/counsellor";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard, KeyValue } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge, humanStatus, statusTone } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { RiasecChart } from "@/components/charts/riasec-chart";
import { AptitudeChart } from "@/components/charts/aptitude-chart";
import { PersonalityRadar } from "@/components/charts/personality-radar";
import { ReportConsole } from "@/components/counsellor/report-console";
import { ShortlistManager } from "@/components/counsellor/shortlist-manager";
import { ReviewComposer } from "@/components/counsellor/review-composer";
import { AssignmentControl } from "@/components/counsellor/assignment-control";
import { ApplicationsBoard } from "@/components/learner/applications-board";
import { formatDate, formatINR, titleCase } from "@/lib/utils/format";
import { BIG_FIVE_LABELS, RIASEC_LABELS } from "@/lib/assessment/instruments";

export const metadata: Metadata = { title: "Learner record" };
export const dynamic = "force-dynamic";

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return <KeyValue label={label} value={value} />;
}

export default async function CounsellorLearnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCounsellor();
  const { id } = await params;
  const detail = await getCounsellorLearnerDetail(id);
  if (!detail) notFound();

  const { learner, assessment, report } = detail.queueRow;
  const [workspace, staff] = await Promise.all([
    getLearnerWorkspace(learner.id),
    getAssignedCounsellors(),
  ]);
  const scores = assessment?.scores;

  const reviewTab = report ? (
    <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <SectionCard
        eyebrow={`Report v${report.version}`}
        title="Counsellor review"
        description="Edit the interpretation, then approve and release. The learner sees nothing until release."
      >
        <ReportConsole report={report} learnerName={learner.fullName} />
      </SectionCard>

      <div className="space-y-5">
        <SectionCard eyebrow="Checkpoint" title="Review gates">
          <ol className="space-y-3">
            {[
              {
                label: "Assessment scored",
                done: assessment?.status === "completed",
                note: assessment?.completedAt
                  ? formatDate(assessment.completedAt)
                  : "Waiting for the battery",
              },
              {
                label: "Draft narrative generated",
                done: Boolean(report),
                note: `v${report.version} · ${humanStatus(report.status)}`,
              },
              {
                label: "Counsellor reviewed",
                done: Boolean(report.reviewedAt),
                note: report.reviewedAt ? formatDate(report.reviewedAt) : "Not yet reviewed",
              },
              {
                label: "Released to learner",
                done: report.status === "released",
                note: report.releasedAt ? formatDate(report.releasedAt) : "Not released",
              },
            ].map((step) => (
              <li key={step.label} className="flex items-start gap-2.5">
                <span
                  className={
                    step.done
                      ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-brandContrast"
                      : "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-lineStrong"
                  }
                >
                  {step.done && <BadgeCheck className="h-2.5 w-2.5" />}
                </span>
                <div>
                  <p className="text-xs font-medium text-content">{step.label}</p>
                  <p className="text-[0.65rem] text-faint">{step.note}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-lg bg-panel2/60 px-3 py-2">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-faint">
              Verification code
            </p>
            <p className="mt-0.5 font-mono text-xs text-content">
              {report.verificationCode}
            </p>
            <p className="mt-1 text-[0.62rem] leading-4 text-faint">
              The code verifies the released version. It is printed on the PDF
              cover.
            </p>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Guardrails" title="Before you release">
          <ul className="space-y-2 text-xs leading-5 text-muted">
            <li>• Remove any promise of admission, placement, salary or visa.</li>
            <li>• Keep fees, eligibility and outcome bands labelled indicative.</li>
            <li>• Confirm the shortlist matches the narrative and the plan.</li>
            <li>• Check the learner-facing note is specific and kind.</li>
            <li>• Release only when the learner is ready to act on it.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  ) : (
    <Alert tone="info" title="No report to review yet">
      {assessment?.status === "completed"
        ? "The assessment is complete but no report has been generated. Ask the learner to resubmit, or generate the report through the assessment flow."
        : "The learner has not completed the assessment, so there is no report yet. The profile and any shortlist are still visible in the other tabs."}
    </Alert>
  );

  const profileTab = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <SectionCard eyebrow="Profile" title="Who this learner is">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={learner.fullName} />
            <Field label="Email" value={learner.email} />
            <Field label="Phone" value={learner.phone ?? "—"} />
            <Field label="Stage" value={titleCase(learner.stage)} />
            <Field label="Current education" value={learner.currentEducation} />
            <Field label="Institution" value={learner.institution ?? "—"} />
            <Field
              label="Percentage / CGPA"
              value={learner.percentage !== undefined ? `${learner.percentage}%` : "Not provided"}
            />
            <Field label="Backlogs" value={String(learner.backlogs)} />
            <Field label="Subjects" value={learner.subjects.join(", ") || "—"} />
            <Field
              label="English test"
              value={
                learner.englishTest && learner.englishTest.type !== "None"
                  ? `${learner.englishTest.type} ${learner.englishTest.score ?? ""}`
                  : "None on file"
              }
            />
            <Field
              label="Work experience"
              value={`${learner.workExperienceMonths} months`}
            />
            <Field label="Target intake" value={learner.targetIntake} />
            <Field
              label="Budget"
              value={`${formatINR(learner.budgetMinINR, { compact: true })} – ${formatINR(learner.budgetMaxINR, { compact: true })}`}
            />
            <Field
              label="Preferred destinations"
              value={learner.preferredCountries.join(", ") || "—"}
            />
            <Field
              label="Preferred modes"
              value={learner.preferredModes.map(titleCase).join(", ") || "—"}
            />
            <Field
              label="Consent"
              value={`v${learner.consent.version} · ${formatDate(learner.consent.acceptedAt)}${learner.consent.guardianConsent ? " · guardian consent" : ""}`}
            />
          </dl>
          <div className="mt-5 rounded-xl border border-line bg-panel2/40 p-4">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-faint">
              Career goal
            </p>
            <p className="mt-1 text-sm leading-6 text-content">{learner.careerGoal}</p>
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard eyebrow="Assessment" title="Battery status">
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Status"
                value={
                  <Badge tone={statusTone(assessment?.status ?? "not_started")}>
                    {humanStatus(assessment?.status ?? "not_started")}
                  </Badge>
                }
              />
              <Field label="Started" value={formatDate(assessment?.startedAt)} />
              <Field label="Completed" value={formatDate(assessment?.completedAt)} />
              <Field
                label="Quality"
                value={scores ? `${scores.quality.band} (${scores.quality.score})` : "—"}
              />
            </dl>
            <div className="mt-4 rounded-lg bg-panel2/60 px-3 py-2">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-faint">
                Instrument
              </p>
              <p className="mt-0.5 text-xs text-content">
                {assessment?.instrumentVersion ?? "Not administered"}
              </p>
            </div>
            {scores && scores.quality.flags.length > 0 && (
              <Alert tone="warning" className="mt-4">
                <ul className="space-y-1">
                  {scores.quality.flags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </SectionCard>

          {detail.reviews.length > 0 && (
            <SectionCard eyebrow="Follow-up" title="Review history">
              <ul className="space-y-2.5">
                {detail.reviews.slice(0, 4).map((review) => (
                  <li key={review.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-content">
                      Q{review.quarter} · {review.year}
                    </span>
                    <span className="text-muted">
                      {review.completedAt
                        ? `Complete ${formatDate(review.completedAt)}`
                        : `Due ${formatDate(review.scheduledFor)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {workspace.satisfaction && (
            <SectionCard
              eyebrow="Learner feedback"
              title={`${workspace.satisfaction.score}/5 satisfaction`}
            >
              {workspace.satisfaction.comment ? (
                <p className="text-xs leading-5 text-muted">
                  “{workspace.satisfaction.comment}”
                </p>
              ) : (
                <p className="text-xs text-muted">Rated without a comment.</p>
              )}
              <p className="mt-2 text-[0.62rem] text-faint">
                Recorded {formatDate(workspace.satisfaction.createdAt)} on the report.
              </p>
            </SectionCard>
          )}
        </div>
      </div>

      {scores && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              eyebrow="Interest"
              title={`Holland code ${scores.topInterestCode}`}
              description="RIASEC preference profile. The two strongest themes drive the cluster fit."
            >
              <RiasecChart scores={scores.interest} />
              <p className="mt-4 text-[0.68rem] leading-5 text-muted">
                Strongest: {RIASEC_LABELS[scores.topInterestCode[0] as keyof typeof RIASEC_LABELS]?.name
                }. This is a preference signal, not an ability limit.
              </p>
            </SectionCard>
            <SectionCard
              eyebrow="Aptitude"
              title="Reasoning screen"
              description="Practice-level items, not a standardised selection test."
            >
              <AptitudeChart scores={scores.aptitude} />
            </SectionCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <SectionCard
              eyebrow="Working style"
              title="Five broad traits"
              description="Self-report, useful for coaching. Not a clinical profile."
            >
              <PersonalityRadar scores={scores.personality} />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(Object.keys(scores.personality) as (keyof typeof scores.personality)[]).map(
                  (trait) => (
                    <div
                      key={trait}
                      className="rounded-lg border border-line bg-panel2/30 px-3 py-2"
                    >
                      <p className="text-[0.6rem] uppercase tracking-[0.08em] text-faint">
                        {BIG_FIVE_LABELS[trait].name}
                      </p>
                      <p className="mt-0.5 text-[0.7rem] font-medium text-content">
                        {scores.personality[trait] >= 65
                          ? BIG_FIVE_LABELS[trait].high
                          : scores.personality[trait] <= 35
                            ? BIG_FIVE_LABELS[trait].low
                            : "Balanced — context-dependent"}
                      </p>
                    </div>
                  )
                )}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Cluster fit"
              title="Where the profile points"
              description="Interest 50%, aptitude 30%, working style 20%."
              bodyClassName="p-0 sm:p-0"
            >
              <ul className="divide-y divide-line">
                {workspace.fits.slice(0, 6).map((fit) => (
                  <li key={fit.cluster.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-content">
                          {fit.cluster.name}
                        </p>
                        <p className="mt-0.5 text-[0.65rem] leading-5 text-muted">
                          {fit.cluster.summary}
                        </p>
                      </div>
                      <span className="display shrink-0 text-lg font-semibold text-brand">
                        {fit.score}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-[0.6rem] text-faint">
                      <span>Interest {fit.factors.interest}</span>
                      <span>Aptitude {fit.factors.aptitude}</span>
                      <span>Style {fit.factors.personality}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );

  const shortlistTab = (
    <SectionCard
      eyebrow={`${workspace.shortlist.length} programmes`}
      title="Shortlist"
      description="Approve, add or remove options. Every change is audited with your account."
    >
      <ShortlistManager
        learnerId={learner.id}
        items={workspace.shortlist}
        courses={detail.courses.map((course) => ({
          id: course.id,
          title: course.title,
          provider: course.provider,
          level: course.level,
        }))}
      />
    </SectionCard>
  );

  const planTab = (
    <div className="space-y-5">
      {workspace.plan ? (
        <SectionCard
          eyebrow={`${workspace.progress.percent}% complete`}
          title={workspace.plan.title}
          description={workspace.plan.objective}
          action={
            <Badge tone={statusTone(workspace.plan.status)} dot>
              {humanStatus(workspace.plan.status)}
            </Badge>
          }
        >
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-panel2">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${workspace.progress.percent}%` }}
            />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.68rem] text-muted">
            <span>
              {workspace.progress.milestonesDone}/{workspace.progress.milestonesTotal} milestones
              done
            </span>
            <span>
              {formatDate(workspace.plan.startDate)} – {formatDate(workspace.plan.endDate)}
            </span>
            {workspace.progress.overdue.length > 0 && (
              <span className="font-medium text-clay-600 dark:text-clay-300">
                {workspace.progress.overdue.length} overdue
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full table-fixed text-left">
              <thead className="bg-panel2/60">
                <tr>
                  <th className="w-10 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-faint">
                    Q
                  </th>
                  <th className="px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-faint">
                    Milestone
                  </th>
                  <th className="w-28 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-faint">
                    Due
                  </th>
                  <th className="w-28 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-faint">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {workspace.plan.milestones.map((milestone) => (
                  <tr key={milestone.id}>
                    <td className="px-3 py-2.5 text-xs font-semibold text-faint">
                      Q{milestone.quarter}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-medium text-content">{milestone.title}</p>
                      <p className="mt-0.5 text-[0.65rem] leading-4 text-muted">
                        {milestone.description}
                      </p>
                      {milestone.evidence && (
                        <p className="mt-1 text-[0.62rem] text-faint">
                          Evidence: {milestone.evidence}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[0.68rem] text-muted">
                      {formatDate(milestone.dueDate)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={statusTone(milestone.status)}>
                        {humanStatus(milestone.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <Alert tone="info" title="No plan yet">
          A draft plan is generated with the report submission and activated on
          release. If the learner has no plan, generate a report first.
        </Alert>
      )}

      <SectionCard
        eyebrow={`${detail.reviews.filter((review) => !review.completedAt).length} open`}
        title="Quarterly reviews"
        description="Complete a review to record progress, agree next steps and schedule the following quarter."
      >
        {detail.reviews.length === 0 ? (
          <p className="text-sm text-muted">
            No reviews scheduled. The first review is scheduled automatically when
            the report is released.
          </p>
        ) : (
          <div className="space-y-3">
            {detail.reviews
              .slice()
              .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))
              .map((review) => (
                <ReviewComposer
                  key={review.id}
                  review={review}
                  learnerName={learner.fullName.split(" ")[0]}
                />
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );

  const applicationsTab = (
    <SectionCard
      eyebrow={`${workspace.applications.length} tracked`}
      title="Applications"
      description="Deadlines, document evidence and decisions. The learner and the counselling team see the same record."
      action={
        <a
          href={`/api/applications/export?learnerId=${learner.id}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-lineStrong px-3 text-[0.75rem] font-medium text-content hover:bg-panel2"
        >
          Export CSV
        </a>
      }
    >
      <ApplicationsBoard
        applications={workspace.applications}
        shortlist={workspace.shortlist.map((item) => ({
          courseId: item.courseId,
          title: item.course.title,
          provider: item.course.provider,
          level: item.course.level,
        }))}
        counsellorMode
      />
    </SectionCard>
  );

  const historyTab = (
    <SectionCard
      eyebrow={`${detail.reports.length} version${detail.reports.length === 1 ? "" : "s"}`}
      title="Report history"
      description="Every version generated for this learner, newest first. Released versions are immutable; a reassessment creates a new version."
    >
      {detail.reports.length === 0 ? (
        <p className="text-sm text-muted">No report versions yet.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {detail.reports.map((version) => {
            const author = staff.find((member) => member.id === version.counsellorId);
            return (
              <li key={version.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-content">
                        Version {version.version}
                      </p>
                      <Badge tone={statusTone(version.status)} dot>
                        {humanStatus(version.status)}
                      </Badge>
                      {version.id === report?.id && <Badge tone="outline">Current</Badge>}
                    </div>
                    <p className="mt-1 text-[0.68rem] text-muted">
                      Code <span className="font-mono">{version.verificationCode}</span>
                      {" · "}created {formatDate(version.createdAt)}
                      {version.reviewedAt ? ` · reviewed ${formatDate(version.reviewedAt)}` : ""}
                      {version.releasedAt ? ` · released ${formatDate(version.releasedAt)}` : ""}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-faint">
                      {author ? `Counsellor: ${author.name}` : "Not yet assigned a reviewer"}
                      {version.returnedReason ? ` · Returned: ${version.returnedReason}` : ""}
                    </p>
                  </div>
                  <a
                    href={`/api/reports/${version.id}/pdf`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-lineStrong px-3 text-[0.75rem] font-medium text-content hover:bg-panel2"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );

  return (
    <>
      <PageHeader
        eyebrow={`Learner record · ${humanStatus(learner.stage)}`}
        title={learner.fullName}
        description={`${learner.currentEducation}${learner.institution ? ` · ${learner.institution}` : ""} · ${learner.city}, ${learner.country}`}
        back={{ href: "/counsellor", label: "Back to review queue" }}
        actions={
          <>
            <a
              href={`/api/calendar?learnerId=${learner.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-lineStrong px-4 text-sm font-medium text-content hover:bg-panel2"
            >
              <CalendarPlus className="h-4 w-4" /> Calendar
            </a>
            {report && (
              <Link
                href={`/api/reports/${report.id}/pdf`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-lineStrong px-4 text-sm font-medium text-content hover:bg-panel2"
              >
                <FileText className="h-4 w-4" /> Report PDF
              </Link>
            )}
            <Badge tone={statusTone(report?.status ?? "")} dot>
              {report ? humanStatus(report.status) : "No report"}
            </Badge>
          </>
        }
      />

      <div className="mb-5">
        <AssignmentControl
          learnerId={learner.id}
          current={learner.counsellorId ?? null}
          staff={staff.map((member) => ({
            id: member.id,
            name: member.name,
            role: member.role,
          }))}
        />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-flat flex items-center gap-3 p-4">
          <GraduationCap className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[0.58rem] uppercase tracking-[0.1em] text-faint">Stage</p>
            <p className="text-xs font-semibold text-content">{humanStatus(learner.stage)}</p>
          </div>
        </div>
        <div className="card-flat flex items-center gap-3 p-4">
          <Wallet className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[0.58rem] uppercase tracking-[0.1em] text-faint">Budget</p>
            <p className="text-xs font-semibold text-content">
              up to {formatINR(learner.budgetMaxINR, { compact: true })}
            </p>
          </div>
        </div>
        <div className="card-flat flex items-center gap-3 p-4">
          <Flag className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[0.58rem] uppercase tracking-[0.1em] text-faint">Target</p>
            <p className="text-xs font-semibold text-content">{learner.targetIntake}</p>
          </div>
        </div>
        <div className="card-flat flex items-center gap-3 p-4">
          <CalendarCheck className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[0.58rem] uppercase tracking-[0.1em] text-faint">Next review</p>
            <p className="text-xs font-semibold text-content">
              {detail.queueRow.nextReview
                ? formatDate(detail.queueRow.nextReview.scheduledFor)
                : "Not scheduled"}
            </p>
          </div>
        </div>
      </div>

      {report?.status === "in_review" && (
        <Alert tone="warning" title="This report is waiting on you" className="mb-5">
          Review the narrative, shortlist and plan, then approve and release. The
          learner cannot see any of it until you do.
        </Alert>
      )}

      <Tabs
        defaultId="review"
        items={[
          {
            id: "review",
            label: "Review",
            content: reviewTab,
          },
          { id: "profile", label: "Profile & scores", content: profileTab },
          {
            id: "shortlist",
            label: "Shortlist",
            count: workspace.shortlist.length,
            content: shortlistTab,
          },
          {
            id: "applications",
            label: "Applications",
            count: workspace.applications.length,
            content: applicationsTab,
          },
          {
            id: "history",
            label: "History",
            count: detail.reports.length,
            content: historyTab,
          },
          { id: "plan", label: "Plan & reviews", content: planTab },
        ]}
      />

      <div className="mt-6 flex items-start gap-2 text-[0.66rem] leading-5 text-faint">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Confidential learner record. Access and every mutation are written to
          the audit trail. Do not share screenshots or exports outside the
          counselling team.
        </p>
      </div>
    </>
  );
}
