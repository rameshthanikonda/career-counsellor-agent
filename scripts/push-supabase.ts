/**
 * Bootstraps a Supabase/Postgres project from the demo dataset.
 *
 *   1. Apply supabase/migrations/0001_init.sql in the Supabase project.
 *   2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *   3. npm run supabase:push            # refuses a non-empty database
 *      npm run supabase:push -- --force # upserts over existing seed ids
 *
 * The service-role key bypasses row-level security. Run this from a trusted
 * machine only; never ship the key to a browser.
 */
import { createClient } from "@supabase/supabase-js";
import { createSeedDatabase } from "@/lib/store/seed";
import { loadLocalEnv } from "./env";
import type { Database } from "@/lib/types";

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Add it to .env.local or the shell environment.`);
    process.exit(1);
  }
  return value;
}

type Row = Record<string, unknown>;

function withMeta(
  payload: { id: string; createdAt?: string; updatedAt?: string },
  columns: Row = {}
): Row {
  return {
    id: payload.id,
    payload,
    ...(payload.createdAt ? { created_at: payload.createdAt } : {}),
    updated_at: payload.updatedAt ?? new Date().toISOString(),
    ...columns,
  };
}

function rowsFor(db: Database): { table: string; rows: Row[] }[] {
  return [
    {
      table: "users",
      rows: db.users.map((user) =>
        withMeta(user, { email: user.email.toLowerCase(), role: user.role })
      ),
    },
    {
      table: "learners",
      rows: db.learners.map((learner) => withMeta(learner, { user_id: learner.userId })),
    },
    {
      table: "assessments",
      rows: db.assessments.map((assessment) =>
        withMeta(assessment, {
          learner_id: assessment.learnerId,
          status: assessment.status,
        })
      ),
    },
    {
      table: "courses",
      rows: db.courses.map((course) =>
        withMeta({ ...course, createdAt: undefined }, { slug: course.slug, level: course.level })
      ),
    },
    {
      table: "career_paths",
      rows: db.careerPaths.map((path) =>
        withMeta({ ...path, createdAt: undefined }, { slug: path.slug })
      ),
    },
    {
      table: "shortlists",
      rows: db.shortlists.map((item) =>
        withMeta(item, {
          learner_id: item.learnerId,
          course_id: item.courseId,
          status: item.status,
          rank: item.rank,
        })
      ),
    },
    {
      table: "applications",
      rows: db.applications.map((application) =>
        withMeta(application, {
          learner_id: application.learnerId,
          course_id: application.courseId,
          status: application.status,
          deadline: application.deadline ?? null,
        })
      ),
    },
    {
      table: "plans",
      rows: db.plans.map((plan) =>
        withMeta(plan, { learner_id: plan.learnerId, status: plan.status })
      ),
    },
    {
      table: "milestones",
      rows: db.milestones.map((milestone) =>
        withMeta(
          { ...milestone, createdAt: undefined },
          {
            plan_id: milestone.planId,
            quarter: milestone.quarter,
            order_index: milestone.order,
            status: milestone.status,
          }
        )
      ),
    },
    {
      table: "reports",
      rows: db.reports.map((report) =>
        withMeta(report, {
          learner_id: report.learnerId,
          status: report.status,
          verification_code: report.verificationCode.toUpperCase(),
          version: report.version,
        })
      ),
    },
    {
      table: "reviews",
      rows: db.reviews.map((review) =>
        withMeta(
          { ...review, createdAt: undefined },
          {
            learner_id: review.learnerId,
            scheduled_for: review.scheduledFor,
            completed_at: review.completedAt ?? null,
          }
        )
      ),
    },
    {
      table: "satisfaction",
      rows: db.satisfaction.map((satisfaction) =>
        withMeta(satisfaction, {
          learner_id: satisfaction.learnerId,
          report_id: satisfaction.reportId,
          score: satisfaction.score,
        })
      ),
    },
    {
      table: "feedback",
      rows: db.feedback.map((feedback) =>
        withMeta(feedback, {
          user_id: feedback.userId,
          status: feedback.status,
          category: feedback.category,
        })
      ),
    },
    {
      table: "licences",
      rows: db.licences.map((licence) =>
        withMeta({ ...licence, createdAt: undefined }, { status: licence.status })
      ),
    },
    {
      table: "audit",
      rows: db.audit.map((event) =>
        withMeta(event, {
          actor_id: event.actorId ?? null,
          actor_role: event.actorRole,
          action: event.action,
          entity: event.entity,
          entity_id: event.entityId ?? null,
        })
      ),
    },
    {
      table: "advisor_messages",
      rows: db.advisorMessages.map((message) =>
        withMeta(message, { learner_id: message.learnerId, role: message.role })
      ),
    },
    {
      table: "notifications",
      rows: db.notifications.map((notification) =>
        withMeta(notification, { user_id: notification.userId, read: notification.read })
      ),
    },
  ];
}

async function main() {
  loadLocalEnv();
  const url = env("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const force = process.argv.includes("--force");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error: countError } = await client
    .from("users")
    .select("id", { count: "exact", head: true });
  if (countError) {
    console.error(
      `Could not read the users table: ${countError.message}. Did you apply supabase/migrations/0001_init.sql?`
    );
    process.exit(1);
  }

  if ((count ?? 0) > 0 && !force) {
    console.error(`The database already has ${count} users.`);
    console.error("Re-run with --force to upsert the demo dataset over it.");
    process.exit(1);
  }

  const db = createSeedDatabase();
  for (const { table, rows } of rowsFor(db)) {
    // PostgREST payload limits: write in bounded chunks.
    for (let index = 0; index < rows.length; index += 100) {
      const chunk = rows.slice(index, index + 100);
      const { error } = await client.from(table).upsert(chunk, { onConflict: "id" });
      if (error) {
        console.error(`${table} upsert failed: ${error.message}`);
        process.exit(1);
      }
    }
    console.log(`  ${table.padEnd(18)} ${rows.length} rows`);
  }

  console.log(`\nSeeded ${url}`);
  console.log("Set DATA_BACKEND=supabase and restart the app.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
