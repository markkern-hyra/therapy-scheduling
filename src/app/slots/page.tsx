import { AppNav } from "@/app/_components/app-nav";
import { StatusBadge } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { daySlotsView } from "@/lib/scheduling/status";
import { formatPracticeDateTime, practiceDayRange, practiceToday } from "@/lib/scheduling/time";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Слоти терапевта на день зі статусами (AC-HOLD-24; «Held», «Confirmed» і «Hold» — задача 3.1).
export default async function SlotsPage({ searchParams }: PageProps<"/slots">) {
  const { supabase, role } = await requireRole(...STAFF_ROLES);
  const params = await searchParams;
  const now = new Date();
  const day = typeof params.day === "string" && DAY.test(params.day) ? params.day : practiceToday(now);

  const { data: therapists, error: therapistsError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "therapist")
    .order("full_name");
  if (therapistsError) throw new Error(therapistsError.message);
  const therapistId = therapists.find((t) => t.id === params.therapist)?.id ?? therapists[0]?.id;

  const { start, end } = practiceDayRange(day);
  const { data: slots, error: slotsError } = therapistId
    ? await supabase
        .from("slots")
        .select("id, starts_at, ends_at")
        .eq("therapist_id", therapistId)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
    : { data: [], error: null };
  if (slotsError) throw new Error(slotsError.message);
  const view = daySlotsView(slots, now);

  return (
    <>
      <AppNav role={role} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        <h1 className="text-2xl font-semibold">Slots</h1>

        <form className="flex flex-wrap items-end gap-4">
          <Label>
            Therapist
            <Select name="therapist" defaultValue={therapistId}>
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
            {day}
          </h2>
          {view.message && <p className="text-sm text-muted-foreground">{view.message}</p>}
          {view.slots.length > 0 && (
            <Table aria-labelledby="day-slots">
              <TableHeader>
                <tr>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {view.slots.map((slot) => (
                  <tr key={slot.id}>
                    <TableCell>
                      <span className="font-mono">
                        {formatPracticeDateTime(new Date(slot.starts_at)).slice(11)}–
                        {formatPracticeDateTime(new Date(slot.ends_at)).slice(11)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={slot.status} />
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
