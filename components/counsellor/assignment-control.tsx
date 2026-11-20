"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

export function AssignmentControl({
  learnerId,
  current,
  staff,
}: {
  learnerId: string;
  current: string | null;
  staff: { id: string; name: string; role: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const assigned = staff.find((member) => member.id === (current ?? ""));

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/counsellor/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId, counsellorId: value || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save the assignment.");
        return;
      }
      setMessage(
        value
          ? `Assigned to ${staff.find((member) => member.id === value)?.name ?? "counsellor"}.`
          : "Learner unassigned."
      );
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-panel px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-faint">
              Accountable counsellor
            </p>
            <p className="text-xs font-medium text-content">
              {assigned?.name ?? "Not assigned"}
            </p>
          </div>
          {assigned && (
            <Badge tone="outline" className="ml-1">
              <UserCheck className="h-3 w-3" /> {assigned.role}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-label="Assign counsellor"
            className="h-9 min-w-[13rem] text-xs"
          >
            <option value="">Unassigned</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.role}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" onClick={save} disabled={busy || value === (current ?? "")}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
      {message && <p className="mt-2 text-[0.68rem] text-brand">{message}</p>}
      {error && <p className="mt-2 text-[0.68rem] text-clay-600 dark:text-clay-300">{error}</p>}
    </div>
  );
}
