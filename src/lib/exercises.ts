// Daten und Notentabelle gemäss "Sporttest an der Eignungsprüfung für Grenadiere"
// und "Notentabelle Eignungsprüfung EP_AZ SK" (Stand 26.02.2025).

export type ExerciseId =
  | "liegestuetzen"
  | "klimmzuege"
  | "dorsal"
  | "seitlich"
  | "marsch";

export type TestMode =
  | "countdown-reps" // feste Zeit, Wiederholungen zählen
  | "open-reps" // keine Zeitlimite, Wiederholungen zählen
  | "cadence" // Sekundentakt, so lange wie möglich
  | "stopwatch"; // Zeit stoppen (tiefer = besser)

export type Unit = "reps" | "seconds" | "time";

export interface Exercise {
  id: ExerciseId;
  name: string;
  short: string;
  unit: Unit;
  lowerIsBetter: boolean;
  mode: TestMode;
  /** Zeitlimite in Sekunden (Countdown bzw. Maximum) */
  limit?: number;
  /** Takt in Sekunden pro Bewegungsphase */
  cadence?: number;
  cadenceLabels?: [string, string];
  tenue: string;
  start: string[];
  steps: string[];
  scoring: string;
  timeInfo: string;
  tips: string[];
  /** [Schwelle, Note] – bei höher=besser: Wert >= Schwelle; bei tiefer=besser: Wert <= Schwelle */
  table: [number, number][];
  /** Lesbare Notentabelle wie im Original-PDF */
  tableLabels: [string, number][];
}

