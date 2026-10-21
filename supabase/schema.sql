-- Grenadier Trainer – Datenbankschema
-- Im Supabase Dashboard unter "SQL Editor" einfügen und ausführen.

-- Profil pro Benutzer (Name + Datum der Eignungsprüfung)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  exam_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Persönliches Ziel und Rekord pro Übung
create table if not exists public.user_exercises (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise text not null check (exercise in ('liegestuetzen','klimmzuege','dorsal','seitlich','marsch')),
  goal numeric,
  record numeric,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise)
);

-- Alle Testresultate (Verlauf)
create table if not exists public.test_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise text not null check (exercise in ('liegestuetzen','klimmzuege','dorsal','seitlich','marsch')),
  value numeric not null,
  grade numeric(3,1) not null,
  created_at timestamptz not null default now()
);

create index if not exists test_results_user_idx on public.test_results (user_id, exercise, created_at desc);

-- Row Level Security: jeder sieht nur seine eigenen Daten
alter table public.profiles enable row level security;
alter table public.user_exercises enable row level security;
alter table public.test_results enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own exercises" on public.user_exercises;
create policy "own exercises" on public.user_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own results" on public.test_results;
create policy "own results" on public.test_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Profil automatisch bei Registrierung anlegen
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
