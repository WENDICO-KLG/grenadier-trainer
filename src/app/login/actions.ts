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

  if (!email || password.length < 6) {
    return { error: "Bitte E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben." };
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
  return message;
}
