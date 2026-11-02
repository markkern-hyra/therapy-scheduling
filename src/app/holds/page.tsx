import { AppNav } from "@/app/_components/app-nav";
import { ErrorMessage } from "@/app/_components/error-message";
import { StaffPageRefusal } from "@/app/_components/staff-page-refusal";
import { StatusBadge } from "@/app/_components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { HoldsIcon, TimeIcon } from "@/components/ui/icons";
import { List, ListItem } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { formatPracticeDateTime } from "@/lib/scheduling/time";
import { schedulerHolds, staffPageRefusal } from "@/lib/scheduling/visibility";

// Список утримань планувальника й адміністратора: клієнт, терапевт, слот, статус і «Held until»
// (AC-HOLD-05, 06, 20, 28, 29, 37, 38, 42, 43); терапевту — лише відмова (AC-HOLD-44).
export default async function HoldsPage({ searchParams }: PageProps<"/holds">) {
  const { supabase, role, name } = await requireRole();
  const refusal = staffPageRefusal(role);
  if (refusal) return <StaffPageRefusal title="Holds" role={role} name={name} message={refusal} />;

  const params = await searchParams;
  const now = new Date();
  const { data, error } = await supabase
    .from("holds")
    .select(
      "id, client_id, slot_id, created_at, confirmed_at, expires_at, clients(full_name), slots!inner(starts_at, profiles(full_name, email))",
    )
    .is("confirmed_at", null)
    .gt("slots.starts_at", now.toISOString());
  if (error) throw new Error(error.message);
  const holds = schedulerHolds(data, now);

  return (
    <>
      <AppNav role={role} name={name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title="Holds" titleId="holds-title" description="Held and expired holds by slot time, nearest first." />
        <ErrorMessage code={params.error} />
        {holds.length === 0 ? (
          <EmptyState icon={<HoldsIcon />}>No holds.</EmptyState>
        ) : (
          <List aria-labelledby="holds-title">
            {holds.map((hold) => (
              <ListItem key={hold.id}>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-medium">{hold.clients.full_name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {/* Політика profiles показує планувальнику лише роль therapist; колишній терапевт — без імені. */}
                    {hold.slots.profiles?.full_name ?? hold.slots.profiles?.email ?? "—"} ·{" "}
                    {formatPracticeDateTime(new Date(hold.slots.starts_at))}
                  </span>
                  {hold.status === "Held" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                      <TimeIcon />
                      <span>
                        Held until{" "}
                        <span className="whitespace-nowrap">{formatPracticeDateTime(new Date(hold.expires_at))}</span>
                      </span>
                    </span>
                  )}
                </span>
                <StatusBadge status={hold.status} />
              </ListItem>
            ))}
          </List>
        )}
      </main>
    </>
  );
}
