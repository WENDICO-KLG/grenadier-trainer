"use client";

import { Check, Download, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getExercise, gradeFor, type ExerciseId } from "@/lib/exercises";
import { recordShareText, renderRecordCard } from "@/lib/share-card";

interface Props {
  exerciseId: ExerciseId;
  value: number;
  previous?: number | null;
  name?: string | null;
  isNew?: boolean;
  variant?: "primary" | "icon";
}

/** Button, der eine Vorschau der Rekord-Karte öffnet und sie teilen/speichern lässt. */
export function ShareRecordButton({ exerciseId, value, previous, name, isNew = false, variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-lime"
        >
          <Share2 size={13} /> Rekord teilen
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-lime font-semibold text-black active:scale-[0.98]"
        >
          <Share2 size={18} /> Rekord teilen
        </button>
      )}
      {open && (
        <ShareSheet
          exerciseId={exerciseId}
          value={value}
          previous={previous}
          name={name}
          isNew={isNew}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ShareSheet({
  exerciseId,
  value,
  previous,
  name,
  isNew,
  onClose,
}: Required<Pick<Props, "exerciseId" | "value" | "isNew">> & Pick<Props, "previous" | "name"> & { onClose: () => void }) {
  const exercise = getExercise(exerciseId)!;
  const grade = gradeFor(exercise, value)!;
  const input = useMemo(
    () => ({ exercise, value, grade, previous, name, isNew }),
    [exercise, value, grade, previous, name, isNew],
  );
  const text = recordShareText(input);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "shared" | "saved" | "copied">("idle");
  const [error, setError] = useState<string | null>(null);

  // Bild vorab erzeugen: Safari erlaubt navigator.share nur direkt nach dem Tippen
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    renderRecordCard(input)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
        setFile(new File([blob], `rekord-${exercise.id}.png`, { type: "image/png" }));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Bild konnte nicht erstellt werden"));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [input, exercise.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canShareFile = file != null && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  const share = async () => {
    setError(null);
    try {
      if (canShareFile) {
        await navigator.share({ files: [file!], text });
      } else if (typeof navigator.share === "function") {
        await navigator.share({ text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(text);
        setStatus("copied");
        return;
      }
      setStatus("shared");
    } catch (e) {
      // Abbrechen im Teilen-Dialog ist kein Fehler
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Teilen hat nicht geklappt – speichere das Bild und teile es manuell.");
    }
  };

  const save = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = `rekord-${exercise.id}.png`;
    a.click();
    setStatus("saved");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Rekord teilen">
      <button aria-label="Schliessen" onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="pb-safe relative w-full max-w-md rounded-t-3xl bg-card px-5 pt-4 sm:rounded-3xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rekord teilen</h2>
          <button aria-label="Schliessen" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-card-2">
            <X size={18} />
          </button>
        </div>

        <div className="mx-auto aspect-[4/5] w-full max-w-[min(100%,46dvh)] overflow-hidden rounded-2xl bg-bg">
          {preview ? (
            // Lokal erzeugtes Bild (blob:)
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`Rekord ${exercise.name}`} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">{error ?? "Bild wird erstellt…"}</div>
          )}
        </div>

        {error && preview && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}

        <div className="mb-2 mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button
            onClick={share}
            disabled={!file}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-lime font-semibold text-black disabled:opacity-50"
          >
            {status === "shared" || status === "copied" ? <Check size={18} /> : <Share2 size={18} />}
            {status === "copied" ? "Text kopiert" : status === "shared" ? "Geteilt" : "Teilen"}
          </button>
          <button
            onClick={save}
            disabled={!preview}
            aria-label="Bild speichern"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card-2 disabled:opacity-50"
          >
            {status === "saved" ? <Check size={18} className="text-lime" /> : <Download size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
