"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState(authenticate, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <Image
          src="/logo.png"
          alt="Grenadier Trainer Logo"
          width={72}
          height={72}
          preload
          className="mb-6 rounded-[1.25rem] ring-1 ring-line"
        />
        <h1 className="text-3xl font-semibold tracking-tight">Grenadier Trainer</h1>
        <p className="mt-2 text-muted">
          Bereite dich gezielt auf den Sporttest der Eignungsprüfung vor.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-card p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-11 rounded-xl text-sm font-medium transition ${
              mode === m ? "bg-card-2 text-white" : "text-muted"
            }`}
          >
            {m === "signin" ? "Anmelden" : "Registrieren"}
          </button>
        ))}
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="mode" value={mode} />
        {mode === "signup" && (
          <Field name="name" type="text" placeholder="Vorname" autoComplete="given-name" />
        )}
        <Field name="email" type="email" placeholder="E-Mail" autoComplete="email" required />
        <Field
          name="password"
          type="password"
          placeholder={mode === "signup" ? "Passwort (min. 8 Zeichen)" : "Passwort"}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
        />

        {state?.error && <p className="px-1 text-sm text-red-400">{state.error}</p>}
        {state?.info && <p className="px-1 text-sm text-lime">{state.info}</p>}

        <button
          disabled={pending}
          className="mt-2 h-14 w-full rounded-2xl bg-lime font-semibold text-black transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Einen Moment…" : mode === "signin" ? "Anmelden" : "Konto erstellen"}
        </button>
      </form>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-14 w-full rounded-2xl border border-line bg-card px-4 text-base outline-none placeholder:text-muted focus:border-lime"
    />
  );
}
