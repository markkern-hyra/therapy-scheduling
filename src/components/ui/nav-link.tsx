"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Пункт навігації: поточний розділ (той самий шлях або вкладений) — aria-current="page" і тло muted.
export function NavLink({ href, children }: { href: string; children: string }) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-sm px-2 py-1 text-sm ${current ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </Link>
  );
}
