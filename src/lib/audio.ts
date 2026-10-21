// Kleine Web-Audio-Hilfen für Countdown-Pieps und den Sekundentakt.
// Töne werden im Voraus auf der Audio-Uhr geplant – so bleibt der Takt exakt,
// auch wenn der Browser die Anzeige drosselt.

let ctx: AudioContext | null = null;

export function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export const TONE = {
  tick: 660,
  go: 1320,
  up: 1046,
  down: 523,
  end: 880,
  tap: 1500,
};

/** Plant einen Ton relativ zu `startAt` (Audio-Zeit in Sekunden). */
export function scheduleBeep(
  at: number,
  freq: number,
  duration = 0.12,
  volume = 0.35,
): OscillatorNode | null {
  const audio = getAudio();
  if (!audio) return null;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
  return osc;
}

export function beep(freq: number, duration = 0.12, volume = 0.35) {
  const audio = getAudio();
  if (!audio) return;
  scheduleBeep(audio.currentTime + 0.005, freq, duration, volume);
}

export function cancelBeeps(nodes: (OscillatorNode | null)[]) {
  for (const n of nodes) {
    try {
      n?.stop();
    } catch {
      // bereits beendet
    }
  }
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}
