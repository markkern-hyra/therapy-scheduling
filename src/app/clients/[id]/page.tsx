import { AppNav } from "@/app/_components/app-nav";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/require-role";
import { cardFields } from "@/lib/scheduling/clients";
import { MESSAGES } from "@/lib/scheduling/messages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Картка клієнта. Хто що бачить, вирішує RLS: admin і scheduler — усі картки (AC-CARD-10), терапевт — лише своїх
// клієнтів (задача 2). Немає рядка — чужа, прострочена чи неіснуюча картка — лише відмова без даних (AC-CARD-05, 08;
// для неіснуючої — тимчасово, до відповіді на Sofiia-pm/therapy-scheduling-spec#28).
export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { supabase, role } = await requireRole();
  const { id } = await params;
  const { data: client, error } = UUID.test(id)
    ? await supabase
        .from("clients")
        .select("full_name, kind, email, birth_date, language, guardian_name, guardian_email")
        .eq("id", id)
        .maybeSingle()
    : { data: null, error: null };
  if (error) throw new Error(error.message);

  const fields = client && cardFields(client);
  return (
    <>
      <AppNav role={role} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        {client && fields ? (
          <>
            <h1 className="text-2xl font-semibold">{client.full_name}</h1>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Client type</dt>
              <dd>{fields.type}</dd>
              <dt className="text-muted-foreground">Date of birth</dt>
              <dd className="font-mono">{fields.birthDate}</dd>
              <dt className="text-muted-foreground">Session language</dt>
              <dd>{fields.language}</dd>
              {client.kind === "child" ? (
                <>
                  <dt className="text-muted-foreground">Guardian name</dt>
                  <dd>{client.guardian_name}</dd>
                  <dt className="text-muted-foreground">Guardian email</dt>
                  <dd>{client.guardian_email}</dd>
                </>
              ) : (
                <>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{fields.contact}</dd>
                </>
              )}
            </dl>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Client</h1>
            <Alert>{MESSAGES.CLIENT_NO_ACCESS}</Alert>
          </>
        )}
      </main>
    </>
  );
}
