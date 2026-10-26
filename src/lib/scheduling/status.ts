import { MESSAGES } from "./messages";

// Статуси для показу (правила запису — у базі). Задача 2.1: вільний або «Past»; «Held» і «Confirmed» додає задача 3.1.
export type SlotStatus = "free" | "Past";

// Слот, що вже почався (з моменту початку включно), — «Past»: не вільний і не утримується (Припущення PM, AC-HOLD-32).
export function slotStatus(slot: { starts_at: string }, now: Date): SlotStatus {
  return new Date(slot.starts_at) <= now ? "Past" : "free";
}

// Слоти дня за часом зі статусами; без жодного вільного — повідомлення PM над ними (AC-HOLD-18, 24, 33).
export function daySlotsView<S extends { starts_at: string }>(slots: S[], now: Date) {
  const withStatus = [...slots]
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map((slot) => ({ ...slot, status: slotStatus(slot, now) }));
  const message = withStatus.some((slot) => slot.status === "free") ? null : MESSAGES.NO_FREE_SLOTS;
  return { message, slots: withStatus };
}
