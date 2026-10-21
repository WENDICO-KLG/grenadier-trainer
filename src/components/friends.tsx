"use client";

import { Check, Copy, Share2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "@/app/actions";

const noop = () => () => {};

export function FriendCodeCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(noop, () => "share" in navigator, () => false);
  if (!code) {
    return (
      <p className="text-sm text-muted">
        Dein Freundescode fehlt noch – führe die Migration <code>002_avatars_friends.sql</code> aus.
      </p>
    );
  }
  const text = `Trainier mit mir für die Grenadier-Aushebung! Mein Code im Grenadier Trainer: ${code}`;

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-muted">Dein Freundescode</p>
        <p className="tabular mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-lime">{code}</p>
      </div>
      <button
        aria-label="Code kopieren"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card-2"
      >
        {copied ? <Check size={18} className="text-lime" /> : <Copy size={18} />}
      </button>
      {canShare && (
        <button
          aria-label="Code teilen"
          onClick={() => navigator.share({ text }).catch(() => {})}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime text-black"
        >
          <Share2 size={18} />
        </button>
      )}
    </div>
  );
}

export function AddFriendForm() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await sendFriendRequest(code);
      if ("error" in res && res.error) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: res.message ?? "Gesendet" });
        setCode("");
      }
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder="Code eingeben"
          autoCapitalize="characters"
          autoComplete="off"
          className="tabular h-12 min-w-0 flex-1 rounded-xl border border-line bg-card-2 px-4 font-mono text-lg tracking-[0.2em] outline-none placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-muted focus:border-lime"
        />
        <button
          disabled={code.length !== 6 || pending}
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-lime px-4 font-semibold text-black disabled:bg-card-2 disabled:text-muted"
        >
          <UserPlus size={18} /> {pending ? "…" : "Hinzufügen"}
        </button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-lime" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}

export function RequestActions({ id, incoming }: { id: number; incoming: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex shrink-0 gap-2">
      {incoming && (
        <button
          disabled={pending}
          onClick={() => start(async () => void (await acceptFriendRequest(id)))}
          className="flex h-10 items-center gap-1 rounded-xl bg-lime px-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          <Check size={16} /> Annehmen
        </button>
      )}
      <button
        disabled={pending}
        aria-label={incoming ? "Ablehnen" : "Anfrage zurückziehen"}
        onClick={() => start(async () => void (await removeFriendship(id)))}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-card-2 text-muted disabled:opacity-50"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function RemoveFriendButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm(`${name} als Freund entfernen?`)) return;
        start(async () => {
          await removeFriendship(id);
          router.push("/freunde");
        });
      }}
      className="h-12 w-full rounded-2xl bg-card text-sm font-medium text-red-400 disabled:opacity-50"
    >
      Freund entfernen
    </button>
  );
}
