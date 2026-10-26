import Link from "next/link";
import { AppNav } from "@/app/_components/app-nav";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { cardFields } from "@/lib/scheduling/clients";
import { MESSAGES } from "@/lib/scheduling/messages";

// Список карток (AC-CARD-10): admin і scheduler бачать усі, у картці дитини — опікуна. Терапевту список відкриває
// задача 2 impl-client-cards (лише свої клієнти).
export default async function ClientsPage() {
  const { supabase, role } = await requireRole(...STAFF_ROLES);
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name, kind, email, birth_date, language, guardian_name, guardian_email")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <>
      <AppNav role={role} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Clients</h1>
          <Link href="/clients/new" className="text-sm font-medium text-primary hover:underline">
            New client
          </Link>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="all-clients" className="text-lg font-semibold">
            All clients
          </h2>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{MESSAGES.NO_CLIENTS}</p>
          ) : (
            <Table aria-labelledby="all-clients">
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
                        <span className="font-mono">{fields.birthDate}</span>
                      </TableCell>
                      <TableCell>{fields.language}</TableCell>
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
