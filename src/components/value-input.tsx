"use client";

import { Minus, Plus } from "lucide-react";
import type { Exercise } from "@/lib/exercises";

export function ValueInput({
  exercise,
  value,
  onChange,
  big = false,
}: {
  exercise: Exercise;
  value: number | null;
  onChange: (v: number | null) => void;
  big?: boolean;
}) {
  const textSize = big ? "text-5xl" : "text-3xl";

  if (exercise.unit === "time") {
    const mins = value == null ? "" : Math.floor(value / 60).toString();
    const secs = value == null ? "" : (Math.round(value) % 60).toString().padStart(2, "0");
    const set = (m: string, s: string) => {
      if (m === "" && s === "") return onChange(null);
      const mm = Math.max(0, parseInt(m || "0", 10) || 0);
      const ss = Math.min(59, Math.max(0, parseInt(s || "0", 10) || 0));
      onChange(mm * 60 + ss);
    };
    return (
      <div className={`tabular flex items-center justify-center gap-1 font-semibold ${textSize}`}>
        <input
          inputMode="numeric"
          aria-label="Minuten"
          placeholder="00"
          value={mins}
          onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 2), secs)}
          className="w-[2.4ch] rounded-xl bg-card-2 py-2 text-center outline-none focus:ring-2 focus:ring-lime"
        />
        <span className="text-muted">:</span>
        <input
          inputMode="numeric"
          aria-label="Sekunden"
          placeholder="00"
          value={secs}
          onChange={(e) => set(mins, e.target.value.replace(/\D/g, "").slice(0, 2))}
          className="w-[2.4ch] rounded-xl bg-card-2 py-2 text-center outline-none focus:ring-2 focus:ring-lime"
        />
        <span className="ml-2 text-base font-normal text-muted">min</span>
      </div>
    );
  }

  const step = 1;
  const v = value ?? 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <StepButton onClick={() => onChange(Math.max(0, v - step))} label="Weniger">
        <Minus size={22} />
      </StepButton>
      <div className="flex items-baseline justify-center gap-2">
        <input
          inputMode="numeric"
          aria-label={exercise.name}
          placeholder="0"
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            onChange(raw === "" ? null : parseInt(raw, 10));
          }}
          className={`tabular w-[3ch] bg-transparent text-center font-semibold outline-none ${textSize}`}
        />
        <span className="text-muted">{exercise.unit === "reps" ? "Wdh." : "Sek."}</span>
      </div>
      <StepButton onClick={() => onChange(v + step)} label="Mehr">
        <Plus size={22} />
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card-2 text-white active:scale-95"
    >
      {children}
    </button>
  );
}
