import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ExerciseId } from "@/lib/exercises";

export interface Profile {
  id: string;
  display_name: string | null;
  exam_date: string | null;
  avatar_url: string | null;
  friend_code: string | null;
}

export interface UserExercise {
  exercise: ExerciseId;
  goal: number | null;
  record: number | null;
}

export interface TestResult {
  id: number;
  exercise: ExerciseId;
  value: number;
  grade: number;
  created_at: string;
}

export interface Friendship {
  id: number;
  status: "pending" | "accepted";
  incoming: boolean;
  friend: Profile;
}

const PROFILE_COLUMNS = "id, display_name, exam_date, avatar_url, friend_code";

function toExerciseMap(rows: { exercise: string; goal: unknown; record: unknown }[] | null) {
  const map = new Map<ExerciseId, UserExercise>();
  for (const row of rows ?? []) {
    map.set(row.exercise as ExerciseId, {
      exercise: row.exercise as ExerciseId,
      goal: row.goal == null ? null : Number(row.goal),
      record: row.record == null ? null : Number(row.record),
    });
  }
  return map;
}

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

/** Eingeloggter Benutzer aus dem lokal verifizierten JWT (kein Netzwerk-Request). */
export const getAuthUser = cache(async (): Promise<AuthUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return {
    id: claims.sub,
    email: claims.email ?? null,
    displayName: (claims.user_metadata?.display_name as string | undefined) ?? null,
  };
});

export const getUserData = cache(async () => {
  const user = await getAuthUser();
  const supabase = await createClient();

  const [profileRes, exercisesRes] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle(),
    supabase.from("user_exercises").select("exercise, goal, record").eq("user_id", user.id),
  ]);

  const profile: Profile = profileRes.data ?? {
    id: user.id,
    display_name: user.displayName,
    exam_date: null,
    avatar_url: null,
    friend_code: null,
  };

  return { user, profile, exercises: toExerciseMap(exercisesRes.data) };
});

export async function getResults(
  userId: string,
  exercise?: ExerciseId,
  limit = 50,
): Promise<TestResult[]> {
  const supabase = await createClient();
  let query = supabase
    .from("test_results")
    .select("id, exercise, value, grade, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (exercise) query = query.eq("exercise", exercise);
  const { data } = await query;
  return (data ?? []).map((r) => ({
    ...r,
    exercise: r.exercise as ExerciseId,
    value: Number(r.value),
    grade: Number(r.grade),
  }));
}

export const getFriendships = cache(async (): Promise<Friendship[]> => {
  const user = await getAuthUser();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("friendships")
    .select("id, requester, addressee, status")
    .order("created_at", { ascending: false });
  if (!rows?.length) return [];

  const otherIds = rows.map((r) => (r.requester === user.id ? r.addressee : r.requester));
  const { data: profiles } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", otherIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));

  return rows.map((r) => {
    const otherId = r.requester === user.id ? r.addressee : r.requester;
    return {
      id: r.id,
      status: r.status as Friendship["status"],
      incoming: r.addressee === user.id,
      friend: byId.get(otherId) ?? {
        id: otherId,
        display_name: null,
        exam_date: null,
        avatar_url: null,
        friend_code: null,
      },
    };
  });
});

/** Rekorde mehrerer Benutzer (eigene + Freunde, per RLS geschützt) */
export async function getExercisesFor(userIds: string[]) {
  const result = new Map<string, Map<ExerciseId, UserExercise>>();
  if (userIds.length === 0) return result;
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_exercises")
    .select("user_id, exercise, goal, record")
    .in("user_id", userIds);
  for (const id of userIds) {
    result.set(id, toExerciseMap((data ?? []).filter((r) => r.user_id === id)));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Kommentare pro Übung
// ---------------------------------------------------------------------------

export interface CommentAuthor {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ExerciseComment {
  id: number;
  userId: string;
  body: string;
  createdAt: string;
  timeAgo: string;
  author: CommentAuthor | null;
  replies: ExerciseComment[];
}

const rtf = new Intl.RelativeTimeFormat("de-CH", { numeric: "auto" });

function timeAgo(iso: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "gerade eben";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
}

/** Kommentare einer Übung als Baum: neueste Hauptkommentare zuerst, Antworten chronologisch. */
export async function getComments(
  exercise: ExerciseId,
): Promise<{ comments: ExerciseComment[]; available: boolean }> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("exercise_comments")
    .select("id, user_id, parent_id, body, created_at")
    .eq("exercise", exercise)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return { comments: [], available: false };
  if (!rows?.length) return { comments: [], available: true };

  const ids = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: authors } = await supabase.rpc("comment_authors", { ids });
  const byId = new Map(((authors ?? []) as CommentAuthor[]).map((a) => [a.id, a]));

  const now = Date.now();
  const toComment = (r: (typeof rows)[number]): ExerciseComment => ({
    id: r.id,
    userId: r.user_id,
    body: r.body,
    createdAt: r.created_at,
    timeAgo: timeAgo(r.created_at, now),
    author: byId.get(r.user_id) ?? null,
    replies: [],
  });

  const roots = rows.filter((r) => r.parent_id == null).map(toComment);
  const rootById = new Map(roots.map((c) => [c.id, c]));
  for (const r of [...rows].reverse()) {
    if (r.parent_id != null) rootById.get(r.parent_id)?.replies.push(toComment(r));
  }
  return { comments: roots, available: true };
}

// ---------------------------------------------------------------------------
// Mitgliederliste
// ---------------------------------------------------------------------------

export async function listMembers(
  search?: string,
): Promise<{ members: CommentAuthor[]; available: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_members", { search: search ?? null, max_rows: 50 });
  if (error) return { members: [], available: false };
  return { members: (data ?? []) as CommentAuthor[], available: true };
}

/** Sichtbarkeit in der Mitgliederliste (Spalte kommt aus Migration 003). */
export async function getDiscoverable(userId: string): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("discoverable").eq("id", userId).maybeSingle();
  if (error) return null;
  return data?.discoverable ?? true;
}
