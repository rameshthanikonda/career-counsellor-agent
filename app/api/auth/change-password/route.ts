import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getStore } from "@/lib/store";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { AuditEvent } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const limit = checkRateLimit(`password:${session.id}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid password." },
      { status: 400 }
    );
  }

  const store = getStore();
  const user = await store.getUserById(session.id);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 403 });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json({ error: "Choose a password you have not used here." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = {
    ...user,
    passwordHash: hashPassword(parsed.data.newPassword),
    passwordChangedAt: now,
    sessionVersion: (user.sessionVersion ?? 0) + 1,
  };
  await store.updateUser(user.id, updated);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "user.password_changed",
    entity: "user",
    entityId: user.id,
    metadata: { sessionsInvalidated: true },
    createdAt: now,
  } satisfies AuditEvent);

  const token = await createSessionToken(updated);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...(await sessionCookieOptions()),
    name: SESSION_COOKIE,
    value: token,
  });
  return response;
}
