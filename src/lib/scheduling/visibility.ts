import { isStaff, type Role } from "@/lib/auth/roles";
import { MESSAGES } from "./messages";
import { holdStatus, slotStatus } from "./status";
import { practiceToday } from "./time";

type HoldRow = {
  client_id: string;
  slot_id: string;
  created_at: string;
  confirmed_at: string | null;
  expires_at: string;
  slots: { starts_at: string };
};

// Список утримань планувальника: лише «Held» і «Expired», слот яких ще не почався, за часом слоту від найближчого
// (AC-HOLD-29, 38, 42). Прострочений запис зникає, коли той самий слот знову утримали за тим самим клієнтом (AC-HOLD-37),
// а за іншим — лишається до початку слоту (AC-HOLD-43).
export function schedulerHolds<H extends HoldRow>(holds: H[], now: Date) {
  const heldAgain = (hold: H) =>
    holds.some(
      (other) =>
        other.slot_id === hold.slot_id &&
        other.client_id === hold.client_id &&
        Date.parse(other.created_at) > Date.parse(hold.created_at),
    );
  return holds
    .map((hold) => ({ ...hold, status: holdStatus(hold, now) }))
    .filter((hold) => hold.status !== "Confirmed" && new Date(hold.slots.starts_at) > now && !heldAgain(hold))
    // Той самий слот (AC-HOLD-43): новіше утримання вище, щоб порядок не мінявся між завантаженнями.
    .sort(
      (a, b) =>
        Date.parse(a.slots.starts_at) - Date.parse(b.slots.starts_at) ||
        Date.parse(b.created_at) - Date.parse(a.created_at),
    );
}

// Сторінки слотів і утримань лише для планувальника й адміністратора; терапевт за прямим посиланням бачить текст PM
// замість перенаправлення на головну (AC-HOLD-44).
export function staffPageRefusal(role: Role): string | null {
  return isStaff(role) ? null : MESSAGES.VIEW_FORBIDDEN;
}

type ScheduleRow = { starts_at: string; confirmed_at: string | null; expires_at: string | null };

// Тиждень терапевта за днями зі статусами слотів; функція бази вже віддала лише власні слоти без прострочених утримань.
// Той самий slotStatus, що й у планувальника: «Past», «Held» до прострочення, «Confirmed», вільний (AC-HOLD-09, 21, 30).
export function therapistWeek<R extends ScheduleRow>(rows: R[], now: Date) {
  const days = new Map<string, (R & { status: ReturnType<typeof slotStatus> })[]>();
  for (const row of [...rows].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))) {
    const holds = row.expires_at ? [{ confirmed_at: row.confirmed_at, expires_at: row.expires_at }] : [];
    const day = practiceToday(new Date(row.starts_at));
    days.set(day, [...(days.get(day) ?? []), { ...row, status: slotStatus({ starts_at: row.starts_at, holds }, now) }]);
  }
  return [...days].map(([day, slots]) => ({ day, slots }));
}
