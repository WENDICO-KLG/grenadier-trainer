// Erzeugt ein teilbares Bild (1080×1350, Hochformat für Instagram/WhatsApp) für einen Rekord.

import { formatTime, gradeBand, type Exercise } from "@/lib/exercises";

const W = 1080;
const H = 1350;
const BG = "#0b0d0a";
const CARD = "#15171a";
const LIME = "#c8f04a";
const MUTED = "#8b9198";

export interface RecordCardInput {
  exercise: Exercise;
  value: number;
  grade: number;
  previous?: number | null;
  name?: string | null;
  isNew: boolean;
}

export function recordValueText(ex: Exercise, value: number): { main: string; unit: string } {
  if (ex.unit === "reps") return { main: String(value), unit: "Wdh." };
  if (ex.unit === "seconds") return { main: String(value), unit: "Sek." };
  return { main: formatTime(value), unit: "Min." };
}

export function recordShareText({ exercise, value, grade, isNew }: RecordCardInput): string {
  const { main, unit } = recordValueText(exercise, value);
  const head = isNew ? "Neuer Rekord 💪" : "Mein Rekord 💪";
  return `${head} ${exercise.name}: ${main} ${unit} (Note ${grade.toFixed(1)}) – Grenadier Trainer`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function renderRecordCard(input: RecordCardInput): Promise<Blob> {
  const { exercise, value, grade, previous, name, isNew } = input;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const f = (weight: number, size: number) => `${weight} ${size}px ${font}`;

  const [logo, illustration] = await Promise.all([
    loadImage("/logo.png"),
    loadImage(`/exercises/${exercise.id}.png`),
  ]);

  // Hintergrund
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Kopfzeile: Logo + App-Name
  const pad = 72;
  if (logo) {
    ctx.save();
    roundRect(ctx, pad, 64, 88, 88, 22);
    ctx.clip();
    ctx.drawImage(logo, pad, 64, 88, 88);
    ctx.restore();
  }
  ctx.fillStyle = "#f2f4f1";
  ctx.font = f(700, 38);
  ctx.textBaseline = "middle";
  ctx.fillText("Grenadier Trainer", pad + 112, 108);

  // Datum rechts
  ctx.fillStyle = MUTED;
  ctx.font = f(500, 30);
  ctx.textAlign = "right";
  ctx.fillText(
    new Date().toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" }),
    W - pad,
    108,
  );
  ctx.textAlign = "left";

  // Übungsbild in Karte
  const imgSize = 600;
  const imgX = (W - imgSize) / 2;
  const imgY = 200;
  ctx.fillStyle = CARD;
  roundRect(ctx, imgX, imgY, imgSize, imgSize, 48);
  ctx.fill();
  if (illustration) {
    ctx.save();
    roundRect(ctx, imgX, imgY, imgSize, imgSize, 48);
    ctx.clip();
    ctx.drawImage(illustration, imgX, imgY, imgSize, imgSize);
    ctx.restore();
  }

  // Badge "NEUER REKORD"
  const badge = isNew ? "NEUER REKORD" : "MEIN REKORD";
  ctx.font = f(800, 32);
  const bw = ctx.measureText(badge).width + 64;
  const by = imgY + imgSize - 28;
  ctx.fillStyle = LIME;
  roundRect(ctx, (W - bw) / 2, by, bw, 64, 32);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillText(badge, W / 2, by + 33);

  // Übungsname
  ctx.fillStyle = "#f2f4f1";
  ctx.font = f(700, 54);
  ctx.fillText(exercise.name, W / 2, 925);

  // Grosser Wert
  const { main, unit } = recordValueText(exercise, value);
  ctx.font = f(800, 190);
  const mainW = ctx.measureText(main).width;
  ctx.font = f(600, 56);
  const unitW = ctx.measureText(unit).width;
  const total = mainW + 20 + unitW;
  const startX = (W - total) / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = LIME;
  ctx.font = f(800, 190);
  ctx.fillText(main, startX, 1150);
  ctx.fillStyle = MUTED;
  ctx.font = f(600, 56);
  ctx.fillText(unit, startX + mainW + 20, 1150);

  // Note + vorher
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = f(600, 38);
  ctx.fillStyle = "#f2f4f1";
  let line = `Note ${grade.toFixed(1)} · ${gradeBand(grade)}`;
  if (previous != null && previous !== value) {
    line += `  ·  vorher ${recordValueText(exercise, previous).main}`;
  }
  ctx.fillText(line, W / 2, 1225);

  // Fusszeile
  if (name) {
    ctx.fillStyle = MUTED;
    ctx.font = f(500, 30);
    ctx.fillText(name, W / 2, 1290);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild konnte nicht erstellt werden"))), "image/png"),
  );
}
