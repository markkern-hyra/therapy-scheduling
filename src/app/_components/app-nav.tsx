import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { Avatar } from "@/components/ui/avatar";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { ClientsIcon, SignOutIcon, SlotsIcon } from "@/components/ui/icons";
import { NavLink } from "@/components/ui/nav-link";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { PRODUCT } from "@/lib/product";

// Посилання за роллю; наступні задачі додають сюди «Holds» і «Schedule».
type Section = { href: string; label: string; icon: ReactNode };
const SLOTS: Section = { href: "/slots", label: "Slots", icon: <SlotsIcon /> };
const CLIENTS: Section = { href: "/clients", label: "Clients", icon: <ClientsIcon /> };
const LINKS: Record<Role, Section[]> = {
  admin: [SLOTS, CLIENTS],
  scheduler: [SLOTS, CLIENTS],
  // Терапевт — лише картки своїх клієнтів (AC-CARD-04); розклад — задача 5.1 impl-slot-hold.
  therapist: [CLIENTS],
};

// Шапка: знак і назва, розділи ролі, хто увійшов і «Sign out». На вузькому екрані розділи — другим рядком.
export function AppNav({ role, name }: { role: Role | null; name?: string | null }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold whitespace-nowrap">
          <BrandMark />
          {PRODUCT.name}
        </Link>
        <nav aria-label="Main" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
          {(role ? LINKS[role] : []).map((link) => (
            <NavLink key={link.href} href={link.href} icon={link.icon}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {name && role && (
            <span className="flex items-center gap-2">
              <span className="hidden sm:flex">
                <Avatar name={name} />
              </span>
              {/* Хто увійшов — текстом завжди: на вузькому екрані лише для зчитувача екрана. */}
              <span className="sr-only flex-col text-sm md:not-sr-only md:flex">
                <span data-testid="user-name" className="font-medium">
                  {name}
                </span>
                <span data-testid="user-role" className="text-xs text-muted-foreground">
                  {ROLE_LABELS[role]}
                </span>
              </span>
            </span>
          )}
          <form action={signOut}>
            <Button variant="ghost" size="sm">
              <SignOutIcon />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
