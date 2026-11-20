-- ─────────────────────────────────────────────────────────────
-- Northstar — product feedback (0003_feedback)
-- Runs after 0001 and 0002.
-- ─────────────────────────────────────────────────────────────

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
