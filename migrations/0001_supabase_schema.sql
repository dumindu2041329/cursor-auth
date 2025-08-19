-- Supabase schema and RLS for cursor-auth
-- Run this in Supabase SQL editor or via CLI migrations

-- ============
-- Tables
-- ============

-- Users table (custom app-managed users, not Supabase Auth users)
create table if not exists public.users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  avatar_url text,
  salt text not null,
  password_hash text not null,
  created_at bigint not null,
  updated_at bigint not null,
  login_count integer not null default 0,
  last_login_at bigint,
  email_verified boolean default false,
  provider text check (provider in ('password','google')) default 'password'
);

create index if not exists users_email_idx on public.users (email);

-- Activities table (per-user activity feed)
create table if not exists public.activities (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text check (type in ('auth','profile','security','account')) not null,
  message text not null,
  at bigint not null
);

create index if not exists activities_user_id_idx on public.activities (user_id);
create index if not exists activities_user_id_at_idx on public.activities (user_id, at desc);


-- ============
-- Row Level Security (RLS)
-- ============

-- Enable and enforce RLS
alter table public.users enable row level security;
alter table public.users force row level security;

alter table public.activities enable row level security;
alter table public.activities force row level security;

-- Drop existing policies (idempotent)
drop policy if exists users_select_own on public.users;
drop policy if exists users_update_own on public.users;
drop policy if exists users_delete_own on public.users;
-- Optional client self-insert policy (kept disabled by default)
drop policy if exists users_insert_self on public.users;

drop policy if exists activities_select_own on public.activities;
drop policy if exists activities_insert_own on public.activities;
drop policy if exists activities_update_own on public.activities;
drop policy if exists activities_delete_own on public.activities;

-- Users: allow authenticated users to select/update/delete ONLY their own row
create policy users_select_own
on public.users
for select
to authenticated
using (id = auth.uid());

create policy users_update_own
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy users_delete_own
on public.users
for delete
to authenticated
using (id = auth.uid());

-- If you want clients to be able to create their own user row (when using Supabase Auth),
-- uncomment this policy. For server-managed signup via service_role (recommended), keep it disabled.
-- create policy users_insert_self
-- on public.users
-- for insert
-- to authenticated
-- with check (id = auth.uid());

-- Activities: authenticated users can see and manage ONLY their own activity
create policy activities_select_own
on public.activities
for select
to authenticated
using (user_id = auth.uid());

create policy activities_insert_own
on public.activities
for insert
to authenticated
with check (user_id = auth.uid());

create policy activities_update_own
on public.activities
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy activities_delete_own
on public.activities
for delete
to authenticated
using (user_id = auth.uid());

-- Notes:
-- - Requests using the Supabase service role key bypass RLS (server-side only).
-- - Client requests with anon/auth keys are constrained by these policies.


