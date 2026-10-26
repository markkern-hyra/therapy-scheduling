import type { ReactNode } from "react";

// Порожній стан замість списку: іконка в м'якому колі й текст AC дослівно.
export function EmptyState({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-card px-6 py-6 text-center shadow-card">
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</span>
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
