// Sofort angezeigt beim Seitenwechsel (wird vorab geladen), bis die Daten da sind.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Lädt">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded-full bg-card" />
          <div className="h-8 w-48 rounded-full bg-card" />
        </div>
        <div className="h-12 w-12 rounded-full bg-card" />
      </div>
      <div className="h-36 rounded-3xl bg-card" />
      <div className="mb-3 mt-8 h-3 w-24 rounded-full bg-card" />
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-3xl bg-card p-3">
            <div className="h-16 w-16 rounded-2xl bg-card-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-full bg-card-2" />
              <div className="h-3 w-1/3 rounded-full bg-card-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
