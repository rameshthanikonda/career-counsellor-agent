"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  LockKeyhole,
  Save,
  ShieldAlert,
} from "lucide-react";
import type { Licence, LicenceStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/field";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export interface LicenceRow {
  licence: Licence;
  status: LicenceStatus;
  seatsRemaining: number;
  usable: boolean;
}

const STATUS_TONE: Record<LicenceStatus, "success" | "brass" | "clay" | "neutral"> = {
  active: "success",
  pending: "brass",
  expired: "clay",
  suspended: "clay",
};

export function LicenceManager({ rows }: { rows: LicenceRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <LicenceCard key={row.licence.id} row={row} />
      ))}
    </div>
  );
}

function LicenceCard({ row }: { row: LicenceRow }) {
  const { licence, status, seatsRemaining, usable } = row;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<LicenceStatus>(licence.status);
  const [validTo, setValidTo] = useState(licence.validTo.slice(0, 10));
  const [seats, setSeats] = useState(String(licence.seats));
  const [seatsUsed, setSeatsUsed] = useState(String(licence.seatsUsed));
  const [notes, setNotes] = useState(licence.notes ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/licences/${licence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          validTo,
          seats: Number(seats),
          seatsUsed: Number(seatsUsed),
          notes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update the licence.");
        return;
      }
      setMessage("Licence updated and audited. The assessment gate re-reads this register.");
      setOpen(false);
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  const pct = licence.seats > 0 ? Math.round((licence.seatsUsed / licence.seats) * 100) : 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-panel px-4 py-4",
        usable ? "border-line" : "border-clay-500/30"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-content">
              {licence.instrumentName}
            </p>
            <Badge tone={STATUS_TONE[status]} dot>
              {status}
            </Badge>
            {!usable && (
              <span className="inline-flex items-center gap-1 text-[0.62rem] font-medium text-clay-600 dark:text-clay-300">
                <ShieldAlert className="h-3 w-3" /> administration blocked
              </span>
            )}
          </div>
          <p className="mt-1 text-[0.68rem] text-muted">
            {licence.provider} · {licence.licenceRef} · valid {formatDate(licence.validFrom)} to{" "}
            {formatDate(licence.validTo)}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-faint">{licence.scope}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          Manage <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[0.62rem] text-faint">
          <span>
            {licence.seatsUsed.toLocaleString("en-IN")} /{" "}
            {licence.seats.toLocaleString("en-IN")} seats used
          </span>
          <span>{seatsRemaining.toLocaleString("en-IN")} remaining</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel2">
          <div
            className={cn(
              "h-full rounded-full",
              pct >= 90 ? "bg-clay-500" : pct >= 70 ? "bg-brass-500" : "bg-brand"
            )}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      {licence.notes && (
        <p className="mt-3 rounded-lg bg-panel2/60 px-3 py-2 text-[0.65rem] leading-5 text-muted">
          {licence.notes}
        </p>
      )}

      {message && <Alert tone="success" className="mt-3">{message}</Alert>}
      {error && <Alert tone="warning" className="mt-3">{error}</Alert>}

      {open && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Status" hint="Suspension takes effect immediately.">
              <Select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value as LicenceStatus)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </Select>
            </Field>
            <Field label="Valid to">
              <Input
                type="date"
                value={validTo}
                onChange={(event) => setValidTo(event.target.value)}
              />
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Total seats">
              <Input
                type="number"
                min={0}
                value={seats}
                onChange={(event) => setSeats(event.target.value)}
              />
            </Field>
            <Field label="Seats used">
              <Input
                type="number"
                min={0}
                value={seatsUsed}
                onChange={(event) => setSeatsUsed(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save licence
            </Button>
            <p className="inline-flex items-center gap-1.5 text-[0.65rem] text-muted">
              <LockKeyhole className="h-3 w-3" /> Changes are audited with your account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
