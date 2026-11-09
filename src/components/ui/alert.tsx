import type { ReactNode } from "react";
import { AlertIcon, SavedIcon } from "./icons";

const VARIANTS = {
  // Помилка над формою чи списком: м'яке тло destructive-soft, текст AC дослівно; role="alert" — озвучується одразу.
  error: { role: "alert", className: "bg-destructive-soft text-destructive", Icon: AlertIcon },
  // Дію виконано (напр. «Insurance status saved.», AC-INS-02): тло primary-soft, текст card-foreground (DESIGN.md, розділ
  // 2 — контраст 14.0 / 11.6); role="status" — ввічливе повідомлення, не тривога.
  success: { role: "status", className: "bg-primary-soft text-card-foreground", Icon: SavedIcon },
} as const;

export function Alert({ variant = "error", children }: { variant?: keyof typeof VARIANTS; children: ReactNode }) {
  const { role, className, Icon } = VARIANTS[variant];
  return (
    <p role={role} className={`flex items-start gap-2 rounded-md px-4 py-3 text-sm ${className}`}>
      <Icon />
      <span>{children}</span>
    </p>
  );
}
