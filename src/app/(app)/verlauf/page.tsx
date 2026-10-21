import { Card, GradeBadge, PrimaryButton } from "@/components/ui";
import { DeleteResultButton } from "@/components/delete-result-button";
import { getResults, getUserData } from "@/lib/data";
import { EXERCISES, formatValue, getExercise } from "@/lib/exercises";

export default async function HistoryPage() {
  const { user } = await getUserData();
  const results = await getResults(user.id, undefined, 200);

  const byDay = new Map<string, typeof results>();
  for (const r of results) {
    const day = new Date(r.created_at).toLocaleDateString("de-CH", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Verlauf</h1>
        <p className="mt-1 text-muted">Alle deine Testresultate.</p>
      </header>

      {results.length > 0 && <Sparklines results={results} />}

      {results.length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">Noch keine Tests</p>
          <p className="mt-1 text-sm text-muted">Starte deinen ersten Test, um Fortschritte zu sehen.</p>
          <PrimaryButton href="/test" className="mt-5">
            Zum Test-Modus
          </PrimaryButton>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 px-1 text-sm font-medium text-muted">{day}</p>
              <Card className="divide-y divide-line/60 p-0">
                {items.map((r) => {
                  const ex = getExercise(r.exercise)!;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ex.name}</p>
                        <p className="tabular text-xs text-muted">{formatValue(ex, r.value)}</p>
                      </div>
                      <GradeBadge grade={r.grade} />
                      <DeleteResultButton id={r.id} />
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Sparklines({ results }: { results: Awaited<ReturnType<typeof getResults>> }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-2">
      {EXERCISES.map((ex) => {
        const series = results
          .filter((r) => r.exercise === ex.id)
          .slice(0, 12)
          .reverse()
          .map((r) => r.grade);
        const last = series.at(-1) ?? null;
        return (
          <Card key={ex.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="truncate text-xs text-muted">{ex.short}</p>
              <GradeBadge grade={last} />
            </div>
            <Spark values={series} />
          </Card>
        );
      })}
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const w = 120;
  const h = 32;
  if (values.length < 2) {
    return <div className="mt-2 h-8 text-[10px] leading-8 text-muted">{values.length ? "1 Test" : "–"}</div>;
  }
  const min = 1;
  const max = 5;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`)
    .join(" ");
  const passY = h - ((3.6 - min) / (max - min)) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-8 w-full overflow-visible" preserveAspectRatio="none">
      <line x1="0" x2={w} y1={passY} y2={passY} stroke="#2a2e33" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke="#c8f04a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
