import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-32 pt-[max(env(safe-area-inset-top),1.5rem)]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
