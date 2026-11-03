import { AppNav } from "@/app/_components/app-nav";
import { StatusBadge } from "@/app/_components/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NextIcon, PreviousIcon, ScheduleIcon, TimeIcon } from "@/components/ui/icons";
import { List, ListItem } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { scheduleHref } from "@/lib/scheduling/links";
import {
  formatPracticeDateTime,
  formatPracticeTime,
  isPracticeDay,
  practiceToday,
  practiceWeek,
  shiftPracticeDay,
} from "@/lib/scheduling/time";
import { therapistWeek } from "@/lib/scheduling/visibility";

// Власний тиждень терапевта пн–нд зі статусами слотів і ім'ям клієнта, без email; перемикання тижнів
// (AC-HOLD-09, 21, 30, 31, 40). Що показати, вирішує функція бази therapist_schedule.
export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  const { supabase, role, name } = await requireRole("therapist");
  const params = await searchParams;
  const now = new Date();
  const week = practiceWeek(isPracticeDay(params.week) ? params.week : practiceToday(now));

  const { data, error } = await supabase.rpc("therapist_schedule", {
    p_from: week.start.toISOString(),
    p_to: week.end.toISOString(),
  });
  if (error) throw new Error(error.message);
  const days = therapistWeek(data, now);

  return (
    <>
      <AppNav role={role} name={name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader
          title="Schedule"
          description={<span className="tabular-nums">{`${week.monday} – ${week.sunday}`}</span>}
          actions={
            <nav aria-label="Weeks" className="flex items-center gap-1">
              <ButtonLink href={scheduleHref(shiftPracticeDay(week.monday, -7))} variant="ghost" size="sm">
                <PreviousIcon />
                Previous week
              </ButtonLink>
              <ButtonLink href={scheduleHref(shiftPracticeDay(week.monday, 7))} variant="ghost" size="sm">
                Next week
                <NextIcon />
              </ButtonLink>
            </nav>
          }
        />
        {days.length === 0 && <EmptyState icon={<ScheduleIcon />}>No slots this week.</EmptyState>}
        {days.map(({ day, slots }) => (
          <section key={day} className="flex flex-col gap-4">
            <h2 id={`day-${day}`} className="text-lg font-semibold tabular-nums">
              {day}
            </h2>
            <List aria-labelledby={`day-${day}`}>
              {slots.map((slot) => (
                <ListItem key={slot.slot_id}>
                  <span className="flex w-20 shrink-0 flex-col tabular-nums">
                    <span className="text-lg font-semibold">{formatPracticeTime(new Date(slot.starts_at))}</span>
                    <span className="text-xs text-muted-foreground">–{formatPracticeTime(new Date(slot.ends_at))}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {slot.client_name ? (
                      <span className="font-medium">{slot.client_name}</span>
                    ) : (
                      slot.status === "free" && <span className="text-muted-foreground">Free</span>
                    )}
                    {slot.status === "Held" && slot.expires_at && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <TimeIcon />
                        <span>
                          Held until{" "}
                          <span className="whitespace-nowrap">{formatPracticeDateTime(new Date(slot.expires_at))}</span>
                        </span>
                      </span>
                    )}
                  </span>
                  {slot.status !== "free" && <StatusBadge status={slot.status} />}
                </ListItem>
              ))}
            </List>
          </section>
        ))}
      </main>
    </>
  );
}
