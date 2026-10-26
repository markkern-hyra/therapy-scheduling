import Link from "next/link";
import { AppNav } from "@/app/_components/app-nav";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AddIcon, ClientIcon } from "@/components/ui/icons";
import { List, ListItem } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { canCreateCards, cardFields, emptyClientsText } from "@/lib/scheduling/clients";

// Список карток. Хто що бачить, вирішує RLS: admin і scheduler — усі, у картці дитини — опікуна (AC-CARD-10); терапевт —
// лише свої клієнти (AC-CARD-04, 08) або текст порожнього стану (AC-CARD-09).
export default async function ClientsPage() {
  const { supabase, role, name } = await requireRole();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name, kind, email, birth_date, language, guardian_name, guardian_email")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const newClient = canCreateCards(role) && (
    <ButtonLink href="/clients/new">
      <AddIcon />
      New client
    </ButtonLink>
  );

  return (
    <>
      <AppNav role={role} name={name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader
          title="Clients"
          titleId="clients-title"
          description={
            role === "therapist" ? "Clients with a hold or a confirmed session with you." : "All client cards."
          }
          actions={newClient}
        />

        {clients.length === 0 ? (
          <EmptyState icon={<ClientIcon />}>{emptyClientsText(role)}</EmptyState>
        ) : (
          <List aria-labelledby="clients-title">
            {clients.map((client) => {
              const fields = cardFields(client);
              return (
                <ListItem key={client.id}>
                  <Avatar name={client.full_name} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/clients/${client.id}`} className="font-semibold text-primary hover:underline">
                      {client.full_name}
                    </Link>
                    <span className="text-sm break-words text-muted-foreground">{fields.contact}</span>
                  </span>
                  <dl className="grid w-full grid-cols-3 gap-4 text-sm sm:w-96">
                    <div className="flex flex-col">
                      <dt className="text-xs text-muted-foreground">Type</dt>
                      <dd>{fields.type}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs text-muted-foreground">Date of birth</dt>
                      <dd className={client.birth_date ? "tabular-nums" : "text-muted-foreground"}>{fields.birthDate}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs text-muted-foreground">Language</dt>
                      <dd className={client.language ? "" : "text-muted-foreground"}>{fields.language}</dd>
                    </div>
                  </dl>
                </ListItem>
              );
            })}
          </List>
        )}
      </main>
    </>
  );
}
