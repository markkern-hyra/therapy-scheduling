"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Пункт навігації з іконкою: поточний розділ (той самий шлях або вкладений) — aria-current="page" і тло primary-soft.
export function NavLink({ href, icon, children }: { href: string; icon: ReactNode; children: string }) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex h-8 items-center gap-2 rounded-sm px-3 text-sm ${current ? "bg-primary-soft font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {icon}
      {children}
    </Link>
  );
}
