// Одна мапа «код → текст». Тексти правил — дослівно з AC PM; код передає server action у ?error= (runAction).
export const MESSAGES = {
  CLIENT_INVALID: "Enter the client's name and a valid email.",
  CLIENT_EXISTS: "A client with this email already exists.",
  SLOT_TAKEN: "This slot is no longer available.",
  SLOT_STARTED: "This slot has already started and cannot be held.",
  HOLD_FORBIDDEN: "Only schedulers and admins can hold slots.",
  CLIENT_BUSY: "This client already has a hold or session at this time.",
  LOGIN_MISSING: "Enter your email and password.",
  LOGIN_INVALID: "Invalid email or password.",
  NO_FREE_SLOTS: "No free slots on this day.",
  UNKNOWN: "Something went wrong. Try again.",
} as const;

export type MessageCode = keyof typeof MESSAGES;

// Коди, які база кидає як raise exception '<КОД>' (тригери правил утримання).
const RAISED = ["SLOT_TAKEN", "SLOT_STARTED", "HOLD_FORBIDDEN", "CLIENT_BUSY"] as const satisfies readonly MessageCode[];

// Порушення обмежень — за назвою обмеження: той самий код Postgres у різних таблиць означає різне.
const CONSTRAINTS: Record<string, MessageCode> = {
  clients_email_key: "CLIENT_EXISTS",
  clients_full_name_check: "CLIENT_INVALID",
  clients_email_check: "CLIENT_INVALID",
};

// Помилка Postgres (як її повертає PostgREST) → код повідомлення. Текст Postgres користувачу не показуємо.
export function errorCode(error: { code: string; message?: string }): MessageCode {
  const message = error.message ?? "";
  if (error.code === "P0001") return RAISED.find((code) => code === message) ?? "UNKNOWN";
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
