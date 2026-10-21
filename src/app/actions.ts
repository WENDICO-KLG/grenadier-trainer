"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getExercise, gradeFor, type ExerciseId } from "@/lib/exercises";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return { supabase, user: { id: data.claims.sub } };
}

export async function updateProfile(input: { display_name?: string | null; exam_date?: string | null }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...input, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveExerciseSettings(
  exercise: ExerciseId,
  input: { goal?: number | null; record?: number | null },
) {
  if (!getExercise(exercise)) return { error: "Unbekannte Übung" };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("user_exercises").upsert({
    user_id: user.id,
    exercise,
    ...input,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveTestResult(exercise: ExerciseId, value: number) {
  const ex = getExercise(exercise);
  if (!ex || !Number.isFinite(value) || value < 0) return { error: "Ungültiges Resultat" };
  const { supabase, user } = await requireUser();
  const grade = gradeFor(ex, value)!;

  const { error } = await supabase
    .from("test_results")
    .insert({ user_id: user.id, exercise, value, grade });
  if (error) return { error: error.message };

  const { data: current } = await supabase
    .from("user_exercises")
    .select("record")
    .eq("user_id", user.id)
    .eq("exercise", exercise)
    .maybeSingle();

  const oldRecord = current?.record == null ? null : Number(current.record);
  const isRecord =
    oldRecord == null || (ex.lowerIsBetter ? value < oldRecord : value > oldRecord);

  if (isRecord) {
    await supabase.from("user_exercises").upsert({
      user_id: user.id,
      exercise,
      record: value,
      updated_at: new Date().toISOString(),
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, grade, isRecord };
}

export async function deleteTestResult(id: number) {
  const { supabase } = await requireUser();
  await supabase.from("test_results").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Profilbild
// ---------------------------------------------------------------------------

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 900 * 1024;

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Kein Bild ausgewählt" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Bitte ein JPG, PNG oder WebP wählen" };
  }
  if (file.size > MAX_AVATAR_BYTES) return { error: "Bild ist zu gross" };

  const { supabase, user } = await requireUser();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };

  await removeOldAvatars(user.id, path);
  revalidatePath("/", "layout");
  return { ok: true, url: publicUrl };
}

export async function removeAvatar() {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  await removeOldAvatars(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

async function removeOldAvatars(userId: string, keep?: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
  const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await supabase.storage.from(AVATAR_BUCKET).remove(old);
}

// ---------------------------------------------------------------------------
// Freunde
// ---------------------------------------------------------------------------

const FRIEND_MESSAGES: Record<string, string> = {
  requested: "Anfrage gesendet ✓",
  accepted: "Ihr seid jetzt Freunde ✓",
  not_found: "Kein Benutzer mit diesem Code gefunden.",
  self: "Das ist dein eigener Code 😉",
  already_friends: "Ihr seid bereits Freunde.",
  already_requested: "Anfrage wurde bereits gesendet.",
};

export async function sendFriendRequest(code: string) {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(clean)) return { error: "Der Code hat 6 Zeichen." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("send_friend_request", { code: clean });
  if (error) return { error: error.message };
  revalidatePath("/freunde");
  const status = String(data);
  const ok = status === "requested" || status === "accepted";
  return ok ? { ok: true, message: FRIEND_MESSAGES[status] } : { error: FRIEND_MESSAGES[status] ?? status };
}

export async function acceptFriendRequest(id: number) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", id)
    .eq("addressee", user.id);
  if (error) return { error: error.message };
  revalidatePath("/freunde");
  return { ok: true };
}

export async function removeFriendship(id: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/freunde");
  return { ok: true };
}
