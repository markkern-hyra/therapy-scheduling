// Одна мапа «код → текст». Тексти правил — дослівно з AC PM; код передає server action у ?error= чи ?notice= (runAction).
export const MESSAGES = {
  CLIENT_INVALID: "Enter the client's name and a valid email.",
  CLIENT_EXISTS: "A client with this email already exists.",
  GUARDIAN_INVALID: "Enter the guardian's name and a valid email.",
  CLIENT_TYPE_MISSING: "Select a client type.",
  NAME_MISSING: "Enter the client's name.",
  BIRTH_DATE_INVALID: "Enter a date of birth that is not in the future.",
  LANGUAGE_MISSING: "Select a session language.",
  CHILD_EXISTS: "A client with these details already exists.",
  VIEW_FORBIDDEN: "Only schedulers and admins can view this page.",
  CARD_FORBIDDEN: "Only schedulers and admins can create client cards.",
  CLIENT_NO_ACCESS: "You don't have access to this client.",
  NO_ROLE: "Your account has no access yet. Contact an administrator.",
  NO_OWN_CLIENTS: "No clients yet. Clients appear here when a scheduler holds a slot with you.",
  NO_CLIENTS: "No clients yet. Create a client card from an intake form.",
  CARD_NOT_FOUND: "This client card doesn't exist.",
  SLOT_TAKEN: "This slot is no longer available.",
  SLOT_STARTED: "This slot has already started and cannot be held.",
  HOLD_FORBIDDEN: "Only schedulers and admins can hold slots.",
  CLIENT_BUSY: "This client already has a hold or session at this time.",
  HOLD_EXPIRED: "This hold has expired. Hold the slot again.",
  CONFIRM_FORBIDDEN: "Only schedulers and admins can confirm holds.",
  CONFIRM_STARTED: "This slot has already started and cannot be confirmed.",
  ALREADY_CONFIRMED: "This hold is already confirmed.",
  LOGIN_MISSING: "Enter your email and password.",
  LOGIN_INVALID: "Invalid email or password.",
  NO_FREE_SLOTS: "No free slots on this day.",
  INSURANCE_SAVED: "Insurance status saved.",
  UNKNOWN: "Something went wrong. Try again.",
} as const;

export type MessageCode = keyof typeof MESSAGES;

// Коди, які база кидає як raise exception '<КОД>' (тригери правил утримання).
const RAISED = [
  "SLOT_TAKEN",
  "SLOT_STARTED",
  "HOLD_FORBIDDEN",
  "CLIENT_BUSY",
  "HOLD_EXPIRED",
  "CONFIRM_FORBIDDEN",
  "CONFIRM_STARTED",
  "ALREADY_CONFIRMED",
] as const satisfies readonly MessageCode[];

// Порушення обмежень — за назвою обмеження: той самий код Postgres у різних таблиць означає різне.
const CONSTRAINTS: Record<string, MessageCode> = {
  clients_email_key: "CLIENT_EXISTS",
  clients_full_name_check: "CLIENT_INVALID",
  clients_email_check: "CLIENT_INVALID",
  clients_contact_check: "CLIENT_INVALID",
  clients_guardian_check: "GUARDIAN_INVALID",
  // Форма ловить це раніше (validateCard); сюди доходить лише прямий запит, якого користувач форми не побачить.
  clients_intake_check: "BIRTH_DATE_INVALID",
  clients_child_dedup_key: "CHILD_EXISTS",
};

// Помилка Postgres (як її повертає PostgREST) → код повідомлення. Текст Postgres користувачу не показуємо.
export function errorCode(error: { code: string; message?: string }): MessageCode {
  const message = error.message ?? "";
  if (error.code === "P0001") return RAISED.find((code) => code === message) ?? "UNKNOWN";
  // RLS відмовила в записі картки: роль без права створювати картки (AC-CARD-06).
  if (error.code === "42501" && message.includes('table "clients"')) return "CARD_FORBIDDEN";
  if (error.code === "23505" || error.code === "23514") {
    const name = /constraint "([^"]+)"/.exec(message)?.[1];
    return (name && CONSTRAINTS[name]) || "UNKNOWN";
  }
  return "UNKNOWN";
}

// Текст для коду з адреси (?error=…); невідомий код — нічого не показуємо.
export function messageFor(code: unknown): string | undefined {
  return typeof code === "string" && Object.hasOwn(MESSAGES, code) ? MESSAGES[code as MessageCode] : undefined;
}
