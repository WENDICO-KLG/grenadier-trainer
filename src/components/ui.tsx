import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { gradeBand, gradeColor, type Exercise } from "@/lib/exercises";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-card p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between px-1">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function GradeBadge({ grade, size = "sm" }: { grade: number | null; size?: "sm" | "lg" }) {
  if (grade == null) {
    return <span className="text-sm text-muted">–</span>;
  }
  const big = size === "lg";
  return (
    <span className={`tabular font-semibold ${gradeColor(grade)} ${big ? "text-5xl" : "text-base"}`}>
      {grade.toFixed(1)}
    </span>
  );
}

export function BandLabel({ grade }: { grade: number | null }) {
  if (grade == null) return null;
  return <span className={`text-sm ${gradeColor(grade)}`}>{gradeBand(grade)}</span>;
}

export function ExerciseImage({
  exercise,
  className = "",
  sizes = "96px",
  eager = false,
}: {
  exercise: Exercise;
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#0b0d0a] ${className}`}>
      <Image
        src={`/exercises/${exercise.id}.png`}
        alt={exercise.name}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        className="object-cover"
      />
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-card-2">
      <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex h-14 items-center justify-center gap-2 rounded-2xl bg-lime text-base font-semibold text-black active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}
