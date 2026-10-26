import { AppNav } from "@/app/_components/app-nav";
import { ErrorMessage } from "@/app/_components/error-message";
import { StatusBadge } from "@/app/_components/status-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NextIcon, PreviousIcon, TimeIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { List, ListItem } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { contactEmail } from "@/lib/scheduling/clients";
import { slotsHref } from "@/lib/scheduling/links";
import { daySlotsView, isHoldable } from "@/lib/scheduling/status";
import {
  formatDayStep,
  formatPracticeDateTime,
  formatPracticeTime,
  isPracticeDay,
  practiceDayRange,
  practiceToday,
  shiftPracticeDay,
} from "@/lib/scheduling/time";
import { holdSlot } from "./actions";

// Слоти терапевта на день зі статусами, клієнтом і «Held until»; «Hold» — лише для вільного слоту
// (AC-HOLD-01–03, 07, 17, 18, 24, 32, 33). Правила утримання тримає база, сторінка лише показує.
export default async function SlotsPage({ searchParams }: PageProps<"/slots">) {
  const { supabase, role, name } = await requireRole(...STAFF_ROLES);
  const params = await searchParams;
  const now = new Date();
  const day = isPracticeDay(params.day) ? params.day : practiceToday(now);

  const [{ data: therapists, error: therapistsError }, { data: clients, error: clientsError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "therapist").order("full_name"),
    supabase.from("clients").select("id, full_name, kind, email, guardian_email").order("full_name"),
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

  // Кроки днями — звичайні посилання на ту саму сторінку з ?day= (і обраним терапевтом).
  const dayHref = (d: string) => slotsHref(therapist?.id, d);
  const previous = shiftPracticeDay(day, -1);
  const next = shiftPracticeDay(day, 1);

  return (
    <>
      <AppNav role={role} name={name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title="Slots" description="A therapist's day: free, held and confirmed slots." />
        <ErrorMessage code={params.error} />

        <Card>
          <form className="grid items-end gap-4 sm:grid-cols-[minmax(0,20rem)_minmax(0,14rem)_auto] sm:justify-start">
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
        </Card>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="day-slots" className="text-lg font-semibold tabular-nums">
              {therapist ? `${therapist.full_name ?? therapist.email} — ${day}` : day}
            </h2>
            <nav aria-label="Days" className="flex items-center gap-1">
              <ButtonLink href={dayHref(previous)} variant="ghost" size="sm" aria-label={`Previous day, ${formatDayStep(previous)}`}>
                <PreviousIcon />
                {formatDayStep(previous)}
              </ButtonLink>
              <ButtonLink href={dayHref(next)} variant="ghost" size="sm" aria-label={`Next day, ${formatDayStep(next)}`}>
                {formatDayStep(next)}
                <NextIcon />
              </ButtonLink>
            </nav>
          </div>
          {view.message && <p className="text-sm text-muted-foreground">{view.message}</p>}
          {view.slots.length > 0 && (
            <List aria-labelledby="day-slots">
              {view.slots.map((slot) => (
                <ListItem key={slot.id}>
                  <span className="flex w-20 shrink-0 flex-col tabular-nums">
                    <span className="text-lg font-semibold">{formatPracticeTime(new Date(slot.starts_at))}</span>
                    <span className="text-xs text-muted-foreground">–{formatPracticeTime(new Date(slot.ends_at))}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {slot.hold?.clients ? (
                      <span className="font-medium">{slot.hold.clients.full_name}</span>
                    ) : (
                      slot.status === "free" && <span className="text-muted-foreground">Free</span>
                    )}
                    {slot.status === "Held" && slot.hold && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <TimeIcon />
                        <span>
                          Held until{" "}
                          <span className="whitespace-nowrap">{formatPracticeDateTime(new Date(slot.hold.expires_at))}</span>
                        </span>
                      </span>
                    )}
                  </span>
                  {slot.status !== "free" && <StatusBadge status={slot.status} />}
                  {therapist && isHoldable(slot.status) && clients.length > 0 && (
                    <form action={holdSlot} className="flex w-full items-center gap-2 sm:w-auto">
                      <input type="hidden" name="slot_id" value={slot.id} />
                      <input type="hidden" name="therapist" value={therapist.id} />
                      <input type="hidden" name="day" value={day} />
                      <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                        <Select
                          size="sm"
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
                              {c.full_name} — {contactEmail(c)}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button type="submit" variant="secondary" size="sm">
                        Hold
                      </Button>
                    </form>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </section>
      </main>
    </>
  );
}
