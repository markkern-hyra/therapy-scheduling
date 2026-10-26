import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/ui/nav-link";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

// Посилання за роллю; наступні задачі додають сюди «Holds» і «Schedule».
const STAFF_LINKS = [
  { href: "/slots", label: "Slots" },
  { href: "/clients", label: "Clients" },
];
const LINKS: Record<Role, { href: string; label: string }[]> = {
  admin: STAFF_LINKS,
  scheduler: STAFF_LINKS,
  // Терапевт — лише картки своїх клієнтів (AC-CARD-04); розклад — задача 5.1 impl-slot-hold.
  therapist: [{ href: "/clients", label: "Clients" }],
};

// Шапка: назва, розділи ролі, хто увійшов і «Sign out». На вузькому екрані розділи — другим рядком.
export function AppNav({ role, email }: { role: Role | null; email?: string | null }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="text-base font-semibold whitespace-nowrap">
          Therapy Scheduling
        </Link>
        <nav aria-label="Main" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
          {(role ? LINKS[role] : []).map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {email && role && (
            <span className="hidden text-sm text-muted-foreground md:inline">
              {email} · {ROLE_LABELS[role]}
            </span>
          )}
          <form action={signOut}>
            <Button variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
