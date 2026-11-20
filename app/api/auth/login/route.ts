import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/roles";
import { getStore } from "@/lib/store";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = checkRateLimit(`login:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and password." },
      { status: 400 }
    );
  }

  const store = getStore();
  const user = await store.getUserByEmail(parsed.data.email);

  // Constant-ish response: never reveal whether the account exists.
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Those credentials do not match an account." },
      { status: 401 }
    );
  }

  await store.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  const token = await createSessionToken(user);
  const response = NextResponse.json({
    ok: true,
    role: user.role,
    redirect: homeFor(user.role),
  });
  response.cookies.set({
    ...(await sessionCookieOptions()),
    value: token,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
