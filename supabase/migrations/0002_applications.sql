-- ─────────────────────────────────────────────────────────────
-- Northstar — application tracker (0002_applications)
--
-- Runs after 0001_init.sql. Adds the post-shortlist workflow: a learner
-- can track several applications, their document checklist and the
-- decision outcome. The full entity lives in `payload`; indexed columns
-- support the queue, deadline and status queries.
-- ─────────────────────────────────────────────────────────────

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
