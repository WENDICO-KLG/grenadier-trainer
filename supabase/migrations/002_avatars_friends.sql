-- Grenadier Trainer – Profilbilder & Freunde
-- Nach schema.sql im Supabase SQL Editor ausführen. Mehrfaches Ausführen ist unbedenklich.

-- ---------------------------------------------------------------------------
-- Profil: Bild + Freundescode
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists friend_code text;

create or replace function public.generate_friend_code()
returns text
language sql
volatile
as $$
  -- 6 Zeichen ohne verwechselbare Zeichen (0/O, 1/I)
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
  from generate_series(1, 6);
$$;

update public.profiles set friend_code = public.generate_friend_code() where friend_code is null;
alter table public.profiles alter column friend_code set default public.generate_friend_code();
alter table public.profiles alter column friend_code set not null;
create unique index if not exists profiles_friend_code_key on public.profiles (friend_code);

-- ---------------------------------------------------------------------------
-- Freundschaften (Anfrage -> angenommen)
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);

create unique index if not exists friendships_pair_key
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;

drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships
  for select using (auth.uid() in (requester, addressee));

drop policy if exists "accept received requests" on public.friendships;
create policy "accept received requests" on public.friendships
  for update using (auth.uid() = addressee) with check (auth.uid() = addressee and status = 'accepted');

drop policy if exists "remove own friendships" on public.friendships;
create policy "remove own friendships" on public.friendships
  for delete using (auth.uid() in (requester, addressee));

-- Inserts nur über send_friend_request()

-- Hilfsfunktionen (security definer, damit Policies nicht rekursiv werden)
create or replace function public.are_friends(other uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = auth.uid() and f.addressee = other)
        or (f.addressee = auth.uid() and f.requester = other))
  );
$$;

create or replace function public.is_connected(other uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where (f.requester = auth.uid() and f.addressee = other)
       or (f.addressee = auth.uid() and f.requester = other)
  );
$$;

-- Freundschaftsanfrage per Code senden. Liegt bereits eine Anfrage in
-- Gegenrichtung vor, wird sie direkt angenommen.
create or replace function public.send_friend_request(code text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  select id into target from public.profiles where friend_code = upper(trim(code));
  if target is null then
    return 'not_found';
  end if;
  if target = me then
    return 'self';
  end if;

  select * into existing from public.friendships
  where least(requester, addressee) = least(me, target)
    and greatest(requester, addressee) = greatest(me, target);

  if found then
    if existing.status = 'accepted' then
      return 'already_friends';
    end if;
    if existing.addressee = me then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepted';
    end if;
    return 'already_requested';
  end if;

  insert into public.friendships (requester, addressee) values (me, target);
  return 'requested';
end;
$$;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.are_friends(uuid) to authenticated;
grant execute on function public.is_connected(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Leserechte für Freunde
-- ---------------------------------------------------------------------------
-- Profile: Name/Bild sichtbar für Freunde und offene Anfragen
drop policy if exists "connected profiles readable" on public.profiles;
create policy "connected profiles readable" on public.profiles
  for select using (public.is_connected(id));

-- Rekorde, Ziele und Tests: nur für bestätigte Freunde
drop policy if exists "friends exercises readable" on public.user_exercises;
create policy "friends exercises readable" on public.user_exercises
  for select using (public.are_friends(user_id));

drop policy if exists "friends results readable" on public.test_results;
create policy "friends results readable" on public.test_results
  for select using (public.are_friends(user_id));

-- ---------------------------------------------------------------------------
-- Storage: öffentlicher Bucket für Profilbilder, schreiben nur in eigenen Ordner
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

-- Storage-API braucht für Löschen/Ersetzen auch Leserechte auf die eigenen Objekte
drop policy if exists "avatar read own folder" on storage.objects;
create policy "avatar read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar upload own folder" on storage.objects;
create policy "avatar upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar update own folder" on storage.objects;
create policy "avatar update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar delete own folder" on storage.objects;
create policy "avatar delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
