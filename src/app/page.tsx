import { AppNav } from "@/app/_components/app-nav";
import { ErrorMessage } from "@/app/_components/error-message";
import { Card } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { LinkCard } from "@/components/ui/link-card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

const STAFF_SECTIONS = [
  { href: "/slots", title: "Slots", description: "See a therapist's day and hold a free slot for a client." },
  { href: "/clients", title: "Clients", description: "All client cards. Create a card from the intake form." },
];
const SECTIONS: Record<Role, { href: string; title: string; description: string }[]> = {
  admin: STAFF_SECTIONS,
  scheduler: STAFF_SECTIONS,
  therapist: [
    { href: "/clients", title: "Clients", description: "Your clients: a hold or a confirmed session with you." },
  ],
};

// Стартова сторінка ролі: куди йти далі, і хто увійшов (роль — з profiles).
// Тут же — текст відмови дії, яку роль не може виконати й сторінки якої не відкриває (AC-HOLD-08).
export default async function Home({ searchParams }: PageProps<"/">) {
  const { role, email } = await requireRole();
  const { error } = await searchParams;

  return (
    <>
      <AppNav role={role} email={email} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        <PageHeader title="Home" description="Where to start today." />
        <ErrorMessage code={error} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-4">
          {SECTIONS[role].map((section) => (
            <LinkCard key={section.href} {...section} />
          ))}
        </div>
        <Card title="Your account">
          <DescriptionList
            items={[
              { term: "Email", detail: <span data-testid="user-email">{email ?? "—"}</span> },
              { term: "Role", detail: <span data-testid="user-role">{ROLE_LABELS[role]}</span> },
            ]}
          />
        </Card>
      </main>
    </>
  );
}
