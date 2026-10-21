import { ArrowLeft, Clock, Info, Lightbulb, Play, Shirt } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GoalRecordEditor } from "@/components/goal-record-editor";
import { Card, ExerciseImage, GradeBadge, PrimaryButton, SectionTitle } from "@/components/ui";
import { getResults, getUserData } from "@/lib/data";
import { formatValue, getExercise, gradeColor, gradeFor, type ExerciseId } from "@/lib/exercises";

export default async function ExercisePage({ params }: PageProps<"/uebung/[id]">) {
  const { id } = await params;
  const ex = getExercise(id);
  if (!ex) notFound();

  const { user, exercises } = await getUserData();
  const results = await getResults(user.id, ex.id as ExerciseId, 8);
  const data = exercises.get(ex.id);
  const recordGrade = gradeFor(ex, data?.record);
  const goalGrade = gradeFor(ex, data?.goal);

  return (
    <div>
      <div className="relative -mx-5 -mt-6">
        <ExerciseImage exercise={ex} className="aspect-square w-full" sizes="(max-width: 448px) 100vw, 448px" eager />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent" />
        <Link
          href="/"
          aria-label="Zurück"
          className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur"
        >
          <ArrowLeft size={20} />
        </Link>
      </div>

      <h1 className="-mt-6 relative text-3xl font-semibold tracking-tight">{ex.name}</h1>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <Chip icon={<Clock size={13} />}>{ex.timeInfo}</Chip>
        <Chip icon={<Shirt size={13} />}>{ex.tenue}</Chip>
      </div>

      <PrimaryButton href={`/test/${ex.id}`} className="mt-5">
        <Play size={18} fill="currentColor" /> Test starten
      </PrimaryButton>

      <SectionTitle>Ziel & Rekord</SectionTitle>
      <GoalRecordEditor exerciseId={ex.id} goal={data?.goal ?? null} record={data?.record ?? null} />

      <SectionTitle>Ausführung</SectionTitle>
      <Card>
        <p className="text-xs uppercase tracking-wider text-muted">Ausgangslage</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {ex.start.map((s) => (
            <li key={s} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs uppercase tracking-wider text-muted">Ablauf</p>
        <ol className="mt-2 space-y-3 text-sm">
          {ex.steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-dim text-xs font-semibold text-lime">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex gap-3 rounded-2xl bg-card-2 p-3 text-sm">
          <Info size={18} className="shrink-0 text-lime" />
          <span>
            <b>Bewertung:</b> {ex.scoring}
            {ex.cadence ? ` · Takt: ${ex.cadence} s pro Bewegung` : ""}
          </span>
        </div>
      </Card>

      <SectionTitle>Trainingstipps</SectionTitle>
      <Card>
        <ul className="space-y-3 text-sm">
          {ex.tips.map((t) => (
            <li key={t} className="flex gap-3">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-lime" />
              {t}
            </li>
          ))}
        </ul>
      </Card>

      {results.length > 0 && (
        <>
          <SectionTitle>Letzte Tests</SectionTitle>
          <Card className="p-2">
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="text-muted">
                  {new Date(r.created_at).toLocaleDateString("de-CH", { day: "numeric", month: "short" })}
                </span>
                <span className="tabular font-medium">{formatValue(ex, r.value)}</span>
                <GradeBadge grade={r.grade} />
              </div>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Notentabelle</SectionTitle>
      <Card className="p-2">
        <div className="grid grid-cols-2 gap-x-2">
          {ex.tableLabels.map(([label, grade]) => {
            const isRecord = recordGrade === grade;
            const isGoal = goalGrade === grade;
            return (
              <div
                key={label}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  isRecord ? "bg-lime-dim" : isGoal ? "ring-1 ring-lime/40" : ""
                }`}
              >
                <span className="tabular">{label}</span>
                <span className={`tabular font-semibold ${gradeColor(grade)}`}>{grade.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
        <p className="px-3 pb-2 pt-3 text-xs text-muted">
          Hinterlegt = dein Rekord · Umrandet = dein Ziel. Bestanden ab Ø 3.60 über alle Disziplinen.
        </p>
      </Card>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-muted">
      {icon}
      {children}
    </span>
  );
}
