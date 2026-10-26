import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth/roles";

// Посилання за роллю; наступні задачі зрізу додають сюди «Holds» і «Schedule».
const STAFF_LINKS = [
  { href: "/slots", label: "Slots" },
  { href: "/clients", label: "Clients" },
];
const LINKS: Record<Role, { href: string; label: string }[]> = {
  admin: STAFF_LINKS,
  scheduler: STAFF_LINKS,
  therapist: [],
};

export function AppNav({ role }: { role: Role | null }) {
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex w-full max-w-3xl items-center gap-6 px-6 py-3 text-sm">
        <Link href="/" className="text-lg font-semibold">
          Therapy Scheduling
        </Link>
        {(role ? LINKS[role] : []).map((link) => (
          <Link key={link.href} href={link.href} className="text-primary hover:underline">
            {link.label}
          </Link>
        ))}
        <form action={signOut} className="ml-auto">
          <Button variant="secondary">Sign out</Button>
        </form>
      </nav>
    </header>
  );
}
