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

// ---------------------------------------------------------------------------
// Eingaben prüfen: Server Actions sind öffentliche Endpunkte – nie dem Client vertrauen.
// ---------------------------------------------------------------------------

const MAX_VALUE = 100_000;
const NAME_MAX = 40;

/** Zahl 0…100000 oder null; alles andere → undefined (ungültig) */
function cleanValue(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > MAX_VALUE) return undefined;
  return Math.round(v * 100) / 100;
}

function cleanName(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const name = v.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!name) return null;
  return name.length <= NAME_MAX ? name : undefined;
}

function cleanDate(v: unknown): string | null | undefined {
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return undefined;
  const year = d.getUTCFullYear();
  return year >= 2020 && year <= 2100 ? v : undefined;
}

function isExerciseId(v: unknown): v is ExerciseId {
  return typeof v === "string" && getExercise(v) !== undefined;
}

export async function updateProfile(input: { display_name?: string | null; exam_date?: string | null }) {
  // Nur diese zwei Felder sind erlaubt – keine weiteren Spalten aus dem Request übernehmen
  const patch: { display_name?: string | null; exam_date?: string | null } = {};
  if (input && "display_name" in input) {
    const name = cleanName(input.display_name);
    if (name === undefined) return { error: `Name: maximal ${NAME_MAX} Zeichen.` };
    patch.display_name = name;
  }
  if (input && "exam_date" in input) {
    const date = cleanDate(input.exam_date);
    if (date === undefined) return { error: "Ungültiges Datum." };
    patch.exam_date = date;
  }
  if (Object.keys(patch).length === 0) return { error: "Nichts zu speichern." };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .upsert({ ...patch, id: user.id, updated_at: new Date().toISOString() });
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveExerciseSettings(
  exercise: ExerciseId,
  input: { goal?: number | null; record?: number | null },
) {
  if (!isExerciseId(exercise)) return { error: "Unbekannte Übung" };
  const patch: { goal?: number | null; record?: number | null } = {};
  if (input && "goal" in input) {
    const goal = cleanValue(input.goal);
    if (goal === undefined) return { error: "Ungültiger Wert." };
    patch.goal = goal;
  }
  if (input && "record" in input) {
    const record = cleanValue(input.record);
    if (record === undefined) return { error: "Ungültiger Wert." };
    patch.record = record;
  }
  if (Object.keys(patch).length === 0) return { error: "Nichts zu speichern." };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("user_exercises").upsert({
    ...patch,
    user_id: user.id,
    exercise,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveTestResult(exercise: ExerciseId, value: number) {
  const ex = isExerciseId(exercise) ? getExercise(exercise) : undefined;
  if (!ex || cleanValue(value) == null) return { error: "Ungültiges Resultat" };
  value = cleanValue(value)!;
  const { supabase, user } = await requireUser();
  const grade = gradeFor(ex, value)!;

  const { error } = await supabase
    .from("test_results")
    .insert({ user_id: user.id, exercise, value, grade });
  if (error) return { error: "Speichern fehlgeschlagen." };

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
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const { supabase, user } = await requireUser();
  await supabase.from("test_results").delete().eq("id", id).eq("user_id", user.id);
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

  // Echten Dateityp anhand der ersten Bytes prüfen (der angegebene MIME-Typ ist fälschbar)
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isWebp =
    String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP";
  const detected = isJpeg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : null;
  if (!detected) return { error: "Bitte ein JPG, PNG oder WebP wählen" };

  const { supabase, user } = await requireUser();
  const ext = detected === "image/png" ? "png" : detected === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: detected, cacheControl: "31536000" });
  if (uploadError) return { error: "Upload fehlgeschlagen." };

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });
  if (error) return { error: "Profilbild konnte nicht gespeichert werden." };

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
  rate_limited: "Zu viele offene Anfragen – warte, bis einige angenommen wurden.",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;

export async function sendFriendRequest(code: string) {
  if (typeof code !== "string") return { error: "Der Code hat 6 Zeichen." };
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(clean)) return { error: "Der Code hat 6 Zeichen." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("send_friend_request", { code: clean });
  if (error) return { error: "Anfrage fehlgeschlagen." };
  revalidatePath("/freunde");
  const status = String(data);
  const ok = status === "requested" || status === "accepted";
  return ok ? { ok: true, message: FRIEND_MESSAGES[status] } : { error: FRIEND_MESSAGES[status] ?? status };
}

export async function acceptFriendRequest(id: number) {
  if (!isId(id)) return { error: "Ungültige Anfrage." };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", id)
    .eq("addressee", user.id);
  if (error) return { error: "Annehmen fehlgeschlagen." };
  revalidatePath("/freunde");
  return { ok: true };
}

export async function removeFriendship(id: number) {
  if (!isId(id)) return { error: "Ungültige Anfrage." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) return { error: "Entfernen fehlgeschlagen." };
  revalidatePath("/freunde");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Kommentare
// ---------------------------------------------------------------------------

export async function addComment(exercise: ExerciseId, body: string, parentId?: number | null) {
  if (!isExerciseId(exercise)) return { error: "Unbekannte Übung" };
  if (typeof body !== "string") return { error: "Bitte etwas schreiben." };
  if (parentId != null && !isId(parentId)) return { error: "Ungültige Antwort." };
  const text = body.replace(/\u0000/g, "").trim();
  if (!text) return { error: "Bitte etwas schreiben." };
  if (text.length > 1000) return { error: "Maximal 1000 Zeichen." };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("exercise_comments")
    .insert({ exercise, body: text, parent_id: parentId ?? null, user_id: user.id });
  if (error) {
    if (error.message.includes("rate_limited")) return { error: "Langsam 🙂 – warte kurz vor dem nächsten Kommentar." };
    return { error: "Kommentar konnte nicht gespeichert werden." };
  }
  revalidatePath(`/uebung/${exercise}`);
  return { ok: true };
}

export async function deleteComment(id: number, exercise: ExerciseId) {
  if (!isId(id) || !isExerciseId(exercise)) return { error: "Ungültige Anfrage." };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("exercise_comments").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Löschen fehlgeschlagen." };
  revalidatePath(`/uebung/${exercise}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mitglieder einladen & Sichtbarkeit
// ---------------------------------------------------------------------------

export async function inviteMember(userId: string) {
  if (typeof userId !== "string" || !UUID_RE.test(userId)) return { error: "Ungültiger Benutzer." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("send_friend_request_to", { target: userId });
  if (error) return { error: "Einladung fehlgeschlagen." };
  revalidatePath("/freunde");
  const status = String(data);
  const ok = status === "requested" || status === "accepted";
  return ok ? { ok: true, status, message: FRIEND_MESSAGES[status] } : { error: FRIEND_MESSAGES[status] ?? status };
}

export async function setDiscoverable(discoverable: boolean) {
  if (typeof discoverable !== "boolean") return { error: "Ungültiger Wert." };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ discoverable }).eq("id", user.id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath("/profil");
  return { ok: true };
}
