"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string } | undefined;

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Bitte eine gültige E-Mail eingeben." };
  }
  if (!password || password.length > 128) {
    return { error: "Bitte ein Passwort eingeben." };
  }
  if (mode === "signup") {
    if (password.length < 8) return { error: "Das Passwort braucht mindestens 8 Zeichen." };
    if (name.length > 40) return { error: "Der Name darf maximal 40 Zeichen haben." };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const origin = (await headers()).get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name || null },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) return { error: translate(error.message) };
    if (!data.session) {
      return { info: "Fast geschafft! Bestätige deine E-Mail über den Link, den wir dir geschickt haben." };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translate(error.message) };
  }

  redirect("/");
}

function translate(message: string): string {
  if (/invalid login credentials/i.test(message)) return "E-Mail oder Passwort ist falsch.";
  if (/email not confirmed/i.test(message)) return "Bitte bestätige zuerst deine E-Mail.";
  if (/already registered/i.test(message)) return "Diese E-Mail ist bereits registriert. Melde dich an.";
  if (/rate limit|too many/i.test(message)) return "Zu viele Versuche – bitte warte kurz.";
  if (/password/i.test(message)) return "Das Passwort erfüllt die Anforderungen nicht (mind. 8 Zeichen).";
  return "Anmeldung fehlgeschlagen. Bitte versuche es nochmals.";
}
