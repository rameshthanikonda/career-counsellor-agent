import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import type { AuditEvent, Feedback } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  category: z.enum(["bug", "idea", "content", "counselling", "other"]),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters).").max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  page: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to send feedback." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid feedback." },
      { status: 400 }
    );
  }

  const store = getStore();
  const now = new Date().toISOString();
  const feedback: Feedback = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    category: parsed.data.category,
    message: parsed.data.message,
    rating: parsed.data.rating,
    page: parsed.data.page || undefined,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
  await store.saveFeedback(feedback);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "feedback.created",
    entity: "feedback",
    entityId: feedback.id,
    metadata: { category: feedback.category, rating: feedback.rating ?? null },
    createdAt: now,
  } satisfies AuditEvent);

  const admins = (await store.listUsers()).filter((member) => member.role === "admin");
  await Promise.all(
    admins
      .filter((admin) => admin.id !== user.id)
      .map((admin) =>
        store.saveNotification({
          id: crypto.randomUUID(),
          userId: admin.id,
          title: "New product feedback",
          body: `${user.name} (${user.role}) sent ${feedback.category} feedback.`,
          href: "/admin/feedback",
          read: false,
          createdAt: now,
        })
      )
  );

  return NextResponse.json({ ok: true, feedback });
}
