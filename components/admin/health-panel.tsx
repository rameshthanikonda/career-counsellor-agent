"use client";

import { useState } from "react";
import { Activity, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Check {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

interface HealthResult {
  ok: boolean;
  backend: string;
  generatedAt: string;
  checks: Check[];
  supabase?: {
    configured: boolean;
    urlHost: string | null;
    tables: Record<string, string>;
    message: string;
  };
  gemini: { configured: boolean; model: string };
}

const TONE: Record<Check["status"], "success" | "brass" | "clay"> = {
  ok: "success",
  warn: "brass",
  fail: "clay",
};

export function HealthPanel() {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [busy, setBusy] = useState<"check" | "ping" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(ping: boolean) {
    setBusy(ping ? "ping" : "check");
    setError(null);
    try {
      const response = await fetch(`/api/admin/health${ping ? "?ping=1" : ""}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Health check failed.");
        return;
      }
      setResult(data as HealthResult);
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => run(false)} disabled={Boolean(busy)}>
          {busy === "check" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Run health check
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => run(true)} disabled={Boolean(busy)}>
          {busy === "ping" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Test Gemini
        </Button>
      </div>

      {error && (
        <p className="text-xs font-medium text-clay-600 dark:text-clay-300">{error}</p>
      )}

      {result && (
        <div className="rounded-xl border border-line bg-panel2/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-faint">
              <Activity className="h-3 w-3" /> {result.backend} ·{" "}
              {new Date(result.generatedAt).toLocaleTimeString("en-IN")}
            </p>
            <Badge tone={result.ok ? "success" : "clay"} dot>
              {result.ok ? "Healthy" : "Needs attention"}
            </Badge>
          </div>
          <ul className="mt-2 space-y-1.5">
            {result.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2 text-[0.68rem] leading-5">
                <Badge tone={TONE[check.status]}>{check.label}</Badge>
                <span className="min-w-0 text-muted">{check.detail}</span>
              </li>
            ))}
          </ul>
          {result.supabase?.configured && (
            <div className="mt-2 border-t border-line pt-2">
              <p className="text-[0.62rem] text-faint">
                Supabase {result.supabase.urlHost ?? "project"}:{" "}
                {Object.entries(result.supabase.tables)
                  .filter(([, status]) => status !== "ok")
                  .map(([table, status]) => `${table} (${status})`)
                  .join(", ") || "all tables reachable"}
              </p>
            </div>
          )}
        </div>
      )}

      {!result && (
        <p className="text-[0.65rem] leading-5 text-muted">
          Verifies the active store, every Supabase table and the Gemini
          configuration. “Test Gemini” makes one small model call and reports
          latency, so a bad key is caught before a learner sees a fallback answer.
        </p>
      )}
    </div>
  );
}
