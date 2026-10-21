"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { removeAvatar, uploadAvatar } from "@/app/actions";
import { Avatar } from "@/components/avatar";

/** Bild im Browser quadratisch zuschneiden und auf 512 px verkleinern (JPEG). */
async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const target = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild konnte nicht verarbeitet werden"))), "image/jpeg", 0.85),
  );
}

export function AvatarUpload({ url, name }: { url: string | null; name: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const blob = await prepareImage(file);
        setPreview(URL.createObjectURL(blob));
        const data = new FormData();
        data.append("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        const res = await uploadAvatar(data);
        if ("error" in res && res.error) {
          setError(res.error);
          setPreview(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
        setPreview(null);
      }
    });
  };

  const shown = preview ?? url;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        aria-label="Profilbild ändern"
      >
        {preview ? (
          // Lokale Vorschau (blob:) während des Uploads
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vorschau" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <Avatar url={shown} name={name} size={80} />
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-4 border-card bg-lime text-black">
          <Camera size={14} />
        </span>
        {pending && <span className="absolute inset-0 animate-pulse rounded-full bg-black/50" />}
      </button>
      <div className="min-w-0 flex-1 text-sm">
        <button type="button" onClick={() => input.current?.click()} className="font-medium text-lime">
          {shown ? "Bild ändern" : "Profilbild hochladen"}
        </button>
        {shown && !pending && (
          <button
            type="button"
            onClick={() =>
              start(async () => {
                await removeAvatar();
                setPreview(null);
              })
            }
            className="mt-1 flex items-center gap-1 text-muted"
          >
            <Trash2 size={13} /> Entfernen
          </button>
        )}
        {pending && <p className="mt-1 text-muted">Wird hochgeladen…</p>}
        {error && <p className="mt-1 text-red-400">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
