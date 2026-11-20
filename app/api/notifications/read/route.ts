import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  await getStore().markNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
