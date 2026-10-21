// Ролі з profiles.role (міграція roles_and_clients).
export const ROLES = ["admin", "scheduler", "therapist"] as const;
export type Role = (typeof ROLES)[number];

// Хто створює клієнтів, утримує слоти й підтверджує утримання (матриця прав PM).
export const STAFF_ROLES = ["admin", "scheduler"] as const satisfies readonly Role[];

// Значення з бази → Role; інше (наприклад, member, поки міграцію не застосовано) — null.
export function toRole(value: unknown): Role | null {
  return ROLES.find((role) => role === value) ?? null;
}
