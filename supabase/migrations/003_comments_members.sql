-- Grenadier Trainer – Kommentare pro Übung & Mitgliederliste
-- Nach 002_avatars_friends.sql im Supabase SQL Editor ausführen. Mehrfaches Ausführen ist unbedenklich.

-- ---------------------------------------------------------------------------
-- Sichtbarkeit in der Mitgliederliste (Standard: sichtbar)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists discoverable boolean not null default true;

-- ---------------------------------------------------------------------------
-- Kommentare (Tipps & Fragen) pro Übung, eine Antwort-Ebene
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_comments (
  id bigint generated always as identity primary key,
  exercise text not null check (exercise in ('liegestuetzen','klimmzuege','dorsal','seitlich','marsch')),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id bigint references public.exercise_comments (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists exercise_comments_exercise_idx
  on public.exercise_comments (exercise, created_at desc);
create index if not exists exercise_comments_parent_idx
  on public.exercise_comments (parent_id);

alter table public.exercise_comments enable row level security;

-- Alle eingeloggten Benutzer lesen alle Kommentare
drop policy if exists "comments readable" on public.exercise_comments;
create policy "comments readable" on public.exercise_comments
  for select to authenticated using (true);

-- Schreiben nur als man selbst; Antworten nur auf Hauptkommentare derselben Übung
drop policy if exists "comments insert own" on public.exercise_comments;
create policy "comments insert own" on public.exercise_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      parent_id is null
      or exists (
        select 1 from public.exercise_comments p
        where p.id = exercise_comments.parent_id
          and p.parent_id is null
          and p.exercise = exercise_comments.exercise
      )
    )
  );

drop policy if exists "comments delete own" on public.exercise_comments;
create policy "comments delete own" on public.exercise_comments
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Öffentliche Mini-Profile: nur Name + Bild, sonst nichts (kein Datum, keine Rekorde)
-- ---------------------------------------------------------------------------

-- Autoren von Kommentaren (für Name/Bild in der Kommentarspalte)
create or replace function public.comment_authors(ids uuid[])
returns table (id uuid, display_name text, avatar_url text)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where p.id = any(ids)
    and auth.uid() is not null
    and exists (select 1 from public.exercise_comments c where c.user_id = p.id);
$$;

-- Mitgliederliste: sichtbare Benutzer mit Namen, optional gefiltert
create or replace function public.list_members(search text default null, max_rows int default 50)
returns table (id uuid, display_name text, avatar_url text)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.discoverable
    and coalesce(btrim(p.display_name), '') <> ''
    and (search is null or btrim(search) = '' or p.display_name ilike '%' || btrim(search) || '%')
  order by lower(p.display_name)
  limit least(greatest(coalesce(max_rows, 50), 1), 100);
$$;

-- ---------------------------------------------------------------------------
-- Einladen direkt per Benutzer (statt Code). Gleiche Logik wie send_friend_request.
-- ---------------------------------------------------------------------------
create or replace function public.send_friend_request_to(target uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if target is null or not exists (select 1 from public.profiles where id = target) then
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

-- Code-Variante nutzt jetzt dieselbe Logik
create or replace function public.send_friend_request(code text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select id into target from public.profiles where friend_code = upper(btrim(code));
  if target is null then
    return 'not_found';
  end if;
  return public.send_friend_request_to(target);
end;
$$;

revoke execute on function public.comment_authors(uuid[]) from public, anon;
revoke execute on function public.list_members(text, int) from public, anon;
revoke execute on function public.send_friend_request_to(uuid) from public, anon;
grant execute on function public.comment_authors(uuid[]) to authenticated;
grant execute on function public.list_members(text, int) to authenticated;
grant execute on function public.send_friend_request_to(uuid) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
