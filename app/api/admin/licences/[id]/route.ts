import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { effectiveLicenceStatus } from "@/lib/services/licensing";
import type { AuditEvent, Licence } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["active", "expired", "pending", "suspended"]).optional(),
  validTo: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date")
    .optional(),
  seats: z.number().int().min(0).max(10_000_000).optional(),
  seatsUsed: z.number().int().min(0).max(10_000_000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Updates one licence. This is the only write path for the register, and it is
 * admin-only. The assessment API re-reads the register on every start, so a
 * suspension takes effect immediately for new administrations.
 */
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
  const store = getStore();
  const licence = await store.getLicenceById(id);
  if (!licence) {
    return NextResponse.json({ error: "Licence not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some licence fields are invalid.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const next: Licence = {
    ...licence,
    status: parsed.data.status ?? licence.status,
    validTo: parsed.data.validTo ?? licence.validTo,
    seats: parsed.data.seats ?? licence.seats,
    seatsUsed: parsed.data.seatsUsed ?? licence.seatsUsed,
    notes: parsed.data.notes !== undefined ? parsed.data.notes || undefined : licence.notes,
    updatedAt: new Date().toISOString(),
  };

  if (next.seatsUsed > next.seats) {
    return NextResponse.json(
      { error: "Seats used cannot exceed total seats." },
      { status: 400 }
    );
  }

  await store.saveLicence(next);

  await store.appendAudit({
    id: crypto.randomUUID(),
    actorId: user.id,
    actorName: user.name,
    actorRole: "admin",
    action: "licence.updated",
    entity: "licence",
    entityId: licence.id,
    metadata: {
      instrument: licence.instrumentName,
      before: {
        status: licence.status,
        seats: licence.seats,
        seatsUsed: licence.seatsUsed,
        validTo: licence.validTo,
      },
      after: {
        status: next.status,
        seats: next.seats,
        seatsUsed: next.seatsUsed,
        validTo: next.validTo,
      },
      effectiveStatus: effectiveLicenceStatus(next),
    },
    createdAt: next.updatedAt,
  } satisfies AuditEvent);

  return NextResponse.json({ ok: true, licence: next });
}
