import { AppNav } from "@/app/_components/app-nav";
import { ErrorMessage } from "@/app/_components/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          {/* noValidate: порожнє ім'я й email без @ відхиляє база, і планувальник бачить текст PM, а не підказку браузера. */}
          <form action={createClientCard} noValidate className="flex flex-col gap-4">
            <Label>
              Full name
              <Input name="full_name" autoComplete="off" />
            </Label>
            <Label>
              Email
              <Input name="email" type="email" autoComplete="off" />
            </Label>
            <div>
              <Button type="submit">Create client</Button>
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">All clients</h2>
          {clients.length === 0 ? (
            <p className="text-sm text-ink-muted">No clients yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs font-medium text-ink-muted">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-t border-line">
                      <td className="px-3 py-2">{client.full_name}</td>
                      <td className="px-3 py-2">{client.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
