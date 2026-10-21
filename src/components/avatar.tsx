import Image from "next/image";

export function Avatar({
  url,
  name,
  size = 48,
  className = "",
}: {
  url: string | null | undefined;
  name: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-card-2 ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={url} alt={name ?? "Profilbild"} fill sizes={`${size * 2}px`} className="object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-semibold text-lime"
          style={{ fontSize: size * 0.38 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
