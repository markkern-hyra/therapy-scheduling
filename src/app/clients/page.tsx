import { AppNav } from "@/app/_components/app-nav";
import { ErrorMessage } from "@/app/_components/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { createClientCard } from "./actions";

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const { supabase, role } = await requireRole(...STAFF_ROLES);
  const { error } = await searchParams;
  const { data: clients, error: loadError } = await supabase
    .from("clients")
    .select("id, full_name, email")
    .order("created_at", { ascending: false });
  if (loadError) throw new Error(loadError.message);

  return (
    <>
      <AppNav role={role} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <ErrorMessage code={error} />

        <section className="flex max-w-sm flex-col gap-4">
          <h2 className="text-lg font-semibold">New client</h2>
          {/* noValidate: порожнє ім'я й email без @ відхиляє база, і планувальник бачить текст PM, а не підказку браузера;
              required лишається як семантика для екранних читачів. */}
          <form action={createClientCard} noValidate className="flex flex-col gap-4">
            <Label>
              Full name
              <Input name="full_name" autoComplete="off" required />
            </Label>
            <Label>
              Email
              <Input name="email" type="email" autoComplete="off" required />
            </Label>
            <div>
              <Button type="submit">Create client</Button>
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="all-clients" className="text-lg font-semibold">All clients</h2>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            <Table aria-labelledby="all-clients">
              <TableHeader>
                <tr>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <TableCell>{client.full_name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </main>
    </>
  );
}
