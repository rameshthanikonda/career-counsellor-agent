import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { getLearnerWorkspace } from "@/lib/services/workspace";
import { renderReportPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams the counselling report PDF.
 *
 * Access rules mirror the human checkpoint:
 * - a learner may download only their own report, and only once it is
 *   released by a counsellor;
 * - counsellor and admin accounts may download any report for review,
 *   including drafts, which carry a "DRAFT - NOT RELEASED" watermark.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    const url = new URL(request.url);
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(url.pathname)}`, url.origin)
    );
  }

  const { id } = await params;
  const store = getStore();
  const report = await store.getReportById(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const learner = await store.getLearnerById(report.learnerId);
  if (!learner) {
    return NextResponse.json({ error: "Learner not found." }, { status: 404 });
  }

  const isLearner = user.role === "learner";
  if (isLearner) {
    if (learner.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (report.status !== "released") {
      return NextResponse.json(
        {
          error:
            "This report has not been released yet. A counsellor reviews it before it reaches you.",
          status: report.status,
        },
        { status: 403 }
      );
    }
  }

  const workspace = await getLearnerWorkspace(learner.id);
  const counsellor = report.counsellorId
    ? await store.getUserById(report.counsellorId)
    : null;

  const buffer = await renderReportPdf({
    report,
    learner,
    assessment: workspace.assessment,
    shortlist: workspace.shortlist,
    plan: workspace.plan,
    paths: workspace.paths,
    counsellorName: counsellor?.name ?? null,
    audience: isLearner ? "learner" : "counsellor",
  });

  const filename = `Northstar-${report.verificationCode}-v${report.version}.pdf`;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
