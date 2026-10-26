import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

// Повідомлення про помилку над формою чи списком: м'яке тло destructive-soft, іконка й текст AC дослівно.
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md bg-destructive-soft px-4 py-3 text-sm text-destructive">
      <AlertIcon />
      <span>{children}</span>
    </p>
  );
}
