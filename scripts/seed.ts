/**
 * Resets the local JSON store to the deterministic demo dataset.
 *
 *   npm run seed          # refuses to overwrite an existing database
 *   npm run seed -- --force
 *
 * This script never touches the Supabase backend. Use `npm run supabase:push`
 * for that, after applying supabase/migrations/0001_init.sql.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { createSeedDatabase, DEMO_ACCOUNTS } from "@/lib/store/seed";

async function main() {
  if ((process.env.DATA_BACKEND ?? "file").toLowerCase() === "supabase") {
    console.error(
      "DATA_BACKEND=supabase is set. This script only seeds the local file store."
    );
    console.error("Use `npm run supabase:push` for the Postgres backend.");
    process.exitCode = 1;
    return;
  }

  const force = process.argv.includes("--force");
  const dir = process.env.NORTHSTAR_DATA_DIR
    ? path.resolve(process.env.NORTHSTAR_DATA_DIR)
    : path.join(process.cwd(), ".data");
  const file = path.join(dir, "db.json");

  try {
    await fs.access(file);
    if (!force) {
      console.error(`${file} already exists.`);
      console.error("Re-run with --force to overwrite the demo data.");
      process.exitCode = 1;
      return;
    }
  } catch {
    // no existing database, safe to create
  }

  const db = createSeedDatabase();
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, file);

  console.log(`Seeded ${file}`);
  console.log(
    [
      `${db.users.length} users`,
      `${db.learners.length} learners`,
      `${db.assessments.length} assessments`,
      `${db.courses.length} courses`,
      `${db.careerPaths.length} career paths`,
      `${db.applications.length} applications`,
      `${db.feedback.length} feedback items`,
      `${db.reports.length} reports`,
      `${db.reviews.length} reviews`,
    ].join(" · ")
  );
  console.log("\nDemo accounts (password for all):");
  for (const account of DEMO_ACCOUNTS) {
    console.log(`  ${account.role.padEnd(10)} ${account.email.padEnd(30)} ${account.blurb}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
