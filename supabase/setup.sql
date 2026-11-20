-- Northstar one-paste setup. Generated from supabase/migrations/*.sql.
-- Run once in the Supabase SQL editor, then: npm run supabase:check && npm run supabase:push

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Northstar â€” Career Counsellor Agent
-- Supabase/Postgres schema (0001_init)
--
-- Design: one row per domain entity. Indexed relational columns carry
-- the fields the application filters on; the `payload` JSONB column
-- holds the complete serialisable entity defined in lib/types.ts.
-- This keeps the file store and the Postgres adapter on one data
-- contract while still allowing SQL-level constraints and indexes.
--
-- Apply with:  supabase db push
-- Or paste into the Supabase SQL editor.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

create table if not exists public.users (
  id          text primary key,
  email       text not null,
  role        text not null check (role in ('learner', 'counsellor', 'admin')),
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists users_email_lower_idx on public.users (lower(email));

create table if not exists public.learners (
  id          text primary key,
  user_id     text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists learners_user_id_idx on public.learners (user_id);

create table if not exists public.assessments (
  id          text primary key,
  learner_id  text not null,
  status      text not null check (status in ('not_started', 'in_progress', 'completed')),
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists assessments_learner_idx on public.assessments (learner_id, created_at desc);

create table if not exists public.courses (
  id          text primary key,
  slug        text not null,
  level       text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists courses_slug_idx on public.courses (slug);

create table if not exists public.career_paths (
  id          text primary key,
  slug        text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists career_paths_slug_idx on public.career_paths (slug);

create table if not exists public.shortlists (
  id          text primary key,
  learner_id  text not null,
  course_id   text not null,
  status      text not null check (status in ('proposed', 'approved', 'removed')),
  rank        integer not null default 0,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists shortlists_learner_idx on public.shortlists (learner_id, rank);

create table if not exists public.plans (
  id          text primary key,
  learner_id  text not null,
  status      text not null check (status in ('draft', 'active', 'completed')),
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists plans_learner_idx on public.plans (learner_id, created_at desc);

create table if not exists public.milestones (
  id           text primary key,
  plan_id      text not null,
  quarter      integer not null check (quarter between 1 and 4),
  order_index  integer not null default 0,
  status       text not null,
  payload      jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists milestones_plan_idx on public.milestones (plan_id, order_index);

create table if not exists public.reports (
  id                 text primary key,
  learner_id         text not null,
  status             text not null check (status in ('draft', 'in_review', 'approved', 'released', 'returned')),
  verification_code  text not null,
  version            integer not null default 1,
  payload            jsonb not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists reports_learner_idx on public.reports (learner_id, version desc);
create unique index if not exists reports_code_idx on public.reports (upper(verification_code));
create index if not exists reports_status_idx on public.reports (status);

create table if not exists public.reviews (
  id            text primary key,
  learner_id    text not null,
  scheduled_for timestamptz not null,
  completed_at  timestamptz,
  payload       jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists reviews_learner_idx on public.reviews (learner_id, scheduled_for);

create table if not exists public.satisfaction (
  id          text primary key,
  learner_id  text not null,
  report_id   text not null,
  score       integer not null check (score between 1 and 5),
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists satisfaction_learner_idx on public.satisfaction (learner_id, created_at desc);

create table if not exists public.licences (
  id          text primary key,
  status      text not null check (status in ('active', 'expired', 'pending', 'suspended')),
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists licences_status_idx on public.licences (status);

create table if not exists public.audit (
  id          text primary key,
  actor_id    text,
  actor_role  text,
  action      text not null,
  entity      text not null,
  entity_id   text,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit (created_at desc);
create index if not exists audit_entity_idx on public.audit (entity, entity_id);

create table if not exists public.advisor_messages (
  id          text primary key,
  learner_id  text not null,
  role        text not null check (role in ('user', 'assistant')),
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists advisor_messages_learner_idx on public.advisor_messages (learner_id, created_at);

create table if not exists public.notifications (
  id          text primary key,
  user_id     text not null,
  read        boolean not null default false,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- â”€â”€ Row-level security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- All access goes through the Next.js server with the service-role key.
-- RLS is enabled with no anon/authenticated policies, so a leaked anon
-- key cannot read learner data directly from PostgREST.
alter table public.users            enable row level security;
alter table public.learners         enable row level security;
alter table public.assessments      enable row level security;
alter table public.courses          enable row level security;
alter table public.career_paths     enable row level security;
alter table public.shortlists       enable row level security;
alter table public.plans            enable row level security;
alter table public.milestones       enable row level security;
alter table public.reports          enable row level security;
alter table public.reviews          enable row level security;
alter table public.satisfaction     enable row level security;
alter table public.licences         enable row level security;
alter table public.audit            enable row level security;
alter table public.advisor_messages enable row level security;
alter table public.notifications    enable row level security;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Northstar â€” application tracker (0002_applications)
--
-- Runs after 0001_init.sql. Adds the post-shortlist workflow: a learner
-- can track several applications, their document checklist and the
-- decision outcome. The full entity lives in `payload`; indexed columns
-- support the queue, deadline and status queries.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

create table if not exists public.applications (
  id          text primary key,
  learner_id  text not null,
  course_id   text not null,
  status      text not null check (
    status in ('planned', 'preparing', 'submitted', 'interview', 'offer', 'rejected', 'withdrawn')
  ),
  deadline    timestamptz,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists applications_learner_idx
  on public.applications (learner_id, deadline);

create index if not exists applications_status_idx
  on public.applications (status, deadline);

alter table public.applications enable row level security;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Northstar â€” product feedback (0003_feedback)
-- Runs after 0001 and 0002.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

create table if not exists public.feedback (
  id          text primary key,
  user_id     text not null,
  category    text not null check (
    category in ('bug', 'idea', 'content', 'counselling', 'other')
  ),
  status      text not null default 'open' check (
    status in ('open', 'reviewing', 'resolved')
  ),
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists feedback_status_idx
  on public.feedback (status, created_at desc);

create index if not exists feedback_user_idx
  on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;
