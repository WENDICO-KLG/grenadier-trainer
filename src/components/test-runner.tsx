"use client";

import { Pause, Play, RotateCcw, Undo2, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveTestResult } from "@/app/actions";
import { ShareRecordButton } from "@/components/share-record";
import { ExerciseImage } from "@/components/ui";
import { ValueInput } from "@/components/value-input";
import { beep, cancelBeeps, getAudio, scheduleBeep, TONE, vibrate } from "@/lib/audio";
import {
  formatTime,
  formatValue,
  getExercise,
  gradeBand,
  gradeColor,
  gradeFor,
  type ExerciseId,
} from "@/lib/exercises";

type Stage = "setup" | "countdown" | "running" | "result";

const COUNTDOWN_MS = 3000;
const CADENCE_OPTIONS = [0.75, 1, 1.25, 1.5];

export function TestRunner({
  exerciseId,
  record,
  goal,
  userName = null,
}: {
  exerciseId: ExerciseId;
  record: number | null;
  goal: number | null;
  userName?: string | null;
}) {
  const ex = getExercise(exerciseId)!;
  const limit = ex.limit ?? 0;

  const [stage, setStage] = useState<Stage>("setup");
  const [sound, setSound] = useState(true);
  const [cadence, setCadence] = useState(ex.cadence ?? 1);

  // Uhr: t0 = performance.now() beim Startsignal ("Los")
  const [t0, setT0] = useState(0);
  const [now, setNow] = useState(0);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);

  const [reps, setReps] = useState(0);
  const [tapKey, setTapKey] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const [result, setResult] = useState<number | null>(null);

  const scheduled = useRef<(OscillatorNode | null)[]>([]);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const elapsed = Math.max(0, ((pausedAt ?? now) - t0 - pausedTotal) / 1000);
  const countdownLeft = Math.ceil((t0 - now) / 1000);

  const releaseResources = useCallback(() => {
    cancelBeeps(scheduled.current);
    scheduled.current = [];
    void wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }, []);

  const finish = useCallback(
    (value: number) => {
      releaseResources();
      setResult(value);
      setStage("result");
    },
    [releaseResources],
  );

  const repsRef = useRef(0);
  useEffect(() => {
    repsRef.current = reps;
  }, [reps]);

  // Animations-Loop während Countdown und Test, inkl. automatischer Stage-Wechsel
  useEffect(() => {
    if (stage !== "countdown" && stage !== "running") return;
    const hasLimit = ex.mode === "countdown-reps" || ex.mode === "cadence";
    let raf = 0;
    const loop = () => {
      const n = performance.now();
      setNow(n);
      const el = (n - t0) / 1000;
      if (stage === "countdown" && el >= 0) return setStage("running");
      if (stage === "running" && hasLimit && el >= limit) {
        return finish(ex.mode === "cadence" ? limit : repsRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stage, t0, limit, ex.mode, finish]);

  useEffect(() => releaseResources, [releaseResources]);

  const start = async () => {
    const audio = sound ? getAudio() : null;
    const startPerf = performance.now() + COUNTDOWN_MS;
    setT0(startPerf);
    setNow(performance.now());
    setPausedAt(null);
    setPausedTotal(0);
    setReps(0);
    setLaps([]);
    setStage("countdown");

    try {
      wakeLock.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      // Wake Lock nicht verfügbar
    }

    if (!audio) return;
    const a0 = audio.currentTime + COUNTDOWN_MS / 1000;
    const nodes: (OscillatorNode | null)[] = [];
    const at = (t: number, f: number, d?: number) => nodes.push(scheduleBeep(a0 + t, f, d));

    at(-3, TONE.tick);
    at(-2, TONE.tick);
    at(-1, TONE.tick);

    if (ex.mode === "cadence") {
      const labels = ex.cadenceLabels!;
      const steps = Math.floor(limit / cadence);
      for (let k = 0; k < steps; k++) {
        const label = labels[k % 2];
        at(k * cadence, label === "Hoch" ? TONE.up : TONE.down, k === 0 ? 0.25 : 0.1);
      }
      at(limit, TONE.end, 0.6);
    } else {
      at(0, TONE.go, 0.35);
    }

    if (ex.mode === "countdown-reps") {
      if (limit > 30) at(limit - 30, TONE.tick);
      at(limit - 10, TONE.tick);
      at(limit - 3, TONE.tick);
      at(limit - 2, TONE.tick);
      at(limit - 1, TONE.tick);
      at(limit, TONE.end, 0.7);
    }

    scheduled.current = nodes;
  };

  const cancel = () => {
    releaseResources();
    setStage("setup");
  };

  const countRep = () => {
    setReps((r) => r + 1);
    setTapKey((k) => k + 1);
    if (sound) beep(TONE.tap, 0.04, 0.15);
    vibrate(12);
  };

  const togglePause = () => {
    if (pausedAt == null) {
      setPausedAt(performance.now());
    } else {
      setPausedTotal((p) => p + performance.now() - pausedAt);
      setPausedAt(null);
    }
  };

  // ---------- Setup ----------
  if (stage === "setup") {
    return (
      <Screen>
        <TopBar title={ex.name} closeHref={`/uebung/${ex.id}`} />
        <ExerciseImage exercise={ex} className="mx-auto aspect-square w-full max-w-[min(15rem,32dvh)] rounded-3xl" sizes="240px" eager />

        <ul className="mt-6 space-y-2 text-sm">
          {ex.steps.slice(0, 3).map((s) => (
            <li key={s} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-3">
          {ex.mode === "cadence" && (
            <div className="rounded-2xl bg-card p-4">
              <p className="text-sm font-medium">Takt pro Bewegung</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {CADENCE_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCadence(c)}
                    className={`h-11 rounded-xl text-sm font-semibold ${
                      cadence === c ? "bg-lime text-black" : "bg-card-2 text-muted"
                    }`}
                  >
                    {c.toString().replace(".", ",")} s
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Prüfung: 1 s runter, 1 s hoch. Hoher Ton = hoch, tiefer Ton = runter.</p>
            </div>
          )}

          <button
            onClick={() => setSound((s) => !s)}
            className="flex h-12 w-full items-center justify-between rounded-2xl bg-card px-4 text-sm"
          >
            <span className="flex items-center gap-2">
              {sound ? <Volume2 size={18} className="text-lime" /> : <VolumeX size={18} className="text-muted" />}
              Ton {sound ? "an" : "aus"}
            </span>
            <span className={`h-6 w-10 rounded-full p-0.5 transition ${sound ? "bg-lime" : "bg-card-2"}`}>
              <span className={`block h-5 w-5 rounded-full bg-black transition ${sound ? "translate-x-4" : ""}`} />
            </span>
          </button>
        </div>

        <div className="mt-auto pt-8">
          <button
            onClick={start}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-lime text-lg font-semibold text-black active:scale-[0.98]"
          >
            <Play size={20} fill="currentColor" /> Start
          </button>
          <button
            onClick={() => {
              setResult(null);
              setStage("result");
            }}
            className="mt-3 h-11 w-full text-sm text-muted"
          >
            Resultat direkt eintragen
          </button>
        </div>
      </Screen>
    );
  }

  // ---------- Countdown ----------
  if (stage === "countdown") {
    return (
      <Screen>
        <TopBar title={ex.name} onClose={cancel} />
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-muted">Bereit machen</p>
          <p key={countdownLeft} className="animate-pop tabular text-[10rem] font-bold leading-none text-lime">
            {Math.max(1, countdownLeft)}
          </p>
          {ex.mode === "cadence" && (
            <p className="mt-4 text-lg text-muted">
              Zuerst: <b className="text-white">{ex.cadenceLabels![0]}</b>
            </p>
          )}
        </div>
      </Screen>
    );
  }

  // ---------- Resultat ----------
  if (stage === "result") {
    return (
      <ResultView
        exerciseId={ex.id}
        initial={result}
        record={record}
        goal={goal}
        userName={userName}
        onRetry={() => setStage("setup")}
      />
    );
  }

  // ---------- Läuft ----------
  const liveGrade =
    ex.mode === "stopwatch"
      ? gradeFor(ex, elapsed)
      : ex.mode === "cadence"
        ? gradeFor(ex, Math.floor(elapsed))
        : gradeFor(ex, reps);

  return (
    <Screen>
      <TopBar title={ex.name} onClose={cancel} />

      {(ex.mode === "countdown-reps" || ex.mode === "open-reps") && (
        <>
          <div className="text-center">
            <p className="text-sm text-muted">{ex.mode === "countdown-reps" ? "Verbleibend" : "Zeit"}</p>
            <p
              className={`tabular text-6xl font-bold ${
                ex.mode === "countdown-reps" && limit - elapsed <= 10 ? "text-red-400" : ""
              }`}
            >
              {ex.mode === "countdown-reps"
                ? Math.ceil(Math.max(0, limit - elapsed))
                : formatTime(elapsed)}
            </p>
            {ex.mode === "countdown-reps" && (
              <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-card-2">
                <div className="h-full bg-lime" style={{ width: `${(1 - elapsed / limit) * 100}%` }} />
              </div>
            )}
          </div>

          <div className="flex flex-1 items-center justify-center py-6">
            <button
              onPointerDown={countRep}
              className="relative flex aspect-square w-[min(78vw,320px)] select-none flex-col items-center justify-center rounded-full bg-lime text-black shadow-[0_0_80px_-10px] shadow-lime/40 active:scale-95"
              style={{ touchAction: "manipulation" }}
            >
              <span key={tapKey} className="animate-pop tabular text-8xl font-bold leading-none">
                {reps}
              </span>
              <span className="mt-2 text-sm font-medium opacity-70">Tippen pro Wiederholung</span>
            </button>
          </div>

          <p className="text-center text-sm text-muted">
            Aktuell Note <span className={gradeColor(liveGrade)}>{liveGrade?.toFixed(1)}</span>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setReps((r) => Math.max(0, r - 1))}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-card font-medium"
            >
              <Undo2 size={18} /> −1
            </button>
            <button
              onClick={() => finish(reps)}
              className="h-14 rounded-2xl bg-white font-semibold text-black"
            >
              {ex.mode === "open-reps" ? "Fertig" : "Beenden"}
            </button>
          </div>
        </>
      )}

      {ex.mode === "cadence" && <CadenceView elapsed={elapsed} cadence={cadence} limit={limit} labels={ex.cadenceLabels!} grade={liveGrade} onStop={() => finish(Math.min(limit, Math.floor(elapsed)))} />}

      {ex.mode === "stopwatch" && (
        <StopwatchView
          elapsed={elapsed}
          paused={pausedAt != null}
          laps={laps}
          goal={goal}
          grade={liveGrade}
          onLap={() => setLaps((l) => [...l, elapsed])}
          onPause={togglePause}
          onFinish={() => finish(Math.round(elapsed))}
        />
      )}
    </Screen>
  );
}

// ---------- Teilansichten ----------

function CadenceView({
  elapsed,
  cadence,
  limit,
  labels,
  grade,
  onStop,
}: {
  elapsed: number;
  cadence: number;
  limit: number;
  labels: [string, string];
  grade: number | null;
  onStop: () => void;
}) {
  const step = Math.floor(elapsed / cadence);
  const label = labels[step % 2];
  const within = (elapsed % cadence) / cadence; // 0..1 innerhalb der Bewegung
  const goingUp = label === "Hoch";
  // Position des Punktes: 0 = unten, 1 = oben
  const pos = goingUp ? within : 1 - within;
  const reps = Math.floor(elapsed / (cadence * 2));

  return (
    <>
      <div className="flex flex-1 items-center gap-6 py-4">
        {/* Messmarken-Anzeige */}
        <div className="relative h-[46vh] max-h-96 w-16 shrink-0 rounded-full bg-card">
          <div className="absolute inset-x-2 top-3 h-1 rounded-full bg-lime/50" />
          <div className="absolute inset-x-2 bottom-3 h-1 rounded-full bg-white/40" />
          <div
            className="absolute left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-lime shadow-[0_0_30px] shadow-lime/60"
            style={{ bottom: `calc(${pos} * (100% - 3rem))` }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p
            key={step}
            className={`animate-pop text-6xl font-black uppercase tracking-tight ${
              goingUp ? "text-lime" : "text-white"
            }`}
          >
            {label}
          </p>
          <p className="mt-6 text-sm text-muted">Zeit</p>
          <p className="tabular text-5xl font-bold">
            {Math.floor(elapsed)}
            <span className="text-2xl text-muted"> / {limit} s</span>
          </p>
          <p className="mt-4 text-sm text-muted">
            {reps} Wdh. · Note <span className={gradeColor(grade)}>{grade?.toFixed(1)}</span>
          </p>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-card-2">
        <div className="h-full bg-lime" style={{ width: `${(elapsed / limit) * 100}%` }} />
      </div>

      <button
        onClick={onStop}
        className="mt-5 h-20 w-full rounded-2xl bg-red-500 text-xl font-bold text-white active:scale-[0.98]"
      >
        Stopp
      </button>
      <p className="mt-2 text-center text-xs text-muted">Stoppen, sobald du den Takt nicht mehr halten kannst.</p>
    </>
  );
}

function StopwatchView({
  elapsed,
  paused,
  laps,
  goal,
  grade,
  onLap,
  onPause,
  onFinish,
}: {
  elapsed: number;
  paused: boolean;
  laps: number[];
  goal: number | null;
  grade: number | null;
  onLap: () => void;
  onPause: () => void;
  onFinish: () => void;
}) {
  const ex = getExercise("marsch")!;
  const nextRow = ex.table.find(([t]) => elapsed <= t);
  const goalPace = goal ? goal / 5 : null;
  const lastLap = laps.at(-1) ?? 0;

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm text-muted">{paused ? "Pausiert" : "Marschzeit"}</p>
        <p className={`tabular text-[5.5rem] font-bold leading-none ${paused ? "text-muted" : ""}`}>
          {formatTime(elapsed)}
        </p>
        <p className="mt-3 text-sm text-muted">
          {nextRow ? (
            <>
              Note <span className={gradeColor(nextRow[1])}>{nextRow[1].toFixed(1)}</span> wenn du bis{" "}
              <b className="text-white">{formatTime(nextRow[0])}</b> im Ziel bist
            </>
          ) : (
            <span className="text-red-400">Zeitlimite 40:00 überschritten</span>
          )}
        </p>

        <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
          <Stat label="Kilometer" value={`${laps.length} / 5`} />
          <Stat label="Note jetzt" value={grade?.toFixed(1) ?? "–"} className={gradeColor(grade)} />
          <Stat label="Ziel-Pace" value={goalPace ? `${formatTime(goalPace)}/km` : "–"} />
        </div>

        {laps.length > 0 && (
          <div className="mt-4 w-full space-y-1 text-sm">
            {laps.map((t, i) => (
              <div key={i} className="flex justify-between rounded-xl bg-card px-4 py-2">
                <span className="text-muted">km {i + 1}</span>
                <span className="tabular">{formatTime(t - (laps[i - 1] ?? 0))}</span>
                <span className="tabular text-muted">{formatTime(t)}</span>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted">Aktueller km: {formatTime(elapsed - lastLap)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={onPause} className="flex h-16 items-center justify-center rounded-2xl bg-card" aria-label={paused ? "Weiter" : "Pause"}>
          {paused ? <Play size={22} /> : <Pause size={22} />}
        </button>
        <button onClick={onLap} disabled={paused || laps.length >= 5} className="h-16 rounded-2xl bg-card font-semibold disabled:opacity-40">
          + km
        </button>
        <button onClick={onFinish} className="h-16 rounded-2xl bg-lime font-semibold text-black">
          Ziel
        </button>
      </div>
    </>
  );
}

function ResultView({
  exerciseId,
  initial,
  record,
  goal,
  userName,
  onRetry,
}: {
  exerciseId: ExerciseId;
  initial: number | null;
  record: number | null;
  goal: number | null;
  userName: string | null;
  onRetry: () => void;
}) {
  const ex = getExercise(exerciseId)!;
  const [value, setValue] = useState<number | null>(initial);
  const [saved, setSaved] = useState<{ isRecord: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const grade = gradeFor(ex, value);
  const goalReached =
    goal != null && value != null && (ex.lowerIsBetter ? value <= goal : value >= goal);

  const save = () =>
    start(async () => {
      if (value == null) return;
      const res = await saveTestResult(ex.id, value);
      if ("error" in res && res.error) setError(res.error);
      else setSaved({ isRecord: Boolean(res.isRecord) });
    });

  return (
    <Screen>
      <TopBar title="Resultat" closeHref={`/uebung/${ex.id}`} />

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {saved?.isRecord && (
          <p className="mb-4 rounded-full bg-lime px-4 py-1.5 text-sm font-semibold text-black">Neuer Rekord! 🎉</p>
        )}
        <p className="text-sm text-muted">{ex.name}</p>
        <p className={`tabular text-[7rem] font-bold leading-none ${gradeColor(grade)}`}>
          {grade?.toFixed(1) ?? "–"}
        </p>
        {grade != null && <p className={`text-lg ${gradeColor(grade)}`}>{gradeBand(grade)}</p>}

        <div className="mt-8 w-full rounded-3xl bg-card p-5">
          <p className="mb-4 text-sm text-muted">{saved ? "Gespeichert" : "Resultat prüfen oder korrigieren"}</p>
          {saved ? (
            <p className="tabular text-4xl font-semibold">{formatValue(ex, value)}</p>
          ) : (
            <ValueInput exercise={ex} value={value} onChange={setValue} big />
          )}
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-card-2 p-3">
              <p className="text-xs text-muted">Rekord</p>
              <p className="tabular font-semibold">{formatValue(ex, record)}</p>
            </div>
            <div className={`rounded-2xl p-3 ${goalReached ? "bg-lime-dim" : "bg-card-2"}`}>
              <p className="text-xs text-muted">Ziel {goalReached && "✓"}</p>
              <p className={`tabular font-semibold ${goalReached ? "text-lime" : ""}`}>{formatValue(ex, goal)}</p>
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {saved?.isRecord && value != null && (
        <div className="mb-3">
          <ShareRecordButton exerciseId={ex.id} value={value} previous={record} name={userName} isNew />
        </div>
      )}
      {saved ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onRetry} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-card font-medium">
            <RotateCcw size={18} /> Nochmal
          </button>
          <Link href="/" className="flex h-14 items-center justify-center rounded-2xl bg-lime font-semibold text-black">
            Fertig
          </Link>
        </div>
      ) : (
        <>
          <button
            onClick={save}
            disabled={value == null || pending}
            className="h-16 w-full rounded-2xl bg-lime text-lg font-semibold text-black disabled:opacity-50"
          >
            {pending ? "Speichert…" : "Resultat speichern"}
          </button>
          <button onClick={onRetry} className="mt-2 h-11 w-full text-sm text-muted">
            Verwerfen & nochmal
          </button>
        </>
      )}
    </Screen>
  );
}

// ---------- Layout-Hilfen ----------

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      {children}
    </main>
  );
}

function TopBar({ title, closeHref, onClose }: { title: string; closeHref?: string; onClose?: () => void }) {
  const cls = "flex h-11 w-11 items-center justify-center rounded-full bg-card";
  return (
    <div className="mb-4 flex items-center gap-3">
      {closeHref ? (
        <Link href={closeHref} aria-label="Schliessen" className={cls}>
          <X size={20} />
        </Link>
      ) : (
        <button aria-label="Abbrechen" onClick={onClose} className={cls}>
          <X size={20} />
        </button>
      )}
      <p className="font-semibold">{title}</p>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl bg-card p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`tabular text-lg font-semibold ${className}`}>{value}</p>
    </div>
  );
}
