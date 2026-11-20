import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal/versions";
import { getStore } from "@/lib/store";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { AuditEvent, User } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: "Accept the privacy notice to create an account." }),
  }),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Accept the counselling terms to create an account." }),
  }),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = checkRateLimit(`signup:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 }
    );
  }

  const store = getStore();
  const email = parsed.data.email.trim().toLowerCase();
  const existing = await store.getUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(parsed.data.password),
    role: "learner",
    name: parsed.data.name.trim(),
    createdAt: now,
    lastLoginAt: now,
    privacyAcceptedAt: now,
    privacyVersion: PRIVACY_VERSION,
  };
  try {
    await store.createUser(user);
  } catch {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 }
    );
  }

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "learner",
    action: "user.signed_up",
    entity: "user",
    entityId: user.id,
    metadata: {
      privacyVersion: PRIVACY_VERSION,
      termsVersion: TERMS_VERSION,
      acceptedAt: now,
      source: "self_signup",
    },
    createdAt: now,
  } satisfies AuditEvent);

  const staff = (await store.listUsers()).filter(
    (member) => member.role === "admin" || member.role === "counsellor"
  );
  await Promise.all(
    staff.map((member) =>
      store.saveNotification({
        id: crypto.randomUUID(),
        userId: member.id,
        title: "New learner account",
        body: `${user.name} created an account and will complete onboarding next.`,
        href: "/counsellor",
        read: false,
        createdAt: now,
      })
    )
  );

  const token = await createSessionToken(user);
  const response = NextResponse.json({ ok: true, redirect: "/onboarding" });
  response.cookies.set({
    ...(await sessionCookieOptions()),
    name: SESSION_COOKIE,
    value: token,
  });
  return response;
}
