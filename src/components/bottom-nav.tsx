"use client";

import { History, Home, Timer, User, Users } from "lucide-react";
import Link from "next/link";
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
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" || pathname.startsWith("/uebung") : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition ${
                  active ? "text-lime" : "text-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
