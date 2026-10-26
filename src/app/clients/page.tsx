import Link from "next/link";
import { AppNav } from "@/app/_components/app-nav";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/require-role";
import { canCreateCards, cardFields, emptyClientsText } from "@/lib/scheduling/clients";

// Список карток. Хто що бачить, вирішує RLS: admin і scheduler — усі, у картці дитини — опікуна (AC-CARD-10); терапевт —
// лише свої клієнти (AC-CARD-04, 08) або текст порожнього стану (AC-CARD-09).
export default async function ClientsPage() {
  const { supabase, role, email } = await requireRole();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name, kind, email, birth_date, language, guardian_name, guardian_email")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <>
      <AppNav role={role} email={email} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        <PageHeader
          title="Clients"
          titleId="clients-title"
          description={
            role === "therapist" ? "Clients with a hold or a confirmed session with you." : "All client cards."
          }
          actions={canCreateCards(role) && <ButtonLink href="/clients/new">New client</ButtonLink>}
        />

        <section className="flex flex-col gap-4">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyClientsText(role)}</p>
          ) : (
            <Table aria-labelledby="clients-title">
              <TableHeader>
                <tr>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date of birth</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Contact</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const fields = cardFields(client);
                  return (
                    <tr key={client.id}>
                      <TableCell>
                        <Link href={`/clients/${client.id}`} className="text-primary hover:underline">
                          {client.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{fields.type}</TableCell>
                      <TableCell>
                        <span className={client.birth_date ? "font-mono whitespace-nowrap" : "text-muted-foreground"}>
                          {fields.birthDate}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={client.language ? "" : "text-muted-foreground"}>{fields.language}</span>
                      </TableCell>
                      <TableCell>{fields.contact}</TableCell>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>
      </main>
    </>
  );
}
