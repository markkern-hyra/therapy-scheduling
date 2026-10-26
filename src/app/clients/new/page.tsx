import { AppNav } from "@/app/_components/app-nav";
import { ClientCardForm } from "@/app/_components/client-card-form";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { canCreateCards } from "@/lib/scheduling/clients";
import { MESSAGES } from "@/lib/scheduling/messages";
import { practiceToday } from "@/lib/scheduling/time";

// Форма нової картки з анкети (AC-CARD-01–03). Терапевт за прямим посиланням бачить лише відмову, без форми
// (AC-CARD-06; варіант A питання Sofiia-pm/therapy-scheduling-spec#24) — дія createClientCard відмовляє й без сторінки.
export default async function NewClientPage() {
  const { role, email } = await requireRole();

  return (
    <>
      <AppNav role={role} email={email} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        <PageHeader
          title="New client"
          description="A client card from the intake form."
          back={{ href: "/clients", label: "Clients" }}
        />
        {canCreateCards(role) ? (
          <ClientCardForm today={practiceToday(new Date())} />
        ) : (
          <Alert>{MESSAGES.CARD_FORBIDDEN}</Alert>
        )}
      </main>
    </>
  );
}
