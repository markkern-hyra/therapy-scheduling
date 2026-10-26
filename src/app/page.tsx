import type { ReactNode } from "react";
import { AppNav } from "@/app/_components/app-nav";
import { ErrorMessage } from "@/app/_components/error-message";
import { ClientsIcon, SlotsIcon } from "@/components/ui/icons";
import { LinkCard } from "@/components/ui/link-card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import type { Role } from "@/lib/auth/roles";

type Section = { href: string; icon: ReactNode; title: string; description: string };
const STAFF_SECTIONS: Section[] = [
  { href: "/slots", icon: <SlotsIcon />, title: "Slots", description: "See a therapist's day and hold a free slot for a client." },
  { href: "/clients", icon: <ClientsIcon />, title: "Clients", description: "All client cards. Create a card from the intake form." },
];
const SECTIONS: Record<Role, Section[]> = {
  admin: STAFF_SECTIONS,
  scheduler: STAFF_SECTIONS,
  therapist: [
    { href: "/clients", icon: <ClientsIcon />, title: "Clients", description: "Your clients: a hold or a confirmed session with you." },
  ],
};

// Стартова сторінка ролі: куди йти далі; хто увійшов — у шапці (ім'я й роль з profiles).
// Тут же — текст відмови дії, яку роль не може виконати й сторінки якої не відкриває (AC-HOLD-08).
export default async function Home({ searchParams }: PageProps<"/">) {
  const { role, name } = await requireRole();
  const { error } = await searchParams;

  return (
    <>
      <AppNav role={role} name={name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title="Home" description="Choose where to start." />
        <ErrorMessage code={error} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(18rem,100%),1fr))] gap-4">
          {SECTIONS[role].map((section) => (
            <LinkCard key={section.href} {...section} />
          ))}
        </div>
      </main>
    </>
  );
}
