import { ChevronRight, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ExamDateForm } from "@/components/exam-date-form";
import { InstallAppButton } from "@/components/install-app";
import {
  BandLabel,
  Card,
  ExerciseImage,
  GradeBadge,
  PrimaryButton,
  ProgressBar,
  SectionTitle,
} from "@/components/ui";
import { averageGrade, EXERCISES, formatValue, gradeFor, PASS_GRADE } from "@/lib/exercises";
import { getUserData } from "@/lib/data";
import { daysUntil, formatDateCH, phaseFor } from "@/lib/plan";

export default async function HomePage() {
  const { profile, exercises } = await getUserData();
  const days = daysUntil(profile.exam_date);
  const phase = phaseFor(days);

  const rows = EXERCISES.map((ex) => {
    const data = exercises.get(ex.id);
    const record = data?.record ?? null;
    const goal = data?.goal ?? null;
    const grade = gradeFor(ex, record);
    let progress: number | null = null;
    if (record != null && goal != null && goal > 0) {
      progress = ex.lowerIsBetter ? goal / record : record / goal;
    }
    return { ex, record, goal, grade, progress };
  });

  const grades = rows.map((r) => r.grade);
  const avg = averageGrade(grades);
  const tested = grades.filter((g) => g != null).length;
  const weakest = rows
    .filter((r) => r.grade != null)
    .sort((a, b) => (a.grade ?? 0) - (b.grade ?? 0))[0];
  const untested = rows.find((r) => r.grade == null);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-muted">Hallo{profile.display_name ? ` ${profile.display_name}` : ""} 👋</p>
          <h1 className="text-3xl font-semibold tracking-tight">Dein Training</h1>
        </div>
        <Link href="/profil" aria-label="Profil">
          <Avatar url={profile.avatar_url} name={profile.display_name} size={48} />
        </Link>
      </header>

      <InstallAppButton variant="card" />

      {/* Countdown */}
      <Card className="relative overflow-hidden bg-lime text-black">
        {days == null ? (
          <>
            <p className="text-sm font-medium opacity-70">Aushebung</p>
            <p className="mt-1 text-2xl font-semibold leading-tight">Wann ist deine Eignungsprüfung?</p>
            <p className="mt-1 text-sm opacity-70">Damit planen wir dein Training bis zum Tag X.</p>
            <div className="[&_button]:bg-black [&_button]:text-lime [&_input]:border-black/20 [&_input]:bg-white/60 [&_input]:text-black">
              <ExamDateForm initial={null} />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium opacity-70">
              {days >= 0 ? "Noch bis zur Aushebung" : "Aushebung war am"}
            </p>
            <div className="mt-1 flex items-end gap-2">
              <span className="tabular text-6xl font-bold leading-none tracking-tight">
                {days >= 0 ? days : Math.abs(days)}
              </span>
              <span className="mb-1 text-lg font-medium">{Math.abs(days) === 1 ? "Tag" : "Tage"}</span>
              {days >= 14 && (
                <span className="mb-1 ml-auto rounded-full bg-black/10 px-3 py-1 text-sm font-medium">
                  {Math.floor(days / 7)} Wochen
                </span>
              )}
            </div>
            <p className="mt-2 text-sm opacity-70">{formatDateCH(profile.exam_date!)}</p>
          </>
        )}
      </Card>

      {/* Phase */}
      {phase && (
        <Card className="mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Trainingsphase</p>
              <p className="text-xl font-semibold">{phase.name}</p>
            </div>
            <span className="rounded-full bg-lime-dim px-3 py-1 text-xs font-medium text-lime">
              {phase.testEvery}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">{phase.summary}</p>
          {phase.week.length > 0 && (
            <ul className="mt-4 space-y-2">
              {phase.week.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Prognose */}
      <SectionTitle>Prognose</SectionTitle>
      <Card>
        <div className="flex items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-card-2">
            <GradeBadge grade={avg} size="lg" />
          </div>
          <div className="min-w-0">
            {avg == null ? (
              <>
                <p className="font-semibold">Noch keine Werte</p>
                <p className="text-sm text-muted">Mach einen Test oder trag deine Rekorde ein.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">
                  {avg >= PASS_GRADE ? "Bestanden" : "Noch nicht bestanden"}
                </p>
                <BandLabel grade={avg} />
                <p className="mt-1 text-xs text-muted">
                  Ø aus {tested} von 5 Disziplinen · Minimum {PASS_GRADE.toFixed(2)}
                </p>
              </>
            )}
          </div>
        </div>
        {(untested || weakest) && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card-2 p-3 text-sm">
            <Target size={18} className="shrink-0 text-lime" />
            {untested ? (
              <span>
                Teste als Nächstes: <b>{untested.ex.name}</b>
              </span>
            ) : (
              <span>
                Fokus diese Woche: <b>{weakest!.ex.name}</b> (Note {weakest!.grade!.toFixed(1)})
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Übungen */}
      <SectionTitle>Disziplinen</SectionTitle>
      <div className="space-y-2">
        {rows.map(({ ex, record, goal, grade, progress }) => (
          <Link
            key={ex.id}
            href={`/uebung/${ex.id}`}
            className="flex items-center gap-4 rounded-3xl bg-card p-3 pr-4 transition active:scale-[0.99]"
          >
            <ExerciseImage exercise={ex} className="h-16 w-16 shrink-0 rounded-2xl" sizes="64px" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{ex.name}</p>
                <GradeBadge grade={grade} />
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Trophy size={12} /> {formatValue(ex, record)}
                </span>
                <span className="flex items-center gap-1">
                  <Target size={12} /> {goal == null ? "Ziel setzen" : formatValue(ex, goal)}
                </span>
              </div>
              {progress != null && (
                <div className="mt-2">
                  <ProgressBar value={progress} />
                </div>
              )}
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>

      <PrimaryButton href="/test" className="mt-6">
        Test starten
      </PrimaryButton>
    </div>
  );
}
