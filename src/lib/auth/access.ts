import type { Role } from "./roles";

export type Access = "login" | "no-access" | "forbidden" | "ok";

// Рішення requireRole: без входу — сторінка входу (AC-CARD-07); увійшов без ролі — лише повідомлення, що доступу ще
// немає (AC-CARD-11); роль не з `allowed` — головна; порожній `allowed` — будь-яка роль.
export function accessFor(signedIn: boolean, role: Role | null, allowed: readonly Role[]): Access {
  if (!signedIn) return "login";
  if (!role) return "no-access";
  return allowed.length === 0 || allowed.includes(role) ? "ok" : "forbidden";
}
