import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { isMinor as calculateMinor } from "@/lib/auth/age";
import { onboardingSchema } from "@/lib/validation/onboarding";
import type { AuditEvent, Learner } from "@/lib/types";

export const runtime = "nodejs";

const CONSENT_VERSION = "2026-07";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (user.role !== "learner") {
    return NextResponse.json({ error: "Learner access only." }, { status: 403 });
  }
  const json = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some details need attention.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const store = getStore();
  const existing = await store.getLearnerByUserId(user.id);
  const now = new Date().toISOString();
  const dateOfBirth = (data.dateOfBirth ?? "").trim();
  const isMinor = dateOfBirth ? calculateMinor(dateOfBirth) : false;

  if (isMinor && !data.guardianConsent) {
    return NextResponse.json(
      { error: "Guardian consent is required for learners under 18." },
      { status: 400 }
    );
  }

  const learner: Learner = {
    id: existing?.id ?? crypto.randomUUID(),
    userId: user.id,
    stage: data.stage,
    fullName: data.fullName,
    email: user.email,
    phone: data.phone || undefined,
    dateOfBirth: dateOfBirth || undefined,
    city: data.city,
    country: data.country,
    currentEducation: data.currentEducation,
    institution: data.institution || undefined,
    percentage: data.percentage ?? undefined,
    subjects: data.subjects,
    backlogs: data.backlogs,
    englishTest: {
      type: data.englishTestType,
      score: data.englishTestScore ?? undefined,
    },
    workExperienceMonths: data.workExperienceMonths,
    targetIntake: data.targetIntake,
    budgetMinINR: data.budgetMinINR,
    budgetMaxINR: data.budgetMaxINR,
    preferredCountries: data.preferredCountries,
    preferredModes: data.preferredModes,
    interestAreas: data.interestAreas,
    careerGoal: data.careerGoal,
    intendedClusterId: data.intendedClusterId || undefined,
    consent: {
      dataProcessing: true,
      counsellingDisclaimer: true,
      guardianConsent: data.guardianConsent,
      version: CONSENT_VERSION,
      acceptedAt: now,
    },
    onboardingCompletedAt: existing?.onboardingCompletedAt ?? now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await store.saveLearner(learner);
  await store.updateUser(user.id, { name: data.fullName, phone: data.phone || undefined });

  const audit: AuditEvent = {
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: data.fullName,
    actorRole: "learner",
    action: existing ? "learner.profile_updated" : "learner.onboarded",
    entity: "learner",
    entityId: learner.id,
    metadata: {
      stage: data.stage,
      consentVersion: CONSENT_VERSION,
      guardianConsent: data.guardianConsent,
    },
    createdAt: now,
  };
  await store.appendAudit(audit);

  const staff = (await store.listUsers()).filter(
    (u) => u.role === "counsellor" || u.role === "admin"
  );
  await Promise.all(
    staff.map((member) =>
      store.saveNotification({
        id: crypto.randomUUID(),
        userId: member.id,
        title: existing ? "Learner profile updated" : "New learner onboarded",
        body: `${data.fullName} ${existing ? "updated their profile" : "completed onboarding"}.`,
        href: `/counsellor/learner/${learner.id}`,
        read: false,
        createdAt: now,
      })
    )
  );

  return NextResponse.json({ ok: true, learnerId: learner.id, redirect: "/learner" });
}
