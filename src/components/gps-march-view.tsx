"use client";

import { Moon, Pause, Play, Satellite } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { PocketMode } from "@/components/pocket-mode";
import { primeSpeech } from "@/lib/speech";
import { formatTime, getExercise, gradeColor, gradeFor } from "@/lib/exercises";
import { TARGET_DISTANCE, type GpsPoint, type TrackState } from "@/lib/gps";

// Leaflet nur im Browser laden
const RouteMap = dynamic(() => import("@/components/route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="rounded-3xl bg-card" />,
});

/** Laufansicht für den 5-km-Marsch mit GPS: Karte, automatische Distanz, Splits, Prognose. */
export function GpsMarchView({
  elapsed,
  paused,
  track,
  current,
  error,
  goal,
  sound,
  onPause,
  onFinish,
}: {
  elapsed: number;
  paused: boolean;
  track: TrackState;
  current: GpsPoint | null;
  error: string | null;
  goal: number | null;
  sound: boolean;
  onPause: () => void;
  onFinish: () => void;
}) {
  const ex = getExercise("marsch")!;
  const [pocket, setPocket] = useState(false);
  const km = track.distance / 1000;
  const remaining = TARGET_DISTANCE - track.distance;
  const avgPace = track.distance >= 100 ? (elapsed / track.distance) * 1000 : null;
  // Hochrechnung der Endzeit erst nach 300 m einigermassen aussagekräftig
  const projected = track.distance >= 300 ? (elapsed / track.distance) * TARGET_DISTANCE : null;
  const projectedGrade = projected != null ? gradeFor(ex, projected) : null;
  const goalPace = goal ? goal / 5 : null;
  const lastSplit = track.splits.at(-1) ?? 0;

  const signal =
    track.accuracy == null ? "suche" : track.accuracy <= 10 ? "gut" : track.accuracy <= 25 ? "ok" : "schwach";

  return (
    <>
      <RouteMap route={track.route} current={current} accuracy={track.accuracy} className="min-h-[30dvh] flex-1" />

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted">{paused ? "Pausiert" : "Distanz"}</p>
          <p className={`tabular text-5xl font-bold leading-none ${paused ? "text-muted" : "text-lime"}`}>
            {km.toFixed(2)}
            <span className="ml-1 text-xl text-muted">km</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Zeit</p>
          <p className="tabular text-5xl font-bold leading-none">{formatTime(elapsed)}</p>
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-card-2">
        <div className="h-full bg-lime transition-[width]" style={{ width: `${(track.distance / TARGET_DISTANCE) * 100}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Pace jetzt" value={track.recentPace ? `${formatTime(track.recentPace)}` : "–"} />
        <Stat label="Ø Pace" value={avgPace ? formatTime(avgPace) : "–"} />
        <Stat
          label="Prognose"
          value={projected ? formatTime(projected) : "–"}
          sub={projectedGrade != null ? `Note ${projectedGrade.toFixed(1)}` : goalPace ? `Ziel ${formatTime(goalPace)}/km` : undefined}
          subClass={gradeColor(projectedGrade)}
        />
      </div>

      <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Satellite size={13} className={signal === "gut" ? "text-lime" : signal === "ok" ? "text-amber-400" : "text-red-400"} />
          GPS {signal}
          {track.accuracy != null && ` · ±${Math.round(track.accuracy)} m`}
        </span>
        <span>
          {track.splits.length > 0 && `km ${track.splits.length}: ${formatTime(lastSplit - (track.splits.at(-2) ?? 0))} · `}
          noch {(Math.max(0, remaining) / 1000).toFixed(2)} km
        </span>
      </div>
      {error && <p className="mt-1 px-1 text-xs text-red-400">{error}</p>}

      <div className="mt-3 grid grid-cols-[1fr_1fr_2fr] gap-3">
        <button
          onClick={onPause}
          className="flex h-16 items-center justify-center rounded-2xl bg-card"
          aria-label={paused ? "Weiter" : "Pause"}
        >
          {paused ? <Play size={22} /> : <Pause size={22} />}
        </button>
        <button
          onClick={() => {
            if (sound) primeSpeech("Taschen-Modus aktiv. Zum Entsperren gedrückt halten.");
            setPocket(true);
          }}
          className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl bg-card text-[11px] font-medium"
          aria-label="Taschen-Modus"
        >
          <Moon size={20} className="text-lime" />
          Tasche
        </button>
        <button
          onClick={() => {
            if (remaining > 50 && !confirm(`Erst ${km.toFixed(2)} km gemessen. Trotzdem beenden?`)) return;
            onFinish();
          }}
          className="h-16 rounded-2xl bg-lime font-semibold text-black"
        >
          Ziel
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">
        Nicht sperren – für die Tasche den Taschen-Modus nutzen. Stoppt automatisch bei 5.00 km.
      </p>

      {pocket && (
        <PocketMode
          distanceKm={km}
          elapsed={elapsed}
          gpsWeak={error != null || track.accuracy == null || track.accuracy > 25}
          onUnlock={() => setPocket(false)}
        />
      )}
    </>
  );
}

function Stat({ label, value, sub, subClass = "" }: { label: string; value: string; sub?: string; subClass?: string }) {
  return (
    <div className="rounded-2xl bg-card px-2 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="tabular text-lg font-semibold leading-tight">{value}</p>
      {sub && <p className={`text-[11px] ${subClass}`}>{sub}</p>}
    </div>
  );
}
