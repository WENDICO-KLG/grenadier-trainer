"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";
import { setDiscoverable } from "@/app/actions";

export function DiscoverableToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          const res = await setDiscoverable(next);
          if ("error" in res && res.error) setOn(!next);
        });
      }}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="flex items-start gap-3">
        {on ? <Eye size={18} className="mt-0.5 shrink-0 text-lime" /> : <EyeOff size={18} className="mt-0.5 shrink-0 text-muted" />}
        <span>
          <span className="block text-sm font-medium">In der Mitgliederliste sichtbar</span>
          <span className="block text-xs text-muted">
            Andere sehen nur deinen Namen und dein Profilbild und können dich einladen.
          </span>
        </span>
      </span>
      <span className={`h-6 w-10 shrink-0 rounded-full p-0.5 transition ${on ? "bg-lime" : "bg-card-2"}`}>
        <span className={`block h-5 w-5 rounded-full bg-black transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}
