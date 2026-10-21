"use client";

import {
  Check,
  Download,
  Ellipsis,
  EllipsisVertical,
  Monitor,
  Share,
  Smartphone,
  SquarePlus,
  X,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  detectPlatform,
  getInstallState,
  isIOSNonSafari,
  promptInstall,
  subscribeInstall,
  type InstallState,
  type Platform,
} from "@/lib/install";

/** Registriert den Service Worker – einmal im Root-Layout eingebunden. */
export function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);
  return null;
}

function useInstallState(): InstallState | null {
  // Server kennt den Status nicht → null, damit nichts aufblitzt
  return useSyncExternalStore(subscribeInstall, getInstallState, () => null);
}

const DISMISS_KEY = "gt-install-dismissed";
const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

/**
 * Button "App installieren".
 * - Android/Chrome/Edge: öffnet den nativen Installations-Dialog
 * - iPhone & sonst: öffnet eine Schritt-für-Schritt-Anleitung
 */
export function InstallAppButton({ variant = "row" }: { variant?: "row" | "card" }) {
  const state = useInstallState();
  const dismissed = useSyncExternalStore(
    subscribeStorage,
    () => localStorage.getItem(DISMISS_KEY) === "1",
    () => true,
  );
  const [hidden, setHidden] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  if (state === null) return null;

  const onClick = async () => {
    if (state === "prompt") {
      const accepted = await promptInstall();
      if (accepted) return;
    }
    setGuideOpen(true);
  };

  if (variant === "card") {
    if (state === "installed" || dismissed || hidden) return null;
    return (
      <>
        <div className="relative mb-3 flex items-center gap-4 rounded-3xl border border-lime/30 bg-lime-dim p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime text-black">
            <Smartphone size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">App auf den Homescreen</p>
            <p className="text-sm text-muted">Vollbild, schneller Start, Timer ohne Browserleiste.</p>
          </div>
          <button
            onClick={onClick}
            className="h-10 shrink-0 rounded-xl bg-lime px-4 text-sm font-semibold text-black active:scale-95"
          >
            Installieren
          </button>
          <button
            aria-label="Ausblenden"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setHidden(true);
            }}
            className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-card-2 text-muted"
          >
            <X size={14} />
          </button>
        </div>
        {guideOpen && <InstallGuide onClose={() => setGuideOpen(false)} />}
      </>
    );
  }

  return (
    <>
      {state === "installed" ? (
        <div className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-card-2 text-sm text-muted">
          <Check size={16} className="text-lime" /> App ist installiert
        </div>
      ) : (
        <button
          onClick={onClick}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-lime font-semibold text-black active:scale-[0.98]"
        >
          <Download size={18} /> App installieren
        </button>
      )}
      {guideOpen && <InstallGuide onClose={() => setGuideOpen(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Anleitung
// ---------------------------------------------------------------------------

interface Step {
  icon: React.ReactNode;
  text: React.ReactNode;
}

function stepsFor(platform: Platform, iosNonSafari: boolean): { steps: Step[]; hint?: React.ReactNode } {
  if (platform === "ios") {
    return {
      steps: [
        {
          icon: <Share size={20} />,
          text: iosNonSafari ? (
            <>
              Tippe oben in der Adressleiste auf <b>Teilen</b>
            </>
          ) : (
            <>
              Tippe in Safari auf <b>Teilen</b> (Quadrat mit Pfeil nach oben)
            </>
          ),
        },
        {
          icon: <SquarePlus size={20} />,
          text: (
            <>
              Scrolle nach unten und wähle <b>Zum Home-Bildschirm</b>
            </>
          ),
        },
        {
          icon: <Check size={20} />,
          text: (
            <>
              Oben rechts auf <b>Hinzufügen</b> tippen – fertig!
            </>
          ),
        },
      ],
      hint: (
        <>
          Kein Teilen-Symbol zu sehen? Tippe zuerst auf <Ellipsis size={14} className="inline" /> und dann auf{" "}
          <b>Teilen</b>.
        </>
      ),
    };
  }
  if (platform === "android") {
    return {
      steps: [
        {
          icon: <EllipsisVertical size={20} />,
          text: (
            <>
              Tippe in Chrome oben rechts auf das <b>Menü ⋮</b>
            </>
          ),
        },
        {
          icon: <SquarePlus size={20} />,
          text: (
            <>
              Wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>
            </>
          ),
        },
        {
          icon: <Check size={20} />,
          text: (
            <>
              Mit <b>Installieren</b> bestätigen – die App erscheint bei deinen Apps
            </>
          ),
        },
      ],
      hint: <>Samsung Internet: Menü ≡ → «Seite hinzufügen zu» → «Startbildschirm».</>,
    };
  }
  return {
    steps: [
      {
        icon: <Download size={20} />,
        text: (
          <>
            Klicke rechts in der Adressleiste auf das <b>Installieren-Symbol</b>
          </>
        ),
      },
      {
        icon: <EllipsisVertical size={20} />,
        text: (
          <>
            Oder: Menü ⋮ → <b>Streamen, speichern und teilen</b> → <b>Seite als App installieren</b>
          </>
        ),
      },
      {
        icon: <Smartphone size={20} />,
        text: <>Am besten aber direkt auf dem Handy öffnen und dort installieren.</>,
      },
    ],
    hint: <>Safari auf dem Mac: Ablage → «Zum Dock hinzufügen».</>,
  };
}

const TABS: { id: Platform; label: string; icon: React.ReactNode }[] = [
  { id: "ios", label: "iPhone", icon: <Smartphone size={15} /> },
  { id: "android", label: "Android", icon: <Smartphone size={15} /> },
  { id: "desktop", label: "Computer", icon: <Monitor size={15} /> },
];

const noopSubscribe = () => () => {};

export function InstallGuide({ onClose }: { onClose: () => void }) {
  // Plattform erst im Browser bestimmen (auf dem Server gibt es keinen echten User-Agent)
  const detected = useSyncExternalStore(noopSubscribe, detectPlatform, () => "ios" as Platform);
  const iosNonSafari = useSyncExternalStore(noopSubscribe, isIOSNonSafari, () => false);
  const [chosen, setPlatform] = useState<Platform | null>(null);
  const platform = chosen ?? detected;
  const { steps, hint } = stepsFor(platform, iosNonSafari);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="App installieren">
      <button aria-label="Schliessen" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="pb-safe relative w-full max-w-md rounded-t-3xl bg-card px-5 pt-3 sm:rounded-3xl sm:pb-5">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">App installieren</h2>
            <p className="mt-1 text-sm text-muted">In 3 Schritten auf deinem Homescreen – wie eine normale App.</p>
          </div>
          <button aria-label="Schliessen" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-2">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 rounded-2xl bg-bg p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setPlatform(t.id)}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition ${
                platform === t.id ? "bg-card-2 text-white" : "text-muted"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <ol className="mt-5 space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-4 rounded-2xl bg-card-2 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime text-black">
                {step.icon}
              </span>
              <span className="text-sm leading-snug">
                <span className="mr-1 font-semibold text-lime">{i + 1}.</span>
                {step.text}
              </span>
            </li>
          ))}
        </ol>

        {hint && <p className="mt-4 text-xs leading-relaxed text-muted">{hint}</p>}

        <button onClick={onClose} className="mb-2 mt-5 h-12 w-full rounded-2xl bg-white font-semibold text-black">
          Verstanden
        </button>
      </div>
    </div>
  );
}
