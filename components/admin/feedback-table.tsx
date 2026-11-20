"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Feedback, FeedbackStatus } from "@/lib/types";
import { Badge, humanStatus } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { formatDateTime } from "@/lib/utils/format";

const STATUS_TONE: Record<FeedbackStatus, "clay" | "brass" | "success"> = {
  open: "clay",
  reviewing: "brass",
  resolved: "success",
};

const CATEGORY_TONE: Record<Feedback["category"], "clay" | "brand" | "brass" | "neutral" | "slate"> = {
  bug: "clay",
  idea: "brand",
  content: "brass",
  counselling: "slate",
  other: "neutral",
};

export function FeedbackTable({ items }: { items: Feedback[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(id: string, status: FeedbackStatus) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update the item.");
        return;
      }
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-muted">
        No feedback in this filter.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="border-b border-line px-5 py-2 text-xs text-clay-600 dark:text-clay-300">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={CATEGORY_TONE[item.category]}>
                    {humanStatus(item.category)}
                  </Badge>
                  <Badge tone={STATUS_TONE[item.status]} dot>
                    {humanStatus(item.status)}
                  </Badge>
                  {item.rating && <Badge tone="outline">{item.rating}/5</Badge>}
                </div>
                <p className="mt-2 text-xs leading-5 text-content">{item.message}</p>
                <p className="mt-1.5 text-[0.62rem] text-faint">
                  {item.name} · {item.role} · {formatDateTime(item.createdAt)}
                  {item.page ? ` · ${item.page}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {busy === item.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
                <Select
                  value={item.status}
                  onChange={(event) => update(item.id, event.target.value as FeedbackStatus)}
                  aria-label={`Status for feedback from ${item.name}`}
                  className="h-8 w-36 text-xs"
                  disabled={busy === item.id}
                >
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                </Select>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
