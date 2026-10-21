-- Grenadier Trainer – Sicherheits-Härtung
-- Behebt die Warnungen des Supabase Security Advisors und setzt harte Grenzen direkt in der
-- Datenbank (gelten auch, wenn jemand die API ohne die App aufruft).
-- Nach 003_comments_members.sql ausführen. Mehrfaches Ausführen ist unbedenklich.

-- ---------------------------------------------------------------------------
-- 1) Interne Hilfsfunktionen in ein nicht öffentliches Schema verschieben
--    (are_friends / is_connected werden nur von RLS-Policies gebraucht)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.are_friends(other uuid)
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

create or replace function private.is_connected(other uuid)
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

revoke all on function private.are_friends(uuid) from public, anon;
revoke all on function private.is_connected(uuid) from public, anon;
grant execute on function private.are_friends(uuid) to authenticated;
grant execute on function private.is_connected(uuid) to authenticated;

-- Policies auf die privaten Funktionen umstellen
drop policy if exists "connected profiles readable" on public.profiles;
create policy "connected profiles readable" on public.profiles
  for select to authenticated using (private.is_connected(id));

drop policy if exists "friends exercises readable" on public.user_exercises;
create policy "friends exercises readable" on public.user_exercises
  for select to authenticated using (private.are_friends(user_id));

drop policy if exists "friends results readable" on public.test_results;
create policy "friends results readable" on public.test_results
  for select to authenticated using (private.are_friends(user_id));

-- Alte öffentliche Varianten entfernen (nicht mehr referenziert)
drop function if exists public.are_friends(uuid);
drop function if exists public.is_connected(uuid);

-- ---------------------------------------------------------------------------
-- 2) Fehlenden search_path setzen, Trigger-Funktion nicht über die API aufrufbar
-- ---------------------------------------------------------------------------
alter function public.generate_friend_code() set search_path = '';
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Öffentliche RPCs nur für eingeloggte Benutzer
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.send_friend_request_to(uuid) from public, anon;
revoke all on function public.comment_authors(uuid[]) from public, anon;
revoke all on function public.list_members(text, int) from public, anon;
-- generate_friend_code bleibt für authenticated ausführbar: der Spalten-Default wird mit den
-- Rechten des einfügenden Benutzers ausgewertet (kein SECURITY DEFINER, also unkritisch).
revoke all on function public.generate_friend_code() from public, anon;
grant execute on function public.generate_friend_code() to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.send_friend_request_to(uuid) to authenticated;
grant execute on function public.comment_authors(uuid[]) to authenticated;
grant execute on function public.list_members(text, int) to authenticated;

-- Standard: neue Funktionen in public nicht automatisch für alle ausführbar
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- 3) Spalten-Rechte: Benutzer dürfen nur unkritische Profilfelder selbst setzen
--    (id, friend_code, created_at bleiben geschützt)
-- ---------------------------------------------------------------------------
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, display_name, exam_date, avatar_url, discoverable, updated_at)
  on public.profiles to authenticated;
-- id muss in der Liste stehen, weil PostgREST-Upserts es im UPDATE-Teil mitsetzen;
-- die RLS-Policy (auth.uid() = id) verhindert, dass es auf eine fremde ID geändert wird.
grant update (id, display_name, exam_date, avatar_url, discoverable, updated_at)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Wertebereiche als Constraints (NOT VALID: alte Zeilen bleiben, neue werden geprüft)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_len') then
    alter table public.profiles add constraint profiles_display_name_len
      check (display_name is null or char_length(display_name) between 1 and 40) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_url_own') then
    -- Profilbild nur aus dem eigenen Ordner im Supabase-Bucket "avatars"
    alter table public.profiles add constraint profiles_avatar_url_own
      check (
        avatar_url is null
        or (avatar_url like 'https://%' and position('/storage/v1/object/public/avatars/' || id::text || '/' in avatar_url) > 0)
      ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_exam_date_range') then
    alter table public.profiles add constraint profiles_exam_date_range
      check (exam_date is null or exam_date between date '2020-01-01' and date '2100-12-31') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_exercises_values_range') then
    alter table public.user_exercises add constraint user_exercises_values_range
      check ((goal is null or goal between 0 and 100000) and (record is null or record between 0 and 100000)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'test_results_values_range') then
    alter table public.test_results add constraint test_results_values_range
      check (value between 0 and 100000 and grade between 1 and 5) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Spam-Schutz für Kommentare: max. 5 pro Minute und 100 pro Tag und Benutzer
-- ---------------------------------------------------------------------------
create or replace function private.comment_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select count(*) from public.exercise_comments
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 5
     or (select count(*) from public.exercise_comments
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 100 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.comment_rate_limit() from public, anon, authenticated;

drop trigger if exists exercise_comments_rate_limit on public.exercise_comments;
create trigger exercise_comments_rate_limit
  before insert on public.exercise_comments
  for each row execute function private.comment_rate_limit();

create index if not exists exercise_comments_user_created_idx
  on public.exercise_comments (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 6) Spam-Schutz für Freundschaftsanfragen: max. 30 offene ausgehende Anfragen
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

  if (select count(*) from public.friendships where requester = me and status = 'pending') >= 30 then
    return 'rate_limited';
  end if;

  insert into public.friendships (requester, addressee) values (me, target);
  return 'requested';
end;
$$;
revoke all on function public.send_friend_request_to(uuid) from public, anon;
grant execute on function public.send_friend_request_to(uuid) to authenticated;
