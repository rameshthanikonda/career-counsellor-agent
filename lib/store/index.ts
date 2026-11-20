import "server-only";
import type { Store } from "./types";
import { fileStore } from "./file";

let instance: Store | null = null;

/**
 * The storage backend is chosen once per server process.
 *
 * - `file` (default): zero-setup JSON store for local development, demos
 *   and evaluation. Seeded automatically on first request.
 * - `supabase`: Postgres via the Supabase service role. Requires
 *   DATA_BACKEND=supabase plus SUPABASE_SERVICE_ROLE_KEY and the
 *   migration in supabase/migrations/0001_init.sql.
 */
export function getStore(): Store {
  if (instance) return instance;
  const backend = (process.env.DATA_BACKEND ?? "file").toLowerCase();

  if (backend === "supabase") {
    // Loaded lazily so the file backend has no dependency on Supabase env.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseStore } = require("./supabase") as typeof import("./supabase");
    const store: Store = new SupabaseStore();
    instance = store;
    return store;
  }

  const store: Store = fileStore();
  instance = store;
  return store;
}

export type { Store };
