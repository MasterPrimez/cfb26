-- CFB/26 · one row per signed-in person holding their setup. Run once in Supabase → SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each person can only see and change their own row.
drop policy if exists "own profile: read" on public.profiles;
create policy "own profile: read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own profile: insert" on public.profiles;
create policy "own profile: insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;
