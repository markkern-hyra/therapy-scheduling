import { MESSAGES } from "./messages";

// Статуси для показу; правила запису — у базі (тригер check_new_hold). Формула «активного» утримання та сама, що
// private.is_active_hold: підтверджене або ще не прострочене (design.md, рішення 2).
type Hold = { confirmed_at: string | null; expires_at: string };

export type HoldStatus = "Held" | "Confirmed" | "Expired";
export type SlotStatus = "free" | "Held" | "Confirmed" | "Past";

export function holdStatus(hold: Hold, now: Date): HoldStatus {
  if (hold.confirmed_at) return "Confirmed";
  return now < new Date(hold.expires_at) ? "Held" : "Expired";
}

// Активне утримання слоту — не більше одного (тригер); прострочені лишаються в історії й статусу не дають.
function activeHold<H extends Hold>(holds: H[] | undefined, now: Date): H | null {
  return holds?.find((hold) => holdStatus(hold, now) !== "Expired") ?? null;
}

// «Held» / «Confirmed» — за активним утриманням; інакше слот, що вже почався (з моменту початку включно), — «Past»,
// а ще не початий — вільний (AC-HOLD-01, 32).
export function slotStatus(slot: { starts_at: string; holds?: Hold[] }, now: Date): SlotStatus {
  const hold = activeHold(slot.holds, now);
  if (hold) return holdStatus(hold, now) as "Held" | "Confirmed";
  return new Date(slot.starts_at) <= now ? "Past" : "free";
}

export const isHoldable = (status: SlotStatus) => status === "free";

// Слоти дня за часом зі статусами й активним утриманням; без жодного вільного — повідомлення PM над ними
// (AC-HOLD-18, 24, 33).
export function daySlotsView<S extends { starts_at: string; holds?: Hold[] }>(slots: S[], now: Date) {
  type SlotHold = NonNullable<S["holds"]>[number];
  const withStatus = [...slots]
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map((slot) => ({ ...slot, status: slotStatus(slot, now), hold: activeHold<SlotHold>(slot.holds, now) }));
  const message = withStatus.some((slot) => isHoldable(slot.status)) ? null : MESSAGES.NO_FREE_SLOTS;
  return { message, slots: withStatus };
}
