"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteTestResult } from "@/app/actions";

export function DeleteResultButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      aria-label="Resultat löschen"
      disabled={pending}
      onClick={() => {
        if (confirm("Resultat löschen?")) start(() => deleteTestResult(id));
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted active:bg-card-2 disabled:opacity-40"
    >
      <Trash2 size={16} />
    </button>
  );
}
