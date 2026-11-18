import { AppNav } from "@/app/_components/app-nav";
import { NewClientForm } from "@/app/_components/new-client-form";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { canCreateCards } from "@/lib/scheduling/clients";
import { MESSAGES } from "@/lib/scheduling/messages";
import { practiceToday } from "@/lib/scheduling/time";

// Форма нової картки з анкети (AC-CARD-01–03) і чернетка з тексту звернення над нею (AC-INTAKE-01…08). Терапевт за
// прямим посиланням бачить лише відмову, без форми й поля звернення (AC-CARD-06, AC-INTAKE-09; варіант A питання
// Sofiia-pm/therapy-scheduling-spec#24) — дії createClientCard і requestIntakeDraft відмовляють і без сторінки.
// Дія чернетки чекає на модель до 25 с і повторює щонайбільше раз (design.md, «AI»): межа функції Vercel — з запасом, щоб
// повільна модель дала «The assistant is unavailable…» (AC-INTAKE-08), а не сторінку помилки платформи.
export const maxDuration = 60;

export default async function NewClientPage() {
  const { role, name } = await requireRole();

  return (
    <>
      <AppNav role={role} name={name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader
          title="New client"
          description="A client card from the intake form."
          back={{ href: "/clients", label: "Clients" }}
        />
        {canCreateCards(role) ? (
          <NewClientForm today={practiceToday(new Date())} />
        ) : (
          <Alert>{MESSAGES.CARD_FORBIDDEN}</Alert>
        )}
      </main>
    </>
  );
}