export const EXERCISES: Exercise[] = [
  {
    id: "liegestuetzen",
    name: "Liegestützen",
    short: "Liegestütz",
    unit: "reps",
    lowerIsBetter: false,
    mode: "countdown-reps",
    limit: 60,
    tenue: "Turnschuhe, Tarnanzug 90",
    start: [
      "Bauchlage auf dem Boden",
      "Füsse zusammen oder aufeinander",
      "Hände berühren sich auf dem Rücken",
    ],
    steps: [
      "Hände direkt neben die Schultern platzieren",
      "Arme ganz strecken",
      "Eine Hand berührt die andere – Hände bei jeder Wiederholung abwechseln",
      "Hand zurück, Arme bleiben gestreckt",
      "Wieder in die Ausgangslage senken (Hände auf den Rücken)",
      "Oberkörper und Beine bilden jederzeit eine Gerade",
    ],
    scoring: "Anzahl korrekte Wiederholungen",
    timeInfo: "60 Sekunden",
    tips: ["Exakt wie im Test üben – inkl. Hände auf den Rücken. Das kostet Zeit.", "Pyramide: 5-10-15-10-5 Wdh. mit 60 s Pause.", "Tempo-Sätze: 3 × 30 s Vollgas, 90 s Pause.", "Rumpf fest – durchhängende Hüfte zählt nicht."],
    table: [
      [35, 5.0], [34, 4.9], [33, 4.8], [32, 4.7], [31, 4.6], [30, 4.5],
      [29, 4.4], [28, 4.3], [27, 4.2], [26, 4.1], [25, 4.0], [24, 3.9],
      [23, 3.8], [22, 3.7], [21, 3.6],
    ],
    tableLabels: [
      ["35+", 5.0], ["34", 4.9], ["33", 4.8], ["32", 4.7], ["31", 4.6], ["30", 4.5],
      ["29", 4.4], ["28", 4.3], ["27", 4.2], ["26", 4.1], ["25", 4.0], ["24", 3.9],
      ["23", 3.8], ["22", 3.7], ["21", 3.6], ["≤ 20", 1.0],
    ],
  },
  {
    id: "dorsal",
    name: "Dorsale Rumpfkraft",
    short: "Rücken",
    unit: "seconds",
    lowerIsBetter: false,
    mode: "cadence",
    limit: 150,
    cadence: 1,
    cadenceLabels: ["Runter", "Hoch"],
    tenue: "Turnschuhe, Tarnanzug 90",
    start: [
      "Bauchlage quer über einen Schwedenkasten",
      "Füsse in der Sprossenwand eingehängt",
      "Oberkörper horizontal",
      "Arme vor der Brust gekreuzt",
    ],
    steps: [
      "Oberkörper senken, bis die Messmarke berührt wird (ca. 40°)",
      "Oberkörper wieder in die Ausgangslage heben",
      "Messmarken oben und unten im Sekundentakt berühren",
      "1 Sekunde runter, 1 Sekunde hoch",
    ],
    scoring: "Zeitdauer mit korrekten Wiederholungen im korrekten Rhythmus",
    timeInfo: "So lange wie möglich (max. 150 Sekunden)",
    tips: ["Immer im Takt trainieren – der Rhythmus entscheidet.", "Superman am Boden: 3 × 60 s im Sekundentakt.", "Pro Woche ca. +10 s steigern."],
    table: [
      [150, 5.0], [145, 4.9], [140, 4.8], [135, 4.7], [130, 4.6], [125, 4.5],
      [120, 4.4], [115, 4.3], [110, 4.2], [105, 4.1], [100, 4.0], [95, 3.9],
      [90, 3.8], [85, 3.7], [72, 3.6],
    ],
    tableLabels: [
      ["150 s", 5.0], ["145–149", 4.9], ["140–144", 4.8], ["135–139", 4.7],
      ["130–134", 4.6], ["125–129", 4.5], ["120–124", 4.4], ["115–119", 4.3],
      ["110–114", 4.2], ["105–109", 4.1], ["100–104", 4.0], ["95–99", 3.9],
      ["90–94", 3.8], ["85–89", 3.7], ["72–84", 3.6], ["≤ 71", 1.0],
    ],
  },
  {
    id: "klimmzuege",
    name: "Klimmzüge",
    short: "Klimmzug",
    unit: "reps",
    lowerIsBetter: false,
    mode: "open-reps",
    tenue: "Tarnanzug 90, Turnschuhe",
    start: ["Hängend, Arme gestreckt", "Ristgriff (Handrücken zu dir)"],
    steps: [
      "Hochziehen, bis das Kinn auf Höhe der Stange ist",
      "Langsam bis in die Ausgangslage senken",
      "Beine stabil – kein Hochziehen der Knie",
      "Ohne Unterbruch",
    ],
    scoring: "Maximale Anzahl",
    timeInfo: "Keine Zeitlimite",
    tips: ["Oft und frisch: mehrere kurze Sätze pro Tag knapp unter Maximum.", "Negative: 5 × 3 Wdh., 4–5 s langsam absenken.", "Langsam ablassen – im Test Pflicht.", "Kein Schwung, Knie bleiben ruhig."],
    table: [[10, 5.0], [9, 4.7], [8, 4.5], [7, 3.9], [6, 3.6]],
    tableLabels: [["10+", 5.0], ["9", 4.7], ["8", 4.5], ["7", 3.9], ["6", 3.6], ["≤ 5", 1.0]],
  },
  {
    id: "seitlich",
    name: "Seitliche Rumpfkraft",
    short: "Seitlich",
    unit: "seconds",
    lowerIsBetter: false,
    mode: "cadence",
    limit: 120,
    cadence: 1,
    cadenceLabels: ["Hoch", "Runter"],
    tenue: "Turnschuhe, Tarnanzug 90",
    start: [
      "Seitlich liegend mit dem Rücken zur Wand (Seite frei wählbar)",
      "Auf den Ellbogen gestützt, zweite Hand auf der Hüfte",
      "Schulterblätter berühren die Wand",
      "Füsse gegen eine liegende Bank gestützt",
    ],
    steps: [
      "Hüfte heben, bis der Körper durchgestreckt ist (Messmarke berühren)",
      "Hüfte wieder in die Ausgangslage senken",
      "Messmarke im vorgegebenen Sekundentakt berühren",
      "Beide Schulterblätter bleiben an der Wand",
    ],
    scoring: "Zeitdauer mit korrekten Wiederholungen im korrekten Rhythmus",
    timeInfo: "So lange wie möglich (max. 120 Sekunden)",
    tips: ["Beide Seiten trainieren, im Test die stärkere wählen.", "Seitstütz statisch: 3 × 45 s pro Seite.", "Hüft-Dips im Takt mit dem Test-Modus üben."],
    table: [
      [120, 5.0], [115, 4.9], [110, 4.8], [105, 4.7], [100, 4.6], [95, 4.5],
      [90, 4.4], [85, 4.3], [80, 4.2], [75, 4.1], [70, 4.0], [64, 3.9],
      [58, 3.8], [52, 3.7], [46, 3.6],
    ],
    tableLabels: [
      ["120 s", 5.0], ["115–119", 4.9], ["110–114", 4.8], ["105–109", 4.7],
      ["100–104", 4.6], ["95–99", 4.5], ["90–94", 4.4], ["85–89", 4.3],
      ["80–84", 4.2], ["75–79", 4.1], ["70–74", 4.0], ["64–69", 3.9],
      ["58–63", 3.8], ["52–57", 3.7], ["46–51", 3.6], ["≤ 45", 1.0],
    ],
  },
  {
    id: "marsch",
    name: "Marsch 5 km",
    short: "Marsch",
    unit: "time",
    lowerIsBetter: true,
    mode: "stopwatch",
    limit: 40 * 60,
    tenue: "Ordonnanzstiefel, Tarnanzug, Leuchtgamasche, Stirnlampe, Rucksack 20 kg",
    start: ["Start auf Kommando"],
    steps: [
      "Markierte Strecke so schnell wie möglich ablaufen",
      "Hauptsächlich Strassen",
      "5 km mit leichten Höhenunterschieden",
      "Mit 20 kg Rucksack und Kampfstiefeln",
    ],
    scoring: "Gemessene Zeit vom Startkommando bis zum Zieleinlauf",
    timeInfo: "Zeitlimite 40 Minuten",
    tips: ["Rucksack schrittweise steigern: 10 → 15 → 20 kg.", "Mit Ordonnanzstiefeln trainieren – Blasen vorbeugen.", "Pace: 8:00 min/km = 40 Min., 6:30 min/km = Note 4.5.", "Flach und bergab joggen, bergauf zügig gehen."],
    table: [
      [30 * 60, 5.0], [30 * 60 + 30, 4.9], [31 * 60, 4.8], [31 * 60 + 30, 4.7],
      [32 * 60, 4.6], [32 * 60 + 30, 4.5], [33 * 60, 4.4], [33 * 60 + 30, 4.3],
      [34 * 60, 4.2], [35 * 60, 4.1], [36 * 60, 4.0], [37 * 60, 3.9],
      [38 * 60, 3.8], [39 * 60, 3.7], [40 * 60, 3.6],
    ],
    tableLabels: [
      ["≤ 30:00", 5.0], ["30:01–30:30", 4.9], ["30:31–31:00", 4.8],
      ["31:01–31:30", 4.7], ["31:31–32:00", 4.6], ["32:01–32:30", 4.5],
      ["32:31–33:00", 4.4], ["33:01–33:30", 4.3], ["33:31–34:00", 4.2],
      ["34:01–35:00", 4.1], ["35:01–36:00", 4.0], ["36:01–37:00", 3.9],
      ["37:01–38:00", 3.8], ["38:01–39:00", 3.7], ["39:01–40:00", 3.6],
      ["≥ 40:01", 1.0],
    ],
  },
];

