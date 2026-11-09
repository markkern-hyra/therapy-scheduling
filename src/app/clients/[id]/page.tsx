import { AppNav } from "@/app/_components/app-nav";
import { InsuranceCard } from "@/app/_components/insurance-card";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { isStaff } from "@/lib/auth/roles";
import { cardFields, missingCardText } from "@/lib/scheduling/clients";

const BACK = { href: "/clients", label: "Clients" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Картка клієнта. Хто що бачить, вирішує RLS: admin і scheduler — усі картки (AC-CARD-10), терапевт — лише своїх
// клієнтів. Немає рядка — чужа, прострочена чи неіснуюча картка — лише текст за роллю, без даних (AC-CARD-05, 08, 14, 16).
// Статус страхування — у тому самому запиті (client_insurance 1:1, та сама видимість; рядка немає — «Not set», AC-INS-01).
export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  const { supabase, role, name } = await requireRole();
  const { id } = await params;
  const { notice, error: actionError } = await searchParams;
  const { data: client, error } = UUID.test(id)
    ? await supabase
        .from("clients")
        .select("full_name, kind, email, birth_date, language, guardian_name, guardian_email, client_insurance(status)")
        .eq("id", id)
        .maybeSingle()
    : { data: null, error: null };
  if (error) throw new Error(error.message);

  const fields = client && cardFields(client);
  return (
    <>
      <AppNav role={role} name={name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        {client && fields ? (
          <>
            <PageHeader
              title={client.full_name}
              back={BACK}
              leading={<Avatar name={client.full_name} size="lg" />}
              description={
                <span className="flex flex-wrap gap-2">
                  <Badge variant="neutral">{fields.type}</Badge>
                  {client.language && <Badge variant="neutral">{client.language}</Badge>}
                </span>
              }
            />
            <Card title="Intake">
              <DescriptionList
                items={[
                  { term: "Client type", detail: fields.type },
                  { term: "Date of birth", detail: fields.birthDate, numeric: true, muted: !client.birth_date },
                  { term: "Session language", detail: fields.language, muted: !client.language },
                  ...(client.kind === "child"
                    ? [
                        { term: "Guardian name", detail: client.guardian_name },
                        { term: "Guardian email", detail: client.guardian_email },
                      ]
                    : [{ term: "Email", detail: fields.contact }]),
                ]}
              />
            </Card>
            <InsuranceCard
              clientId={id}
              insurance={client.client_insurance}
              canMark={isStaff(role)}
              notice={notice}
              error={actionError}
            />
          </>
        ) : (
          <>
            <PageHeader title="Client" back={BACK} />
            <Alert>{missingCardText(role)}</Alert>
          </>
        )}
      </main>
    </>
  );
}
