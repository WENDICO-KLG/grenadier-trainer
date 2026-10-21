"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/exercises";

const HOLD_MS = 1500;

/**
 * Taschen-Modus: schwarzer Bildschirm (OLED-Pixel aus → kaum Akkuverbrauch),
 * alle Berührungen gesperrt, Entsperren nur durch 1.5 s Halten.
 * Bildschirm und GPS laufen im Hintergrund weiter (Wake Lock bleibt aktiv).
 */
export function PocketMode({
  distanceKm,
  elapsed,
  gpsWeak,
  onUnlock,
}: {
  distanceKm: number;
  elapsed: number;
  gpsWeak: boolean;
  onUnlock: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scrollen, Zoomen und Kontextmenü komplett unterbinden, solange gesperrt
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    document.addEventListener("gesturestart", block);
    document.addEventListener("contextmenu", block);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("touchmove", block);
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("contextmenu", block);
      document.body.style.overflow = prev;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const startHold = () => {
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      onUnlock();
    }, HOLD_MS);
  };
  const cancelHold = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Inhalt jede Minute leicht verschieben (gegen Einbrennen auf OLED-Displays)
  const step = Math.floor(elapsed / 60) % 4;
  const shift = [
    [0, 0],
    [10, -14],
    [-10, 10],
    [6, 18],
  ][step];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Taschen-Modus – zum Entsperren gedrückt halten"
      className="fixed inset-0 z-[1000] select-none bg-black"
      style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        startHold();
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
    >
      <div
        className="flex h-full flex-col items-center justify-center text-center transition-transform duration-1000"
        style={{ transform: `translate(${shift[0]}px, ${shift[1]}px)` }}
      >
        <p className="tabular text-7xl font-bold leading-none text-[#3d4136]">
          {distanceKm.toFixed(2)}
          <span className="ml-1 text-2xl">km</span>
        </p>
        <p className="tabular mt-4 text-4xl font-semibold text-[#2c2f2a]">{formatTime(elapsed)}</p>
        {gpsWeak && <p className="mt-4 text-sm text-[#5a2a24]">GPS-Signal schwach</p>}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(env(safe-area-inset-bottom),2rem)] flex flex-col items-center gap-3">
        <div className="relative h-14 w-14">
          <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
            <circle cx="28" cy="28" r="25" fill="none" stroke="#1a1c18" strokeWidth="3" />
            <circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke="#c8f04a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={157}
              strokeDashoffset={holding ? 0 : 157}
              style={{ transition: holding ? `stroke-dashoffset ${HOLD_MS}ms linear` : "none", opacity: holding ? 1 : 0 }}
            />
          </svg>
          <Lock size={20} className={`absolute inset-0 m-auto ${holding ? "text-lime" : "text-[#33362f]"}`} />
        </div>
        <p className={`text-xs ${holding ? "text-lime" : "text-[#33362f]"}`}>
          {holding ? "Weiter halten…" : "Zum Entsperren gedrückt halten"}
        </p>
      </div>
    </div>
  );
}