export const PASS_GRADE = 3.6;

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function gradeFor(ex: Exercise, value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  for (const [threshold, grade] of ex.table) {
    if (ex.lowerIsBetter ? value <= threshold : value >= threshold) return grade;
  }
  return 1.0;
}

/** Schwächster Wert, der mindestens die gewünschte Note erreicht */
export function valueForGrade(ex: Exercise, grade: number): number {
  let value = ex.table[0][0];
  for (const [threshold, g] of ex.table) {
    if (g >= grade - 1e-9) value = threshold;
  }
  return value;
}

export function formatValue(ex: Exercise, value: number | null | undefined): string {
  if (value == null) return "–";
  if (ex.unit === "reps") return `${value}`;
  if (ex.unit === "seconds") return `${value} s`;
  return formatTime(value);
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function unitLabel(ex: Exercise): string {
  return ex.unit === "reps" ? "Wdh." : ex.unit === "seconds" ? "Sek." : "Min.";
}

export type GradeBand = "sehr gut" | "gut" | "genügend" | "ungenügend";

export function gradeBand(grade: number): GradeBand {
  if (grade >= 4.5) return "sehr gut";
  if (grade >= 4.0) return "gut";
  if (grade >= PASS_GRADE) return "genügend";
  return "ungenügend";
}

export function gradeColor(grade: number | null): string {
  if (grade == null) return "text-zinc-500";
  if (grade >= 4.5) return "text-lime";
  if (grade >= 4.0) return "text-amber-400";
  if (grade >= PASS_GRADE) return "text-zinc-100";
  return "text-red-400";
}

export function averageGrade(grades: (number | null)[]): number | null {
  const valid = grades.filter((g): g is number => g != null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export const GOAL_PRESETS: { label: string; grade: number }[] = [
  { label: "Bestanden", grade: 3.6 },
  { label: "Gut", grade: 4.0 },
  { label: "Sehr gut", grade: 4.5 },
  { label: "Maximum", grade: 5.0 },
];
