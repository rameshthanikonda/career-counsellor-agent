/**
 * Verifies that a Supabase project is reachable and has every Northstar table.
 *
 *   npm run supabase:check
 *
 * Reads .env.local (or the shell environment). It never writes data and never
 * prints the service key.
 */
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env";

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

async function main() {
  loadLocalEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
    process.exit(1);
  }

  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
    process.exit(1);
  }

  console.log(`Checking Supabase project ${host}…`);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let missing = 0;
  for (const table of TABLES) {
    // A HEAD/count request against a missing relation can return 0 with no
    // error through PostgREST, so read one row to force a real schema check.
    const { count, error } = await client
      .from(table)
      .select("id", { count: "exact" })
      .limit(1);
    if (error) {
      missing += 1;
      const hint = error.message.toLowerCase().includes("does not exist")
        ? "table missing — apply the migration"
        : error.message;
      console.log(`  FAIL  ${table.padEnd(18)} ${hint}`);
    } else {
      console.log(`  OK    ${table.padEnd(18)} ${count ?? 0} rows`);
    }
  }

  if (missing > 0) {
    console.error(
      `\n${missing} table(s) failed. Apply supabase/migrations/0001_init.sql and 0002_applications.sql in the SQL editor or with \`supabase db push\`.`
    );
    process.exit(1);
  }

  console.log("\nAll tables reachable. Set DATA_BACKEND=supabase and restart the app.");
  console.log("To load the demo dataset: npm run supabase:push");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
