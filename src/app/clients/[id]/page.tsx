import { AppNav } from "@/app/_components/app-nav";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { cardFields } from "@/lib/scheduling/clients";
import { MESSAGES } from "@/lib/scheduling/messages";

const BACK = { href: "/clients", label: "Clients" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Картка клієнта. Хто що бачить, вирішує RLS: admin і scheduler — усі картки (AC-CARD-10), терапевт — лише своїх
// клієнтів (задача 2). Немає рядка — чужа, прострочена чи неіснуюча картка — лише відмова без даних (AC-CARD-05, 08;
// для неіснуючої — тимчасово, до відповіді на Sofiia-pm/therapy-scheduling-spec#28).
export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { supabase, role, email } = await requireRole();
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
      <AppNav role={role} email={email} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        {client && fields ? (
          <>
            <PageHeader title={client.full_name} description={`${fields.type} client`} back={BACK} />
            <Card title="Intake">
              <DescriptionList
                items={[
                  { term: "Client type", detail: fields.type },
                  { term: "Date of birth", detail: fields.birthDate, mono: true, muted: !client.birth_date },
                  { term: "Session language", detail: fields.language, muted: !client.language },
                ]}
              />
            </Card>
            {client.kind === "child" ? (
              <Card title="Guardian">
                <DescriptionList
                  items={[
                    { term: "Guardian name", detail: client.guardian_name },
                    { term: "Guardian email", detail: client.guardian_email },
                  ]}
                />
              </Card>
            ) : (
              <Card title="Contact">
                <DescriptionList items={[{ term: "Email", detail: fields.contact }]} />
              </Card>
            )}
          </>
        ) : (
          <>
            <PageHeader title="Client" back={BACK} />
            <Alert>{MESSAGES.CLIENT_NO_ACCESS}</Alert>
          </>
        )}
      </main>
    </>
  );
}
