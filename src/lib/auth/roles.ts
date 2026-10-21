// Ролі з profiles.role (міграція roles_and_clients).
export type Role = "admin" | "scheduler" | "therapist";

// Хто створює клієнтів, утримує слоти й підтверджує утримання (матриця прав PM).
export const STAFF_ROLES = ["admin", "scheduler"] as const satisfies readonly Role[];
