"use client";

import { History, Home, Timer, User, Users, type LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Heute", icon: Home },
  { href: "/test", label: "Test", icon: Timer },
  { href: "/verlauf", label: "Verlauf", icon: History },
  { href: "/freunde", label: "Freunde", icon: Users },
  { href: "/profil", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line/60 bg-bg/90 backdrop-blur-xl">
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2 pt-2">
        {ITEMS.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" || pathname.startsWith("/uebung") : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className="block rounded-xl py-1.5">
                <TabContent icon={icon} label={label} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Markiert den getippten Tab sofort – noch bevor die neue Seite geladen ist. */
function TabContent({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  const { pending } = useLinkStatus();
  const on = active || pending;
  return (
    <span
      className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
        on ? "text-lime" : "text-muted"
      }`}
    >
      <Icon size={22} strokeWidth={on ? 2.4 : 1.8} className={pending ? "animate-pulse" : ""} />
      {label}
    </span>
  );
}
