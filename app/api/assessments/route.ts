import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { INSTRUMENT_NAME, INSTRUMENT_VERSION } from "@/lib/assessment/instruments";
import type { Assessment, AuditEvent } from "@/lib/types";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  assertInstrumentLicensed,
  consumeLicenceSeat,
  LicenceError,
} from "@/lib/services/licensing";

export const runtime = "nodejs";

const bodySchema = z.object({}).optional();

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "learner")
    return NextResponse.json({ error: "Learner access only" }, { status: 403 });

  const limit = checkRateLimit(`assessment-start:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Please wait before starting again." }, { status: 429 });
  }

  const store = getStore();
  const learner = await store.getLearnerByUserId(user.id);
  if (!learner) {
    return NextResponse.json({ error: "Complete your profile first." }, { status: 409 });
  }

  await request.json().catch(() => null);
  bodySchema.safeParse(null);

  const existing = await store.getAssessmentByLearner(learner.id);
  if (existing?.status === "completed") {
    return NextResponse.json(
      { error: "Your assessment is already complete.", assessmentId: existing.id },
      { status: 409 }
    );
  }

  // Guardrail: the instrument may only be administered under a valid licence.
  let licence;
  try {
    licence = (await assertInstrumentLicensed(INSTRUMENT_NAME)).licence;
  } catch (error) {
    if (error instanceof LicenceError) {
      const nowIso = new Date().toISOString();
      await store.appendAudit({
        id: crypto.randomUUID(),
        actorId: user.id,
        actorName: user.name,
        actorRole: "learner",
        action: "instrument.administration_blocked",
        entity: "licence",
        entityId: error.licence?.id,
        metadata: { instrument: INSTRUMENT_NAME, code: error.code },
        createdAt: nowIso,
      } satisfies AuditEvent);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 }
      );
    }
    throw error;
  }

  const now = new Date().toISOString();
  const assessment: Assessment =
    existing ??
    ({
      id: crypto.randomUUID(),
      learnerId: learner.id,
      instrumentVersion: INSTRUMENT_VERSION,
      status: "in_progress",
      startedAt: now,
      responses: {},
      createdAt: now,
      updatedAt: now,
    } satisfies Assessment);

  if (existing) {
    assessment.status = "in_progress";
    assessment.startedAt = existing.startedAt ?? now;
    assessment.updatedAt = now;
  }

  await store.saveAssessment(assessment);

  // A new administration consumes one licensed seat. Resuming an existing
  // in-progress assessment does not.
  if (!existing) {
    await consumeLicenceSeat(licence);
  }

  const audit: AuditEvent = {
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "learner",
    action: "assessment.started",
    entity: "assessment",
    entityId: assessment.id,
    metadata: { instrument: INSTRUMENT_VERSION },
    createdAt: now,
  };
  await store.appendAudit(audit);

  return NextResponse.json({ ok: true, assessmentId: assessment.id });
}
