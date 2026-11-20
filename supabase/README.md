# Supabase / Postgres setup

Northstar keeps all domain data behind a `Store` interface. The Supabase adapter (`lib/store/supabase.ts`) implements the same contract as the local JSON store, so the application code does not change when you switch backends.

The adapter uses **one row per entity**: indexed relational columns for the fields the app filters on (`learner_id`, `status`, `verification_code`, `deadline`, …) plus a `payload` JSONB column holding the complete entity from `lib/types.ts`.

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and the **service role** key (Project Settings → API).
3. Put them in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATA_BACKEND=supabase
AUTH_SECRET=at-least-32-random-characters
```

Never expose the service-role key to the browser. It is only imported in server modules and scripts.

## 2. Apply the schema

**Fastest route:** open the Supabase **SQL Editor**, paste the contents of
`supabase/setup.sql`, and run it once. That file is the two migrations
concatenated in order.

**Or apply the migrations individually:**

- `supabase/migrations/0001_init.sql` — core tables
- `supabase/migrations/0002_applications.sql` — application tracker
- `supabase/migrations/0003_feedback.sql` — product feedback

**Or let the app apply them over a direct Postgres connection:**

```env
# .env.local — Project Settings → Database → Connection string → URI
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
```

```bash
npm run supabase:apply
```

The service-role REST key cannot run DDL; `supabase:apply` needs the direct
database connection string (or use the SQL editor).

CLI route:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration enables row-level security on every table with **no anon policies**. All access goes through the Next.js server using the service role, so a leaked anon key cannot read learner data directly through PostgREST.

## 3. Verify the connection

```bash
npm run supabase:check
```

It checks every table, prints row counts and exits non-zero if a migration is missing. It reads one row per table rather than a HEAD count, because PostgREST can return an empty result for a missing relation without surfacing the 404. It never writes data and never prints the keys. The same checks are available at **Admin → Operations → Run health check**.

## 4. Load the demo dataset (optional)

```bash
npm run supabase:push
```

The script refuses to write into a database that already has users unless you pass `--force`. It upserts the deterministic demo data (5 users, 3 learners, 40 courses, 21 paths, applications, plans, reports, reviews, licences, audit events).

## 5. Start the app

```bash
npm run dev
```

`DATA_BACKEND=supabase` makes `getStore()` return `SupabaseStore`. Remove it or set `DATA_BACKEND=file` to go back to the local JSON store.

## Local Supabase (Docker)

`supabase/config.toml` is included for the CLI:

```bash
npx supabase start        # starts Postgres, Studio and the API
npx supabase db reset     # applies migrations to the local database
```

The local API URL is usually `http://127.0.0.1:54321`; use the local service-role key printed by `supabase start` in `.env.local`.

## Operational notes

- **Backups:** enable point-in-time recovery in Supabase for anything beyond a pilot.
- **Migrations:** add new files as `0003_*.sql`; never edit an applied migration.
- **RLS:** the reference build only uses the service role. If you later add Supabase Auth, add per-user policies before exposing the anon key to a client.
- **Pooling:** the serverless driver/transaction pooler is recommended when deploying to a platform with many short-lived functions.
- **Audit:** the `audit` table is append-only in the application layer; enforce it with a database trigger or restricted role if your compliance model requires it.
- **Storage:** disabled by default. Documents are references in the checklist, not uploaded files; add a private bucket and signed URLs if you introduce uploads.
