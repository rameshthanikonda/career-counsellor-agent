import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import type { AuditEvent } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["open", "reviewing", "resolved"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Administrator access only" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const store = getStore();
  const feedback = (await store.listFeedback()).find((item) => item.id === id);
  if (!feedback) return NextResponse.json({ error: "Feedback not found." }, { status: 404 });

  const now = new Date().toISOString();
  const next = { ...feedback, status: parsed.data.status, updatedAt: now };
  await store.saveFeedback(next);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "admin",
    action: `feedback.${parsed.data.status}`,
    entity: "feedback",
    entityId: feedback.id,
    metadata: { from: feedback.status, to: parsed.data.status },
    createdAt: now,
  } satisfies AuditEvent);

  return NextResponse.json({ ok: true, feedback: next });
}
