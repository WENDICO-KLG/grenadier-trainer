"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GpsTracker, initialTrack, type GpsPoint, type TrackState } from "@/lib/gps";

const noop = () => () => {};

export function useGpsSupported(): boolean {
  return useSyncExternalStore(noop, () => "geolocation" in navigator, () => false);
}

function gpsErrorText(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return "Standort nicht erlaubt. In den Einstellungen für Safari/Chrome den Standortzugriff erlauben.";
  }
  if (err.code === err.POSITION_UNAVAILABLE) return "Kein GPS-Signal. Geh ins Freie.";
  return "GPS antwortet nicht – Signal wird weiter gesucht…";
}

/**
 * Verfolgt die Position und misst die Distanz.
 * - `watching`: GPS ist an (schon im Countdown, damit beim Start ein Fix da ist)
 * - `isCounting()`: zählt gerade Distanz? Wird bei jeder Position direkt an der Uhr geprüft,
 *   damit das Zählen nicht davon abhängt, wann die Anzeige von "Countdown" auf "Läuft" wechselt
 * Die Distanz kommt aus der reinen Logik in `GpsTracker` (Kalman-Filter, Ausreisser-Filter).
 */
export function useGpsTracking({
  watching,
  isCounting,
  getElapsed,
  onSplit,
  onFinish,
}: {
  watching: boolean;
  isCounting: () => boolean;
  getElapsed: () => number;
  onSplit?: (km: number, splitSeconds: number, totalSeconds: number) => void;
  onFinish?: (seconds: number) => void;
}) {
  const [track, setTrack] = useState<TrackState>(initialTrack);
  const [current, setCurrent] = useState<GpsPoint | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Aktuelle Werte für den GPS-Callback (der nur einmal registriert wird)
  const latest = useRef({ isCounting, getElapsed, onSplit, onFinish });
  useEffect(() => {
    latest.current = { isCounting, getElapsed, onSplit, onFinish };
  });

  useEffect(() => {
    if (!watching || !("geolocation" in navigator)) return;
    const tracker = new GpsTracker();
    let splits = 0;
    let done = false;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy;
        setError(null);
        setCurrent(point);
        const { isCounting: counting, getElapsed: elapsed, onSplit: split, onFinish: fin } = latest.current;

        if (!counting()) {
          // Countdown oder Pause: Position zeigen, aber keine Distanz zählen
          tracker.resetAnchor();
          setTrack((t) => ({ ...t, accuracy, hasFix: accuracy <= 25 || t.hasFix }));
          return;
        }

        const next = tracker.add(point, accuracy, elapsed());
        setTrack(next);
        while (splits < next.splits.length) {
          const total = next.splits[splits];
          const previous = splits > 0 ? next.splits[splits - 1] : 0;
          splits++;
          split?.(splits, total - previous, total);
        }
        if (next.finishedAt != null && !done) {
          done = true;
          fin?.(Math.round(next.finishedAt));
        }
      },
      (err) => setError(gpsErrorText(err)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [watching]);

  return { track, current, error };
}
