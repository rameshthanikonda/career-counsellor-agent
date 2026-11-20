/**
 * Applies every file in supabase/migrations in filename order.
 *
 *   npm run supabase:apply
 *
 * Requires a direct Postgres connection string in .env.local:
 *
 *   DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.<project-ref>.supabase.co:5432/postgres
 *
 * Supabase → Project Settings → Database → Connection string → URI.
 * This is different from the REST service-role key; DDL cannot run over
 * PostgREST. Use the SQL editor instead if you prefer not to share the
 * database password with the app environment.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { loadLocalEnv } from "./env";

async function main() {
  loadLocalEnv();

  const connectionString =
    process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
  if (!connectionString) {
    console.error(
      "Missing DATABASE_URL. Add the Supabase direct connection string to .env.local, e.g.\n" +
        "DATABASE_URL=postgresql://postgres:PASSWORD@db.<project-ref>.supabase.co:5432/postgres"
    );
    process.exit(1);
  }

  const local = /(localhost|127\.0\.0\.1)/i.test(connectionString);
  const client = new Client({
    connectionString,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Postgres.");

  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await fs.readdir(dir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error(`No .sql migrations found in ${dir}`);
    process.exit(1);
  }

  for (const file of files) {
    const sql = await fs.readFile(path.join(dir, file), "utf8");
    process.stdout.write(`Applying ${file}… `);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("COMMIT");
      console.log("done");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("failed");
      throw error;
    }
  }

  await client.end();
  console.log("\nMigrations applied. Next: npm run supabase:check && npm run supabase:push");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
