create table if not exists public.matches(
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  winner smallint not null,
  ko boolean not null,
  duration int,
  p1 jsonb not null,
  p2 jsonb not null);
-- RLS включён без политик: читает и пишет только сервер через service_role ключ.
alter table public.matches enable row level security;
