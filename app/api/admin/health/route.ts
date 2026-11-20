import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { geminiConfig, geminiCircuitState, generateContent } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  "users",
  "learners",
  "assessments",
  "courses",
  "career_paths",
  "shortlists",
  "applications",
  "plans",
  "milestones",
  "reports",
  "reviews",
  "satisfaction",
  "feedback",
  "licences",
  "audit",
  "advisor_messages",
  "notifications",
] as const;

type CheckStatus = "ok" | "warn" | "fail";

/**
 * Deployment health check used by the admin runtime panel. It verifies the
 * configured store, every Supabase table (when Postgres is selected) and the
 * model configuration. `?ping=1` makes a single tiny model call to validate
 * the Gemini key and reports latency.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Administrator access only" }, { status: 403 });
  }

  const backend = (process.env.DATA_BACKEND ?? "file").toLowerCase();
  const ping = new URL(request.url).searchParams.get("ping") === "1";
  const checks: { id: string; label: string; status: CheckStatus; detail: string }[] = [];

  // ── Store ──────────────────────────────────────────────────
  try {
    const stats = await getStore().stats();
    checks.push({
      id: "store",
      label: "Application store",
      status: "ok",
      detail: `${backend === "supabase" ? "Supabase/Postgres" : "Local JSON"} · ${stats.learners} learners · ${stats.reportsAwaitingReview} awaiting review`,
    });
  } catch (error) {
    checks.push({
      id: "store",
      label: "Application store",
      status: "fail",
      detail: (error as Error).message,
    });
  }

  // ── Supabase tables ────────────────────────────────────────
  let supabase:
    | {
        configured: boolean;
        urlHost: string | null;
        tables: Record<string, CheckStatus>;
        message: string;
      }
    | undefined;

  if (backend === "supabase") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) {
      supabase = {
        configured: false,
        urlHost: null,
        tables: {},
        message: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      };
      checks.push({
        id: "supabase",
        label: "Supabase",
        status: "fail",
        detail: supabase.message,
      });
    } else {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const tables: Record<string, CheckStatus> = {};
      for (const table of TABLES) {
        // Read one row rather than a HEAD count: PostgREST can return a
        // zero count with no error when the relation is absent.
        const { error } = await client
          .from(table)
          .select("id", { count: "exact" })
          .limit(1);
        tables[table] = error
          ? error.message.toLowerCase().includes("does not exist")
            ? "fail"
            : "warn"
          : "ok";
      }
      const failed = Object.values(tables).filter((status) => status === "fail").length;
      const warned = Object.values(tables).filter((status) => status === "warn").length;
      supabase = {
        configured: true,
        urlHost: (() => {
          try {
            return new URL(url).host;
          } catch {
            return null;
          }
        })(),
        tables,
        message:
          failed > 0
            ? `${failed} table(s) missing. Apply supabase/migrations/0001_init.sql and 0002_applications.sql.`
            : warned > 0
              ? `${warned} table(s) returned an unexpected error.`
              : "All tables reachable.",
      };
      checks.push({
        id: "supabase",
        label: "Supabase tables",
        status: failed > 0 ? "fail" : warned > 0 ? "warn" : "ok",
        detail: supabase.message,
      });
    }
  }

  // ── Gemini ─────────────────────────────────────────────────
  const gemini = geminiConfig();
  let geminiDetail = gemini.configured
    ? `${gemini.model} configured.`
    : "No GEMINI_API_KEY. The deterministic rule-based advisor is active.";
  let geminiStatus: CheckStatus = gemini.configured ? "ok" : "warn";

  if (ping) {
    if (!gemini.configured) {
      geminiDetail = "Cannot test: no GEMINI_API_KEY is configured.";
      geminiStatus = "warn";
    } else {
      const started = Date.now();
      try {
        const result = await generateContent({
          system: "You are a health check. Reply with the single word OK.",
          contents: [{ role: "user", parts: [{ text: "Health check" }] }],
          temperature: 0,
          maxOutputTokens: 8,
        });
        geminiDetail = `${gemini.model} responded in ${Date.now() - started}ms${
          result.text ? ` ("${result.text.slice(0, 40)}")` : ""
        }.`;
        geminiStatus = "ok";
      } catch (error) {
        geminiDetail = `${gemini.model} failed: ${(error as Error).message}`;
        geminiStatus = "fail";
      }
    }
  }

  checks.push({
    id: "gemini",
    label: "Gemini advisor",
    status: geminiStatus,
    detail: geminiDetail,
  });

  const healthy = checks.every((check) => check.status !== "fail");
  return NextResponse.json({
    ok: healthy,
    backend,
    generatedAt: new Date().toISOString(),
    checks,
    supabase,
    gemini: { configured: gemini.configured, model: gemini.model },
    circuit: geminiCircuitState(),
  });
}
