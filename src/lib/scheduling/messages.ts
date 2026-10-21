// Одна мапа «код → текст». Тексти правил — дослівно з AC PM; код передає server action у ?error= (runAction).
export const MESSAGES = {
  CLIENT_INVALID: "Enter the client's name and a valid email.",
  CLIENT_EXISTS: "A client with this email already exists.",
  LOGIN_MISSING: "Enter your email and password.",
  LOGIN_INVALID: "Invalid email or password.",
  UNKNOWN: "Something went wrong. Try again.",
} as const;

export type MessageCode = keyof typeof MESSAGES;

// Помилка Postgres (як її повертає PostgREST) → код повідомлення. Текст Postgres користувачу не показуємо.
export function errorCode(error: { code: string }): MessageCode {
  switch (error.code) {
    case "23505": // unique_violation: єдиний unique, який пише користувач, — clients.email
      return "CLIENT_EXISTS";
    case "23514": // check_violation: єдині check, які пише користувач, — clients.full_name і clients.email
      return "CLIENT_INVALID";
    default:
      return "UNKNOWN";
  }
}

// Текст для коду з адреси (?error=…); невідомий код — нічого не показуємо.
export function messageFor(code: unknown): string | undefined {
  return typeof code === "string" && Object.hasOwn(MESSAGES, code) ? MESSAGES[code as MessageCode] : undefined;
}
