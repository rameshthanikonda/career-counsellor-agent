import "server-only";
import type { Licence, LicenceStatus } from "@/lib/types";
import { getStore } from "@/lib/store";

/**
 * Instrument licensing gate.
 *
 * The catalogue contains a licence register (see the admin workspace). An
 * instrument may only be administered while its licence is `active`, inside
 * its validity window and with seats remaining. This module is the single
 * enforcement point used by the assessment API, so a missing, expired or
 * exhausted licence blocks administration rather than being merely displayed.
 */

export class LicenceError extends Error {
  readonly code:
    | "licence_missing"
    | "licence_expired"
    | "licence_pending"
    | "licence_suspended"
    | "licence_not_started"
    | "seats_exhausted";
  readonly licence: Licence | null;

  constructor(
    code: LicenceError["code"],
    message: string,
    licence: Licence | null = null
  ) {
    super(message);
    this.name = "LicenceError";
    this.code = code;
    this.licence = licence;
  }
}

/** Status after taking the validity dates into account, not just the stored flag. */
export function effectiveLicenceStatus(
  licence: Licence,
  now: Date = new Date()
): LicenceStatus {
  if (licence.status === "suspended" || licence.status === "pending") {
    return licence.status;
  }
  if (new Date(licence.validTo).getTime() < now.getTime()) return "expired";
  if (new Date(licence.validFrom).getTime() > now.getTime()) return "pending";
  return licence.status;
}

export function seatsRemaining(licence: Licence): number {
  return Math.max(0, licence.seats - licence.seatsUsed);
}

export function describeLicence(licence: Licence) {
  const status = effectiveLicenceStatus(licence);
  return {
    licence,
    status,
    seatsRemaining: seatsRemaining(licence),
    usable: status === "active" && seatsRemaining(licence) > 0,
  };
}

export async function findLicenceForInstrument(
  instrumentName: string
): Promise<Licence | null> {
  const store = getStore();
  const licences = await store.listLicences();
  return (
    licences.find(
      (licence) =>
        licence.instrumentName.trim().toLowerCase() ===
        instrumentName.trim().toLowerCase()
    ) ?? null
  );
}

/**
 * Throws LicenceError when the named instrument must not be administered.
 * Returns the licence (and its effective status) when it may be used.
 */
export async function assertInstrumentLicensed(instrumentName: string) {
  const licence = await findLicenceForInstrument(instrumentName);
  if (!licence) {
    throw new LicenceError(
      "licence_missing",
      `${instrumentName} has no licence on record. Administration is blocked until the counselling lead records one.`
    );
  }

  const status = effectiveLicenceStatus(licence);
  if (status === "expired") {
    throw new LicenceError(
      "licence_expired",
      `The ${licence.instrumentName} licence expired on ${licence.validTo}. Administration is blocked until it is renewed.`,
      licence
    );
  }
  if (status === "pending") {
    throw new LicenceError(
      "licence_pending",
      `The ${licence.instrumentName} licence is not active yet (valid from ${licence.validFrom}).`,
      licence
    );
  }
  if (status === "suspended") {
    throw new LicenceError(
      "licence_suspended",
      `The ${licence.instrumentName} licence is suspended. Administration is blocked.`,
      licence
    );
  }
  if (seatsRemaining(licence) <= 0) {
    throw new LicenceError(
      "seats_exhausted",
      `The ${licence.instrumentName} licence has no seats remaining (${licence.seatsUsed}/${licence.seats}).`,
      licence
    );
  }

  return { licence, status, seatsRemaining: seatsRemaining(licence) };
}

/** Increments seats used by one. Call only when a new administration starts. */
export async function consumeLicenceSeat(licence: Licence): Promise<Licence> {
  const store = getStore();
  const updated: Licence = {
    ...licence,
    seatsUsed: Math.min(licence.seats, licence.seatsUsed + 1),
    updatedAt: new Date().toISOString(),
  };
  await store.saveLicence(updated);
  return updated;
}

export async function licenceRegister() {
  const store = getStore();
  const licences = await store.listLicences();
  return licences
    .map(describeLicence)
    .sort((a, b) => {
      const rank: Record<LicenceStatus, number> = {
        active: 0,
        pending: 1,
        expired: 2,
        suspended: 3,
      };
      return rank[a.status] - rank[b.status] || a.licence.instrumentName.localeCompare(b.licence.instrumentName);
    });
}
