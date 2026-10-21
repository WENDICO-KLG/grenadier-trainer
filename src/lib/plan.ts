// Trainingsphasen abhängig von der verbleibenden Zeit bis zur Aushebung.

export interface Phase {
  key: string;
  name: string;
  summary: string;
  week: string[];
  testEvery: string;
}

export function daysUntil(dateIso: string | null, today = new Date()): number | null {
  if (!dateIso) return null;
  const target = new Date(`${dateIso}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function phaseFor(days: number | null): Phase | null {
  if (days == null) return null;
  if (days < 0) {
    return {
      key: "done",
      name: "Aushebung vorbei",
      summary: "Trag dein Resultat ein und setz dir ein neues Datum, falls du wiederholst.",
      week: [],
      testEvery: "–",
    };
  }
  if (days <= 6) {
    return {
      key: "taper",
      name: "Erholung",
      summary: "Jetzt nichts mehr erzwingen. Frisch und ausgeruht an den Start.",
      week: [
        "2 kurze, lockere Einheiten (Technik, je 50 % Volumen)",
        "Letzte 2 Tage: nur Mobilität und Spazieren",
        "Material bereitlegen: Stiefel, Rucksack, Stirnlampe",
        "Viel schlafen, gut essen und trinken",
      ],
      testEvery: "Kein Test mehr",
    };
  }
  if (days <= 21) {
    return {
      key: "peak",
      name: "Feinschliff",
      summary: "Intensität halten, Umfang reduzieren. Prüfungsablauf simulieren.",
      week: [
        "2× Kraft: alle 4 Kraftdisziplinen testnah",
        "1× Marsch 5 km mit 20 kg in Wettkampftempo",
        "1× lockerer Lauf 30 Min.",
        "Mindestens 2 Ruhetage",
      ],
      testEvery: "1× kompletter Test, spätestens 10 Tage vorher",
    };
  }
  if (days <= 56) {
    return {
      key: "specific",
      name: "Spezifisch",
      summary: "Training so nah wie möglich an der Prüfung – Takt, Tenü, Gewicht.",
      week: [
        "3× Kraft: Liegestützen, Klimmzüge, Rumpf im Prüfungstakt",
        "1× Marsch 5–8 km mit 15–20 kg",
        "1× Intervall-Lauf (z. B. 6 × 800 m)",
        "Schwächste Disziplin 2× extra",
      ],
      testEvery: "Alle 2 Wochen ein kompletter Test",
    };
  }
  if (days <= 112) {
    return {
      key: "build",
      name: "Aufbau",
      summary: "Volumen steigern und Kraftausdauer gezielt aufbauen.",
      week: [
        "3× Kraft: Pyramiden, Negative, Rumpf-Sätze",
        "1× Marsch mit Rucksack (10 → 20 kg steigern)",
        "1–2× Laufen 30–45 Min.",
        "Rumpf 3× pro Woche je 10 Min.",
      ],
      testEvery: "Alle 3–4 Wochen ein Test",
    };
  }
  return {
    key: "base",
    name: "Grundlage",
    summary: "Breite Basis aufbauen: Ausdauer, Grundkraft, saubere Technik.",
    week: [
      "2–3× Ganzkörperkraft",
      "2× Laufen locker 30–40 Min.",
      "1× zügig wandern mit leichtem Rucksack",
      "Technik aller 5 Disziplinen lernen",
    ],
    testEvery: "Einstiegstest, danach monatlich",
  };
}

export function formatDateCH(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
