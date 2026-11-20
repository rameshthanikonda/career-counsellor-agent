"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileCheck2,
  Lock,
  RotateCcw,
  Save,
  Send,
  Loader2,
} from "lucide-react";
import type { Report } from "@/lib/types";
import { Badge, humanStatus, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Textarea } from "@/components/ui/field";
import { formatDate } from "@/lib/utils/format";

type Action = "save" | "approve" | "release" | "approve_and_release" | "return";

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayToLines(values: string[]) {
  return values.join("\n");
}

export function ReportConsole({
  report,
  learnerName,
}: {
  report: Report;
  learnerName: string;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(report.narrative.summary);
  const [strengths, setStrengths] = useState(arrayToLines(report.narrative.strengths));
  const [considerations, setConsiderations] = useState(
    arrayToLines(report.narrative.considerations)
  );
  const [recommendations, setRecommendations] = useState(
    arrayToLines(report.narrative.recommendations)
  );
  const [guardrailNote, setGuardrailNote] = useState(
    report.narrative.guardrailNote
  );
  const [counsellorNotes, setCounsellorNotes] = useState(
    report.counsellorNotes ?? ""
  );
  const [learnerFacingNote, setLearnerFacingNote] = useState(
    report.learnerFacingNote ?? ""
  );
  const [returnedReason, setReturnedReason] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const released = report.status === "released";

  async function submit(action: Action) {
    if (released && action !== "save") {
      setError("This report is already released.");
      return;
    }
    if (action === "return" && returnedReason.trim().length < 10) {
      setError("Give the learner a specific reason of at least 10 characters.");
      return;
    }
    if (
      (action === "approve" || action === "approve_and_release") &&
      summary.trim().length < 40
    ) {
      setError("The summary needs at least 40 characters before approval.");
      return;
    }
    if (action === "release" || action === "approve_and_release") {
      const confirmed = window.confirm(
        `Release version ${report.version} to ${learnerName}? They will be able to read the report and download the PDF. Released reports should not be edited afterwards.`
      );
      if (!confirmed) return;
    }

    setBusy(action);
    setError(null);
    setMessage(null);

    const payload: Record<string, unknown> = { action };
    if (action !== "return") {
      payload.narrative = {
        summary,
        strengths: linesToArray(strengths),
        considerations: linesToArray(considerations),
        recommendations: linesToArray(recommendations),
        guardrailNote,
      };
      payload.counsellorNotes = counsellorNotes;
      payload.learnerFacingNote = learnerFacingNote;
    } else {
      payload.returnedReason = returnedReason;
    }

    try {
      const response = await fetch(`/api/counsellor/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const issues = Array.isArray(data.issues)
          ? ` ${data.issues.map((issue: { path: string; message: string }) => `${issue.path}: ${issue.message}`).join("; ")}`
          : "";
        setError(`${data.error ?? "The report could not be updated."}${issues}`);
        return;
      }
      setMessage(
        action === "save"
          ? "Draft saved. Nothing has been released."
          : action === "approve"
            ? "Approved. Release it when you are ready for the learner to see it."
            : action === "return"
              ? "Returned to the learner with your reason."
              : "Released. The learner has been notified and the PDF is now available."
      );
      if (action === "return") setShowReturn(false);
      router.refresh();
    } catch {
      setError("The server could not be reached. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(report.status)} dot>
            {humanStatus(report.status)}
          </Badge>
          <span className="text-xs text-muted">
            v{report.version} · code{" "}
            <span className="font-mono">{report.verificationCode}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/reports/${report.id}/pdf?inline=1`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-lineStrong px-3 text-[0.8rem] font-medium text-content hover:bg-panel2"
          >
            <FileCheck2 className="h-3.5 w-3.5" /> Preview PDF
          </a>
        </div>
      </div>

      {released && (
        <Alert tone="success" title="Released report">
          This version was released on {formatDate(report.releasedAt)}. It is
          immutable: editing is disabled. A reassessment creates a new version.
        </Alert>
      )}

      {report.status === "returned" && report.returnedReason && (
        <Alert tone="warning" title="Returned for more information">
          {report.returnedReason}
        </Alert>
      )}

      {message && <Alert tone="success">{message}</Alert>}
      {error && (
        <Alert tone="warning" title="Could not save">
          {error}
        </Alert>
      )}

      <fieldset disabled={released} className="space-y-4">
        <Field
          label="Counsellor summary"
          hint="The interpretation the learner will read. Keep it specific to the evidence in this report."
        >
          <Textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={6}
            maxLength={3000}
          />
        </Field>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Strengths" hint="One per line. 1–8 items.">
            <Textarea
              value={strengths}
              onChange={(event) => setStrengths(event.target.value)}
              rows={5}
            />
          </Field>
          <Field label="Considerations" hint="One per line. 1–8 items.">
            <Textarea
              value={considerations}
              onChange={(event) => setConsiderations(event.target.value)}
              rows={5}
            />
          </Field>
        </div>

        <Field label="Recommendations" hint="One per line. 1–8 concrete next moves.">
          <Textarea
            value={recommendations}
            onChange={(event) => setRecommendations(event.target.value)}
            rows={5}
          />
        </Field>

        <Field
          label="Guardrail note"
          hint="Shown with the report. Keep the no-outcome-promise language intact."
        >
          <Textarea
            value={guardrailNote}
            onChange={(event) => setGuardrailNote(event.target.value)}
            rows={3}
            maxLength={2000}
          />
        </Field>

        <Field
          label="Learner-facing note"
          hint="Optional. A short personal note that appears above the report."
        >
          <Textarea
            value={learnerFacingNote}
            onChange={(event) => setLearnerFacingNote(event.target.value)}
            rows={3}
            maxLength={2000}
          />
        </Field>

        <Field
          label="Internal counsellor notes"
          hint="Not shown to the learner. Appears in the PDF's counsellor section only for staff copies."
        >
          <Textarea
            value={counsellorNotes}
            onChange={(event) => setCounsellorNotes(event.target.value)}
            rows={3}
            maxLength={3000}
          />
        </Field>
      </fieldset>

      {!released && (
        <div className="rounded-xl border border-line bg-panel2/30 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => submit("save")}
              disabled={Boolean(busy)}
            >
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save draft
            </Button>

            {report.status !== "approved" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => submit("approve")}
                disabled={Boolean(busy)}
              >
                {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve
              </Button>
            )}

            {report.status === "approved" && (
              <Button
                type="button"
                onClick={() => submit("release")}
                disabled={Boolean(busy)}
              >
                {busy === "release" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Release to learner
              </Button>
            )}

            {report.status !== "approved" && report.status !== "released" && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => submit("approve_and_release")}
                disabled={Boolean(busy)}
              >
                {busy === "approve_and_release" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Approve &amp; release
              </Button>
            )}

            <Button
              type="button"
              variant="danger"
              onClick={() => setShowReturn((value) => !value)}
              disabled={Boolean(busy)}
            >
              <RotateCcw className="h-4 w-4" /> Return
            </Button>
          </div>

          {showReturn && (
            <div className="mt-4 border-t border-line pt-4">
              <Field
                label="Reason for returning"
                hint="The learner sees this. Be specific about what is missing or needs to change."
              >
                <Textarea
                  value={returnedReason}
                  onChange={(event) => setReturnedReason(event.target.value)}
                  rows={3}
                  maxLength={1000}
                />
              </Field>
              <Button
                type="button"
                variant="danger"
                className="mt-3"
                onClick={() => submit("return")}
                disabled={Boolean(busy)}
              >
                {busy === "return" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Confirm return
              </Button>
            </div>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[0.68rem] leading-5 text-muted">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
            Saving keeps the report private. The learner sees nothing until you
            release it. Approval and release are separate gates so a second
            counsellor can check the work.
          </p>
        </div>
      )}

      {released && (
        <div className="rounded-xl border border-line bg-panel2/30 p-4">
          <p className="text-xs leading-5 text-muted">
            Released {formatDate(report.releasedAt)}. Learner satisfaction and the
            quarterly review continue in the Plan &amp; reviews tab.
          </p>
        </div>
      )}
    </div>
  );
}
