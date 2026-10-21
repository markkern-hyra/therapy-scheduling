import type { ReactNode } from "react";

// Повідомлення про помилку над формою чи таблицею.
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-danger px-4 py-2 text-sm text-danger">
      {children}
    </p>
  );
}
