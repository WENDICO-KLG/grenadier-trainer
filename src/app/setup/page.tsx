import { redirect } from "next/navigation";
import { isSupabaseConfigured, usesSecretKey } from "@/lib/supabase/env";

export default function SetupPage() {
  if (isSupabaseConfigured) redirect("/");

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold">Supabase verbinden</h1>
      {usesSecretKey && (
        <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
          <p className="font-semibold text-red-400">Falscher Key in .env.local</p>
          <p className="mt-1">
            Du hast einen <b>Secret Key</b> (<code>sb_secret_…</code>) eingetragen. Der darf nie in eine{" "}
            <code>NEXT_PUBLIC_</code>-Variable, weil er im Browser landet und alle Zugriffsregeln umgeht. Nimm im
            Supabase Dashboard unter <i>Project Settings → API Keys</i> den <b>Publishable Key</b>{" "}
            (<code>sb_publishable_…</code>) und starte den Dev-Server neu.
          </p>
        </div>
      )}
      <p className="mt-3 text-muted">
        Die App braucht eine Supabase-Datenbank, damit Ziele, Rekorde und Tests gespeichert werden.
      </p>
      <ol className="mt-8 space-y-5 text-sm leading-relaxed">
        <li>
          <b>1.</b> Projekt auf <span className="text-lime">supabase.com</span> erstellen.
        </li>
        <li>
          <b>2.</b> Im <i>SQL Editor</i> den Inhalt von <code className="text-lime">supabase/schema.sql</code>{" "}
          ausführen.
        </li>
        <li>
          <b>3.</b> Datei <code className="text-lime">.env.local</code> anlegen:
          <pre className="mt-2 overflow-x-auto rounded-2xl bg-card p-4 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}
          </pre>
        </li>
        <li>
          <b>4.</b> Unter <i>Authentication → URL Configuration</i> die Site URL{" "}
          <code className="text-lime">http://localhost:3000</code> setzen und{" "}
          <code className="text-lime">http://localhost:3000/auth/callback</code> als Redirect URL erlauben.
        </li>
        <li>
          <b>5.</b> Dev-Server neu starten.
        </li>
      </ol>
    </main>
  );
}
