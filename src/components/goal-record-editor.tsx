"use client";

import { Target, Trophy } from "lucide-react";
import { useState, useTransition } from "react";
import { saveExerciseSettings } from "@/app/actions";
import { GradeBadge } from "@/components/ui";
import { ValueInput } from "@/components/value-input";
import {
  getExercise,
  GOAL_PRESETS,
  gradeFor,
  valueForGrade,
  type ExerciseId,
} from "@/lib/exercises";

export function GoalRecordEditor({
  exerciseId,
  goal,
  record,
}: {
  exerciseId: ExerciseId;
  goal: number | null;
  record: number | null;
}) {
  const exercise = getExercise(exerciseId)!;
  const [tab, setTab] = useState<"goal" | "record">(goal == null ? "goal" : "record");
  const [goalValue, setGoalValue] = useState(goal);
  const [recordValue, setRecordValue] = useState(record);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const current = tab === "goal" ? goalValue : recordValue;
  const setCurrent = tab === "goal" ? setGoalValue : setRecordValue;
  const original = tab === "goal" ? goal : record;
  const dirty = current !== original;

  const save = () =>
    start(async () => {
      await saveExerciseSettings(exerciseId, tab === "goal" ? { goal: current } : { record: current });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });

  return (
    <div className="rounded-3xl bg-card p-5">
      <div className="grid grid-cols-2 gap-2">
        <TabButton active={tab === "record"} onClick={() => setTab("record")}>
          <Trophy size={16} /> Rekord
        </TabButton>
        <TabButton active={tab === "goal"} onClick={() => setTab("goal")}>
          <Target size={16} /> Ziel
        </TabButton>
      </div>

      <div className="mt-6">
        <ValueInput exercise={exercise} value={current} onChange={setCurrent} big />
      </div>

      <p className="mt-3 text-center text-sm text-muted">
        {current == null ? (
          "Noch kein Wert"
        ) : (
          <>
            entspricht Note <GradeBadge grade={gradeFor(exercise, current)} />
          </>
        )}
      </p>

      {tab === "goal" && (
        <div className="mt-5 grid grid-cols-4 gap-2">
          {GOAL_PRESETS.map((p) => {
            const v = valueForGrade(exercise, p.grade);
            const active = goalValue === v;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setGoalValue(v)}
                className={`rounded-xl px-1 py-2 text-center text-xs transition ${
                  active ? "bg-lime text-black" : "bg-card-2 text-muted"
                }`}
              >
                <span className="block font-semibold">{p.grade.toFixed(1)}</span>
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={save}
        disabled={!dirty || pending}
        className="mt-5 h-12 w-full rounded-2xl bg-lime font-semibold text-black transition disabled:bg-card-2 disabled:text-muted"
      >
        {saved ? "Gespeichert ✓" : pending ? "Speichert…" : tab === "goal" ? "Ziel speichern" : "Rekord speichern"}
      </button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${
        active ? "bg-card-2 text-white" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}
