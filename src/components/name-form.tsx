"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions";

export function NameForm({ initial }: { initial: string | null }) {
  const [name, setName] = useState(initial ?? "");
  const [pending, start] = useTransition();
  const dirty = name.trim() !== (initial ?? "");

  return (
    <div className="mt-2 flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Dein Vorname"
        className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-card-2 px-3 text-base outline-none focus:border-lime"
      />
      {dirty && (
        <button
          disabled={pending}
          onClick={() => start(async () => void (await updateProfile({ display_name: name.trim() || null })))}
          className="h-12 rounded-xl bg-lime px-5 font-semibold text-black"
        >
          {pending ? "…" : "OK"}
        </button>
      )}
    </div>
  );
}
