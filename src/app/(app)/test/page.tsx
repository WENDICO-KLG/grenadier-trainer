import { ChevronRight, Clock, Music2, Timer } from "lucide-react";
import Link from "next/link";
import { ExerciseImage, GradeBadge } from "@/components/ui";
import { getUserData } from "@/lib/data";
import { EXERCISES, gradeFor, type Exercise } from "@/lib/exercises";

function modeInfo(ex: Exercise) {
  switch (ex.mode) {
    case "countdown-reps":
      return { icon: Timer, text: `${ex.limit} s Countdown · Zähler` };
    case "open-reps":
      return { icon: Clock, text: "Ohne Zeitlimite · Zähler" };
    case "cadence":
      return { icon: Music2, text: `Sekundentakt · max. ${ex.limit} s` };
    case "stopwatch":
      return { icon: Clock, text: "Stoppuhr · Limite 40:00" };
  }
}

export default async function TestOverviewPage() {
  const { exercises } = await getUserData();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Test-Modus</h1>
        <p className="mt-1 text-muted">
          Wähle eine Disziplin. Timer und Takt laufen wie an der Prüfung – am Ende bekommst du deine Note.
        </p>
      </header>

      <div className="space-y-3">
        {EXERCISES.map((ex) => {
          const info = modeInfo(ex);
          const Icon = info.icon;
          const grade = gradeFor(ex, exercises.get(ex.id)?.record);
          return (
            <Link
              key={ex.id}
              href={`/test/${ex.id}`}
              className="flex items-center gap-4 rounded-3xl bg-card p-3 pr-4 transition active:scale-[0.99]"
            >
              <ExerciseImage exercise={ex} className="h-20 w-20 shrink-0 rounded-2xl" sizes="80px" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{ex.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Icon size={13} /> {info.text}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Bestnote: <GradeBadge grade={grade} />
                </p>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          );
        })}
      </div>

      <p className="mt-6 px-1 text-xs leading-relaxed text-muted">
        Tipp: Ton einschalten. Der Bildschirm bleibt während des Tests an. Tiefer Ton = runter, hoher Ton = hoch.
      </p>
    </div>
  );
}
