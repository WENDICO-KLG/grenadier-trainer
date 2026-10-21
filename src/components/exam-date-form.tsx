"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions";

export function ExamDateForm({ initial, compact = false }: { initial: string | null; compact?: boolean }) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = value !== (initial ?? "");

  const save = () =>
    start(async () => {
      await updateProfile({ exam_date: value || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });

  return (
    <div className={`flex gap-2 ${compact ? "" : "mt-4"}`}>
      <input
        type="date"
        value={value}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-card-2 px-3 text-base outline-none focus:border-lime"
      />
      <button
        onClick={save}
        disabled={pending || (!dirty && !saved)}
        className="h-12 shrink-0 rounded-xl bg-lime px-5 font-semibold text-black disabled:bg-card-2 disabled:text-muted"
      >
        {saved ? "✓" : pending ? "…" : "Speichern"}
      </button>
    </div>
  );
}
