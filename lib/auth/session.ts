import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PublicUser, Role } from "@/lib/types";
import { getStore } from "@/lib/store";

export const SESSION_COOKIE = "ns_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  sub: string;
  role: Role;
  name: string;
  email: string;
  exp: number;
  /** Session generation; a password change increments it. */
  sv: number;
}

let cachedSecret: string | null = null;

async function resolveSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const env = process.env.AUTH_SECRET;
  if (env && env.length >= 32 && !env.startsWith("replace-with")) {
    cachedSecret = env;
    return env;
  }
  // Development fallback: generate once and persist outside the repo.
  const dir = path.join(process.cwd(), ".data");
  const file = path.join(dir, "auth-secret");
  try {
    const existing = (await fs.readFile(file, "utf8")).trim();
    if (existing.length >= 32) {
      cachedSecret = existing;
      return existing;
    }
  } catch {
    // generate below
  }
  const generated = randomBytes(48).toString("base64url");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, generated, { mode: 0o600 });
  cachedSecret = generated;
  return generated;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export async function createSessionToken(
  user: Pick<PublicUser, "id" | "role" | "name" | "email" | "sessionVersion">
): Promise<string> {
  const secret = await resolveSecret();
  const payload: SessionPayload = {
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    sv: user.sessionVersion ?? 0,
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const secret = await resolveSecret();
  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!payload.sub || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function getSessionPayload() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const store = getStore();
  const user = await store.getUserById(payload.sub);
  if (!user) return null;
  if ((payload.sv ?? 0) !== (user.sessionVersion ?? 0)) return null;
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function requireUser(roles?: Role[]): Promise<PublicUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/forbidden");
  return user;
}

export async function requireCounsellor(): Promise<PublicUser> {
  return requireUser(["counsellor", "admin"]);
}

export async function requireAdmin(): Promise<PublicUser> {
  return requireUser(["admin"]);
}
