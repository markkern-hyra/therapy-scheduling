// Ролі з profiles.role (міграція roles_and_clients).
export const ROLES = ["admin", "scheduler", "therapist"] as const;
export type Role = (typeof ROLES)[number];

// Назва ролі в інтерфейсі (шапка, головна).
export const ROLE_LABELS: Record<Role, string> = { admin: "Admin", scheduler: "Scheduler", therapist: "Therapist" };

// Хто створює клієнтів, утримує слоти й підтверджує утримання (матриця прав PM).
export const STAFF_ROLES = ["admin", "scheduler"] as const satisfies readonly Role[];

// Чи роль серед STAFF_ROLES (один вираз замість повторюваного includes).
export function isStaff(role: Role | null): boolean {
  return role !== null && (STAFF_ROLES as readonly Role[]).includes(role);
}

// Значення з бази → Role; інше (наприклад, member, поки міграцію не застосовано) — null.
export function toRole(value: unknown): Role | null {
  return ROLES.find((role) => role === value) ?? null;
}
