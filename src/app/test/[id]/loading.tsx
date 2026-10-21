export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md animate-pulse flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-card" />
        <div className="h-4 w-32 rounded-full bg-card" />
      </div>
      <div className="mx-auto aspect-square w-full max-w-[min(15rem,32dvh)] rounded-3xl bg-card" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full rounded-full bg-card" />
        <div className="h-4 w-5/6 rounded-full bg-card" />
      </div>
      <div className="mt-auto mb-8 h-16 rounded-2xl bg-card" />
    </main>
  );
}
