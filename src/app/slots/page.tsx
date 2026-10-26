import { AppNav } from "@/app/_components/app-nav";
import { ErrorMessage } from "@/app/_components/error-message";
import { StatusBadge } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { daySlotsView, isHoldable } from "@/lib/scheduling/status";
import {
  formatPracticeDateTime,
  formatPracticeTime,
  isPracticeDay,
  practiceDayRange,
  practiceToday,
} from "@/lib/scheduling/time";
import { holdSlot } from "./actions";

// Слоти терапевта на день зі статусами, клієнтом і «Held until»; «Hold» — лише для вільного слоту
// (AC-HOLD-01–03, 07, 17, 18, 24, 32, 33). Правила утримання тримає база, сторінка лише показує.
export default async function SlotsPage({ searchParams }: PageProps<"/slots">) {
  const { supabase, role } = await requireRole(...STAFF_ROLES);
  const params = await searchParams;
  const now = new Date();
  const day = isPracticeDay(params.day) ? params.day : practiceToday(now);

  const [{ data: therapists, error: therapistsError }, { data: clients, error: clientsError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "therapist").order("full_name"),
    supabase.from("clients").select("id, full_name, email").order("full_name"),
  ]);
  if (therapistsError) throw new Error(therapistsError.message);
  if (clientsError) throw new Error(clientsError.message);
  const therapist = therapists.find((t) => t.id === params.therapist) ?? therapists[0];

  const { start, end } = practiceDayRange(day);
  const { data: slots, error: slotsError } = therapist
    ? await supabase
        .from("slots")
        .select("id, starts_at, ends_at, holds(id, confirmed_at, expires_at, clients(full_name, email))")
        .eq("therapist_id", therapist.id)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at")
    : { data: [], error: null };
  if (slotsError) throw new Error(slotsError.message);
  const view = daySlotsView(slots, now);

  return (
    <>
      <AppNav role={role} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        <h1 className="text-2xl font-semibold">Slots</h1>
        <ErrorMessage code={params.error} />

        <form className="flex flex-wrap items-end gap-4">
          <Label>
            Therapist
            <Select name="therapist" defaultValue={therapist?.id}>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name ?? t.email}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            Day
            <Input name="day" type="date" defaultValue={day} required />
          </Label>
          <Button type="submit" variant="secondary">
            Show
          </Button>
        </form>

        <section className="flex flex-col gap-4">
          <h2 id="day-slots" className="text-lg font-semibold">
            {therapist ? `${therapist.full_name ?? therapist.email} — ${day}` : day}
          </h2>
          {view.message && <p className="text-sm text-muted-foreground">{view.message}</p>}
          {view.slots.length > 0 && (
            <Table aria-labelledby="day-slots">
              <TableHeader>
                <tr>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {view.slots.map((slot) => (
                  <tr key={slot.id}>
                    <TableCell>
                      <span className="font-mono">
                        {formatPracticeTime(new Date(slot.starts_at))}–{formatPracticeTime(new Date(slot.ends_at))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={slot.status} />
                    </TableCell>
                    <TableCell>
                      {slot.hold?.clients && (
                        <span className="flex flex-col">
                          <span>{slot.hold.clients.full_name}</span>
                          {slot.status === "Held" && (
                            <span className="font-mono text-muted-foreground">
                              Held until {formatPracticeDateTime(new Date(slot.hold.expires_at))}
                            </span>
                          )}
                        </span>
                      )}
                      {therapist && isHoldable(slot.status) && clients.length > 0 && (
                        <form action={holdSlot} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="slot_id" value={slot.id} />
                          <input type="hidden" name="therapist" value={therapist.id} />
                          <input type="hidden" name="day" value={day} />
                          <Select
                            name="client_id"
                            aria-label={`Client for ${formatPracticeTime(new Date(slot.starts_at))}`}
                            defaultValue=""
                            required
                          >
                            {/* Без клієнта за замовчуванням: помилковий клік не утримає слот на 24 години. */}
                            <option value="" disabled>
                              Choose a client
                            </option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.full_name} — {c.email}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" variant="secondary">
                            Hold
                          </Button>
                        </form>
                      )}
                    </TableCell>
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
