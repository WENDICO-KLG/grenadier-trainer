// Installations-Status der Web-App (PWA).
// Chrome/Android liefert ein "beforeinstallprompt"-Event, das wir abfangen, um es
// später per Button auszulösen. iOS kennt das nicht – dort zeigen wir eine Anleitung.

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type Platform = "ios" | "android" | "desktop";

let deferred: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // eigenes UI statt Browser-Infobar
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    justInstalled = true;
    deferred = null;
    emit();
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    mq.removeEventListener("change", listener);
  };
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** "installed" | "prompt" (natives Installieren möglich) | "manual" (Anleitung nötig) */
export type InstallState = "installed" | "prompt" | "manual";

export function getInstallState(): InstallState {
  if (justInstalled || isStandalone()) return "installed";
  return deferred ? "prompt" : "manual";
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS meldet sich als Mac – an Touch erkennbar
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function isIOSNonSafari(): boolean {
  return /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}
