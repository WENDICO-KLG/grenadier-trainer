// Sprachansagen über die Web Speech API (funktioniert auch bei schwarzem Bildschirm,
// solange die App im Vordergrund ist). iOS verlangt, dass die erste Ansage durch
// ein Tippen ausgelöst wird – deshalb `primeSpeech()` beim Aktivieren aufrufen.

let voice: SpeechSynthesisVoice | null | undefined;

function germanVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null; // Liste lädt noch – später erneut versuchen
  voice =
    voices.find((v) => v.lang === "de-CH") ??
    voices.find((v) => v.lang === "de-DE" && v.localService) ??
    voices.find((v) => v.lang.startsWith("de")) ??
    null;
  return voice;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string) {
  if (!speechSupported()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  const v = germanVoice();
  if (v) u.voice = v;
  u.rate = 1;
  u.volume = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** Muss direkt in einem Tipp-Handler aufgerufen werden (iOS-Freigabe). */
export function primeSpeech(text = "Taschen-Modus aktiv") {
  speak(text);
}

/** 754 Sekunden → "12 Minuten 34" */
export function spokenTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r} Sekunden`;
  return r === 0 ? `${m} Minuten` : `${m} Minuten ${r}`;
}

/** Lautlose Freigabe für iOS – im Start-Tipp aufrufen, damit spätere Ansagen erlaubt sind. */
export function unlockSpeech() {
  if (!speechSupported()) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}
